import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { fetchApiHealth, fetchApiReports, reportDetectedCharacter, reportLiveSnapshot, reportProgressionPull, reportTrashEncounter } from "./core/api.js";
import {
  loadSettings,
  redactSettings,
  saveSettings,
  settingsPath,
  type DesktopSettings,
} from "./core/settings.js";
import { LogStreamer } from "./core/streamer.js";
import { startDesktopAuthListener } from "./core/discordAuth.js";
import { buildAutoUpdateFeed } from "./core/updater.js";

const CLIENT_VERSION = "0.2.8";
const distDir = __dirname;

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "error";

interface AppStatus {
  revision: number;
  mode: "idle" | "live" | "replay";
  connection: ConnectionState;
  detail: string | null;
  sessionId: string | null;
  reportCode: string | null;
  fileName: string | null;
  zone: string | null;
  detectedCharacter: string | null;
  discipline: string | null;
  combatStyle: string | null;
  activeBoss: string | null;
  lastPullOutcome: string | null;
  eventsParsed: number;
  totalEvents: number | null;
  eventsPerSecond: number;
  unknownLines: number;
  queuedEvents: number;
  droppedEvents: number;
  replayProgress: number | null;
  liveDps: number;
  liveHps: number;
  liveDtps: number;
  liveCriticalHits: number;
  liveMitigatedDamage: number;
  liveAbsorbed: number;
  liveOverkill: number;
  liveThreat: number;
  totalDamage: number;
  totalHealing: number;
  totalDamageTaken: number;
  personalDeaths: number;
  raidDeaths: number;
  pullsCount: number;
  bossKills: number;
  bossWipes: number;
  logs: string[];
}

let window: BrowserWindow | null = null;
let settings: DesktopSettings;
let streamer: LogStreamer | null = null;

const status: AppStatus = {
  revision: 0,
  mode: "idle",
  connection: "idle",
  detail: null,
  sessionId: null,
  reportCode: null,
  fileName: null,
  zone: null,
  detectedCharacter: null,
  discipline: null,
  combatStyle: null,
  activeBoss: null,
  lastPullOutcome: null,
  eventsParsed: 0,
  totalEvents: null,
  eventsPerSecond: 0,
  unknownLines: 0,
  queuedEvents: 0,
  droppedEvents: 0,
  replayProgress: null,
  liveDps: 0,
  liveHps: 0,
  liveDtps: 0,
  liveCriticalHits: 0,
  liveMitigatedDamage: 0,
  liveAbsorbed: 0,
  liveOverkill: 0,
  liveThreat: 0,
  totalDamage: 0,
  totalHealing: 0,
  totalDamageTaken: 0,
  personalDeaths: 0,
  raidDeaths: 0,
  pullsCount: 0,
  bossKills: 0,
  bossWipes: 0,
  logs: [`[${new Date().toLocaleTimeString()}] SWTOR Combat Streamer initialized.`],
};

function publish(patch: Partial<AppStatus> = {}): void {
  Object.assign(status, patch);
  status.revision += 1;
  status.detail = status.detail ?? `Status update ${status.revision}`;
  const snapshot = { ...status, logs: [...status.logs] };
  window?.webContents.send("status", snapshot);
}

