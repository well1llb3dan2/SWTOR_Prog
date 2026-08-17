import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { fetchApiHealth, fetchApiReports } from "./core/api.js";
import { IngestClient, type ConnectionState } from "./core/ingestClient.js";
import { redeemLinkCode } from "./core/link.js";
import { newestLogFile } from "./core/logDirectory.js";
import { ReplaySource } from "./core/replay.js";
import {
  loadSettings,
  redactSettings,
  saveSettings,
  settingsPath,
  type DesktopSettings,
} from "./core/settings.js";
import { LogStreamer } from "./core/streamer.js";
import { buildAutoUpdateFeed } from "./core/updater.js";

const CLIENT_VERSION = "0.1.0";
const distDir = __dirname;

interface AppStatus {
  mode: "idle" | "live" | "replay";
  connection: ConnectionState;
  detail: string | null;
  sessionId: string | null;
  reportCode: string | null;
  fileName: string | null;
  zone: string | null;
  eventsParsed: number;
  eventsPerSecond: number;
  unknownLines: number;
  queuedEvents: number;
  droppedEvents: number;
  replayProgress: number | null;
}

let window: BrowserWindow | null = null;
let settings: DesktopSettings;
let client: IngestClient | null = null;
let streamer: LogStreamer | null = null;
let replay: ReplaySource | null = null;

const status: AppStatus = {
  mode: "idle",
  connection: "idle",
  detail: null,
  sessionId: null,
  reportCode: null,
  fileName: null,
  zone: null,
  eventsParsed: 0,
  eventsPerSecond: 0,
  unknownLines: 0,
  queuedEvents: 0,
  droppedEvents: 0,
  replayProgress: null,
};

function publish(patch: Partial<AppStatus> = {}): void {
  Object.assign(status, patch);
  if (client !== null) {
    status.queuedEvents = client.queuedEvents;
    status.droppedEvents = client.droppedEvents;
    status.sessionId = client.sessionId;
  }
  window?.webContents.send("status", status);
}

function ensureClient(): IngestClient {
  if (client !== null) return client;
  client = new IngestClient({
    serverUrl: settings.serverUrl,
    token: settings.token,
    clientVersion: CLIENT_VERSION,
    onState: (connection, detail) => publish({ connection, detail: detail ?? null }),
    onReport: (reportCode) => publish({ reportCode }),
  });
  return client;
}

function teardown(): void {
  streamer?.stop();
  streamer = null;
  replay?.stop();
  replay = null;
  client?.disconnect();
  client = null;
}

async function startLive(): Promise<{ ok: boolean; error?: string }> {
  if (settings.token.length === 0) return { ok: false, error: "Set an ingest token first" };
  teardown();

  const newest = await newestLogFile(settings.logDirectory);
  const active = ensureClient();
  active.connect(newest?.name ?? "pending", newest?.modifiedAt ?? Date.now());

  streamer = new LogStreamer({
    directory: settings.logDirectory,
    client: active,
    onStatus: (s) =>
      publish({
        fileName: s.fileName,
        zone: s.zone,
        eventsParsed: s.eventsParsed,
        eventsPerSecond: s.eventsPerSecond,
        unknownLines: s.unknownLines,
      }),
  });
  streamer.start();

  publish({ mode: "live", replayProgress: null });
  return { ok: true };
}

async function startReplay(
  filePath: string,
  speed: number,
): Promise<{ ok: boolean; error?: string }> {
  if (settings.token.length === 0) return { ok: false, error: "Set an ingest token first" };
  teardown();

  const active = ensureClient();
  replay = new ReplaySource({
    filePath,
    speed,
    onEvents: (events) => {
      active.send(events);
      publish({ eventsParsed: status.eventsParsed + events.length });
    },
    onProgress: (progress) =>
      publish({ replayProgress: Math.round((progress.emitted / progress.total) * 100) }),
    onDone: () => publish({ mode: "idle", replayProgress: 100 }),
  });

  const total = await replay.load();
  if (total === 0) return { ok: false, error: "No events found in that log" };

  active.connect(replay.fileName, replay.startedAt);
  replay.start();

  publish({ mode: "replay", fileName: replay.fileName, eventsParsed: 0, replayProgress: 0 });
  return { ok: true };
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 720,
    height: 600,
    title: "SWTOR Combat Streamer",
    backgroundColor: "#0b1410",
    webPreferences: {
      preload: join(distDir, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // External links open in the user's browser, never inside the app shell.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void window.loadFile(join(distDir, "renderer", "index.html"));
  window.on("closed", () => (window = null));
}

app.whenReady().then(async () => {
  settings = await loadSettings(settingsPath(app.getPath("userData")));
  autoUpdater.setFeedURL(buildAutoUpdateFeed({ owner: "well1llb3dan2", repo: "SWTOR_Prog" }));
  autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  createWindow();

  ipcMain.handle("settings:get", () => redactSettings(settings));

  ipcMain.handle("settings:save", async (_event, incoming: Partial<DesktopSettings>) => {
    settings = {
      ...settings,
      ...incoming,
      // An empty token means "unchanged", so a blank field cannot wipe it.
      token:
        incoming.token !== undefined && incoming.token.length > 0 ? incoming.token : settings.token,
    };
    await saveSettings(settingsPath(app.getPath("userData")), settings);
    return redactSettings(settings);
  });

  ipcMain.handle("dialog:log-directory", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("dialog:replay-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Combat logs", extensions: ["txt"] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("api:health", async () => {
    try {
      return { ok: true, data: await fetchApiHealth(settings.serverUrl) };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : "Health check failed" };
    }
  });

  ipcMain.handle("api:reports", async (_event, limit: number) => {
    try {
      return { ok: true, data: await fetchApiReports(settings.serverUrl, limit) };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : "Reports lookup failed" };
    }
  });

  ipcMain.handle("stream:start-live", () => startLive());
  ipcMain.handle("stream:start-replay", (_event, filePath: string, speed: number) =>
    startReplay(filePath, speed),
  );
  ipcMain.handle("link:redeem", async (_event, code: string) => {
    try {
      const linked = await redeemLinkCode(settings.serverUrl, code);
      settings = { ...settings, token: linked.token };
      await saveSettings(settingsPath(app.getPath("userData")), settings);
      teardown();
      return { ok: true, username: linked.username };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : "Link failed" };
    }
  });

  ipcMain.handle("stream:stop", () => {
    teardown();
    publish({ mode: "idle", connection: "idle", replayProgress: null });
    return { ok: true };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  teardown();
  if (process.platform !== "darwin") app.quit();
});