function appendLog(message: string): void {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${message}`;
  const logs = [...status.logs, line].slice(-100);
  publish({ logs });
}

function getStreamer(): LogStreamer {
  if (streamer !== null) return streamer;
  streamer = new LogStreamer({
    directory: settings.logDirectory,
    onStatus: (s) =>
      publish({
        fileName: s.fileName,
        zone: s.zone,
        eventsParsed: s.eventsParsed,
        totalEvents: s.totalEvents,
        eventsPerSecond: s.eventsPerSecond,
        unknownLines: s.unknownLines,
        detectedCharacter: s.detectedCharacter,
        discipline: s.discipline,
        combatStyle: s.combatStyle,
        activeBoss: s.activeBoss,
        lastPullOutcome: s.lastPullOutcome,
        liveDps: s.liveDps,
        liveHps: s.liveHps,
        liveDtps: s.liveDtps,
        liveCriticalHits: s.liveCriticalHits,
        liveMitigatedDamage: s.liveMitigatedDamage,
        liveAbsorbed: s.liveAbsorbed,
        liveOverkill: s.liveOverkill,
        liveThreat: s.liveThreat,
        totalDamage: s.totalDamage,
        totalHealing: s.totalHealing,
        totalDamageTaken: s.totalDamageTaken,
        personalDeaths: s.personalDeaths,
        raidDeaths: s.raidDeaths,
        pullsCount: s.pullsCount,
        bossKills: s.bossKills,
        bossWipes: s.bossWipes,
        replayProgress: status.mode === "replay" && s.totalEvents && s.totalEvents > 0 ? Math.min(100, Math.round((s.eventsParsed / s.totalEvents) * 100)) : status.replayProgress,
        detail: `Telemetry: ${s.eventsParsed.toLocaleString()} events parsed${s.totalEvents ? ` / ${s.totalEvents.toLocaleString()}` : ""}`,
      }),
    onLog: (msg) => appendLog(msg),
    onSnapshot: (snapshot, inCombat) => {
      void reportLiveSnapshot(settings.serverUrl, settings.token, snapshot, inCombat);
    },
    onCharacterDetected: async (character) => {
      try {
        publish({ detectedCharacter: character.characterName, detail: `Syncing character "${character.characterName}" to Merlin...` });
        await reportDetectedCharacter(settings.serverUrl, settings.token, character);
        publish({ detail: `Character "${character.characterName}" synced to Merlin.` });
        appendLog(`Character "${character.characterName}" synced to Merlin API.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        publish({ detail: `Character sync to Merlin failed: ${message}` });
        appendLog(`Character sync failed: ${message}`);
        console.warn("Character reporting to Merlin API encountered:", err);
      }
    },
    onPullCompleted: async (fight, characterName, serverId, logFileName) => {
      try {
        const bossName = fight.encounter.encounterName;
        publish({ detail: `Syncing ${bossName} (${fight.outcome}) to Merlin...` });
        await reportProgressionPull(settings.serverUrl, settings.token, fight, characterName, serverId, undefined, logFileName);
        publish({ detail: `Synced ${bossName} (${fight.outcome}) to Merlin.` });
        appendLog(`Synced ${bossName} (${fight.outcome}) with ${fight.players.length} players to Merlin.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        publish({ detail: `Pull sync to Merlin failed: ${message}` });
        appendLog(`Pull sync failed: ${message}`);
        console.warn("Pull reporting to Merlin API encountered:", err);
      }
    },
    onTrashCompleted: async (fight, characterName, serverId, logFileName) => {
      try {
        await reportTrashEncounter(settings.serverUrl, settings.token, fight, characterName, serverId, undefined, logFileName);
      } catch (err) {
        appendLog(`Trash telemetry sync failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });
  return streamer;
}

function teardown(): void {
  streamer?.stop();
  streamer = null;
}

async function startLive(): Promise<{ ok: boolean; error?: string }> {
  if (settings.token.length === 0) return { ok: false, error: "Please click 'Sign in with Discord' first to link your account to Merlin." };
  teardown();

  const active = getStreamer();
  active.startLive();
  appendLog("Live log streamer active.");

  publish({ mode: "live", connection: "connected", replayProgress: null, detail: "Streaming combat logs live..." });
  return { ok: true };
}

async function startReplay(
  filePath: string,
  speed: number,
): Promise<{ ok: boolean; error?: string }> {
  if (settings.token.length === 0) {
    appendLog("Cannot start replay: Discord account is not linked.");
    return { ok: false, error: "Please click 'Sign in with Discord' first to link your account to Merlin." };
  }
  teardown();

  const active = getStreamer();
  appendLog(`Starting replay of "${filePath}" at ${speed}x speed...`);
  publish({ mode: "replay", connection: "connected", replayProgress: 0, detail: `Starting replay at ${speed}x...` });

  try {
    const result = await active.startReplay(
      filePath,
      speed,
      (progress) => {
        publish({ mode: "replay", connection: "connected", replayProgress: progress.percent });
      },
      () => {
        appendLog("Replay simulation completed.");
        publish({ mode: "idle", connection: "idle", activeBoss: null, replayProgress: 100, detail: "Replay simulation complete." });
      },
    );
    if (!result.ok) {
      appendLog(`Replay failed: ${result.error ?? "Unknown error"}`);
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appendLog(`Replay error: ${message}`);
    publish({ mode: "idle", connection: "error", detail: `Replay failed: ${message}` });
    return { ok: false, error: message };
  }
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
  ipcMain.handle("status:get", () => ({ ...status, logs: [...status.logs] }));

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
  ipcMain.handle("auth:signout", async () => {
    settings = { ...settings, token: "" };
    await saveSettings(settingsPath(app.getPath("userData")), settings);
    teardown();
    publish({ mode: "idle", connection: "idle", replayProgress: null });
    return { ok: true };
  });
  ipcMain.handle("auth:discord", async () => {
    try {
      const listener = await startDesktopAuthListener();
      const baseUrl = (settings.serverUrl || "http://localhost:3000").replace(/\/$/, "");
      const authUrl = new URL(`${baseUrl}/auth/discord`);
      authUrl.searchParams.set("desktop", "1");
      authUrl.searchParams.set("redirectUri", listener.redirectUri);

      await shell.openExternal(authUrl.toString());

      const result = await listener.waitForCallback();
      settings = { ...settings, token: result.token };
      await saveSettings(settingsPath(app.getPath("userData")), settings);
      teardown();
      return { ok: true, discordId: result.discordId };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Discord sign-in failed",
      };
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
