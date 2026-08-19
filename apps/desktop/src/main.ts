import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { CombatSession } from "@swtor/analytics";
import { fetchApiHealth, fetchApiReports, reportDetectedCharacter, reportLiveSnapshot, reportProgressionPull } from "./core/api.js";
import { IngestClient, type ConnectionState } from "./core/ingestClient.js";
import { newestLogFile } from "./core/logDirectory.js";
import { ReplaySource } from "./core/replay.js";
import {
  loadSettings,
  redactSettings,
  saveSettings,
  settingsPath,
  type DesktopSettings,
} from "./core/settings.js";
import { LogStreamer, readInitialLogIdentity } from "./core/streamer.js";
import { startDesktopAuthListener } from "./core/discordAuth.js";
import { buildAutoUpdateFeed } from "./core/updater.js";

const CLIENT_VERSION = "0.1.7";
const distDir = __dirname;

interface AppStatus {
  mode: "idle" | "live" | "replay";
  connection: ConnectionState;
  detail: string | null;
  sessionId: string | null;
  reportCode: string | null;
  fileName: string | null;
  zone: string | null;
  detectedCharacter: string | null;
  activeBoss: string | null;
  lastPullOutcome: string | null;
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
let replayCombatSession: CombatSession | null = null;

const status: AppStatus = {
  mode: "idle",
  connection: "idle",
  detail: null,
  sessionId: null,
  reportCode: null,
  fileName: null,
  zone: null,
  detectedCharacter: null,
  activeBoss: null,
  lastPullOutcome: null,
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
  replayCombatSession?.end();
  replayCombatSession = null;
  client?.disconnect();
  client = null;
}

async function startLive(): Promise<{ ok: boolean; error?: string }> {
  if (settings.token.length === 0) return { ok: false, error: "Please click 'Sign in with Discord' first to link your account to Merlin." };
  teardown();

  const newest = await newestLogFile(settings.logDirectory);

  streamer = new LogStreamer({
    directory: settings.logDirectory,
    client: null,
    onStatus: (s) =>
      publish({
        fileName: s.fileName,
        zone: s.zone,
        eventsParsed: s.eventsParsed,
        eventsPerSecond: s.eventsPerSecond,
        unknownLines: s.unknownLines,
        detectedCharacter: s.detectedCharacter,
        activeBoss: s.activeBoss,
        lastPullOutcome: s.lastPullOutcome,
      }),
    onSnapshot: (snapshot, inCombat) => {
      void reportLiveSnapshot(settings.serverUrl, settings.token, snapshot, inCombat);
    },
    onCharacterDetected: async (character) => {
      try {
        publish({ detectedCharacter: character.characterName, detail: `Syncing character "${character.characterName}" to Merlin...` });
        await reportDetectedCharacter(settings.serverUrl, settings.token, character);
        publish({ detail: `Character "${character.characterName}" synced to Merlin.` });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        publish({ detail: `Character sync to Merlin failed: ${message}` });
        console.warn("Character reporting to Merlin API encountered:", err);
      }
    },
    onPullCompleted: async (pull, characterName, serverId) => {
      try {
        const bossName = pull.encounter?.encounterName ?? pull.boss?.name ?? "Boss Encounter";
        publish({ detail: `Syncing ${bossName} (${pull.outcome}) to Merlin...` });
        await reportProgressionPull(settings.serverUrl, settings.token, pull, characterName, serverId);
        publish({ detail: `Synced ${bossName} (${pull.outcome}) to Merlin.` });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        publish({ detail: `Pull sync to Merlin failed: ${message}` });
        console.warn("Pull reporting to Merlin API encountered:", err);
      }
    },
  });
  streamer.start();

  publish({ mode: "live", connection: "connected", replayProgress: null, detail: "Streaming combat logs..." });
  return { ok: true };
}

async function startReplay(
  filePath: string,
  speed: number,
): Promise<{ ok: boolean; error?: string }> {
  if (settings.token.length === 0) {
    return { ok: false, error: "Please click 'Sign in with Discord' first to link your account to Merlin." };
  }
  teardown();

  let detectedCharacterName: string | null = null;
  let serverId: string | null = null;
  let discipline: string | null = null;
  let zone: string | null = null;
  let localPlayerId: string | null = null;
  let activeBoss: string | null = null;
  let lastPullOutcome: string | null = null;
  let unknownLines = 0;
  let eventsParsed = 0;
  let lastSnapshotSentAt = 0;
  const recentTimestamps: number[] = [];

  const trackRate = (count: number) => {
    const now = Date.now();
    for (let i = 0; i < count; i += 1) recentTimestamps.push(now);
    const cutoff = now - 5_000;
    while (recentTimestamps.length > 0 && recentTimestamps[0]! < cutoff) {
      recentTimestamps.shift();
    }
  };

  const getRate = () => Math.round(recentTimestamps.length / 5);

  // Read initial identity from header
  const initialIdentity = await readInitialLogIdentity(filePath);
  if (initialIdentity) {
    localPlayerId = initialIdentity.playerId;
    detectedCharacterName = initialIdentity.characterName;
    serverId = initialIdentity.serverId ?? null;
    discipline = initialIdentity.discipline ?? null;
    zone = initialIdentity.zone ?? null;

    publish({
      detectedCharacter: detectedCharacterName,
      zone,
      detail: `Syncing character "${detectedCharacterName}" to Merlin...`,
    });

    try {
      await reportDetectedCharacter(settings.serverUrl, settings.token, {
        characterName: detectedCharacterName,
        serverId,
        discipline,
        occurredAt: new Date().toISOString(),
      });
      publish({ detail: `Character "${detectedCharacterName}" synced to Merlin.` });
    } catch (err) {
      console.warn("Character sync to Merlin failed during replay:", err);
    }
  }

  const combat = new CombatSession({
    onPullStart: (live) => {
      activeBoss = live.encounter?.encounterName ?? live.boss?.name ?? "Boss Pull";
      publish({
        activeBoss,
        detail: `[Replay ${speed}x] In combat: ${activeBoss}`,
      });
      void reportLiveSnapshot(settings.serverUrl, settings.token, live, true);
    },
    onPullEnd: async (pull) => {
      activeBoss = null;
      const hasCombatData =
        pull.boss !== null ||
        pull.encounter !== null ||
        (pull.actors && pull.actors.some((a) => a.damage > 0 || a.healing > 0));

      if (hasCombatData) {
        const bossName = pull.encounter?.encounterName ?? pull.boss?.name ?? "Boss Encounter";
        lastPullOutcome = `${bossName} (${pull.outcome === "kill" ? "Kill" : "Wipe"})`;
        publish({
          activeBoss: null,
          lastPullOutcome,
          detail: `Syncing ${bossName} (${pull.outcome}) to Merlin...`,
        });
        try {
          await reportProgressionPull(
            settings.serverUrl,
            settings.token,
            pull,
            detectedCharacterName ?? "Unknown Character",
            serverId,
          );
          publish({ detail: `Synced ${bossName} (${pull.outcome}) to Merlin.` });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          publish({ detail: `Pull sync to Merlin failed: ${message}` });
          console.warn("Pull reporting to Merlin API encountered:", err);
        }
      } else {
        publish({ activeBoss: null });
      }
      void reportLiveSnapshot(settings.serverUrl, settings.token, null, false);
    },
  });
  replayCombatSession = combat;

  replay = new ReplaySource({
    filePath,
    speed: speed > 0 ? speed : 4,
    tickMs: 50,
    onEvents: (events) => {
      for (const event of events) {
        if (event.type === "unknown") unknownLines += 1;

        if (event.type === "areaEntered") {
          if (localPlayerId === null || (event.source?.kind === "player" && event.source.playerId === localPlayerId)) {
            zone = event.zone.name;
            if (event.serverId) serverId = event.serverId;
            if (event.source?.kind === "player") {
              localPlayerId = event.source.playerId;
              detectedCharacterName = event.source.name.trim();
            }
          }
        }

        if (event.type === "disciplineChanged") {
          if (event.source?.kind === "player" && (localPlayerId === null || event.source.playerId === localPlayerId)) {
            localPlayerId = event.source.playerId;
            detectedCharacterName = event.source.name.trim();
            discipline = event.discipline.name;
          }
        }

        if (localPlayerId === null && event.source?.kind === "player" && (event.type === "areaEntered" || event.type === "disciplineChanged")) {
          localPlayerId = event.source.playerId;
          detectedCharacterName = event.source.name.trim();
        }

        combat.push(event);
      }

      eventsParsed += events.length;
      trackRate(events.length);

      publish({
        mode: "replay",
        connection: "connected",
        fileName: replay?.fileName ?? filePath,
        zone,
        detectedCharacter: detectedCharacterName,
        eventsParsed,
        eventsPerSecond: getRate(),
        unknownLines,
      });

      if (events.length > 0 && Date.now() - lastSnapshotSentAt >= 500) {
        lastSnapshotSentAt = Date.now();
        const lastTimestamp = events[events.length - 1]!.timestamp;
        const live = combat.current(lastTimestamp);
        if (live) {
          void reportLiveSnapshot(settings.serverUrl, settings.token, live, true);
        }
      }
    },
    onProgress: (progress) => {
      const pct = Math.min(100, Math.round((progress.emitted / progress.total) * 100));
      publish({ replayProgress: pct });
    },
    onDone: async () => {
      combat.end();
      await reportLiveSnapshot(settings.serverUrl, settings.token, null, false);
      publish({
        mode: "idle",
        connection: "idle",
        activeBoss: null,
        replayProgress: 100,
        detail: `Replay completed (${eventsParsed.toLocaleString()} events).`,
      });
    },
  });

  let total = 0;
  try {
    total = await replay.load();
  } catch (loadErr) {
    const msg = loadErr instanceof Error ? loadErr.message : String(loadErr);
    return { ok: false, error: `Failed to load log file: ${msg}` };
  }

  if (total === 0) return { ok: false, error: "No combat events found in that log file." };

  if (total === 0) return { ok: false, error: "No combat events found in that log file." };

  replay.start();

  publish({
    mode: "replay",
    connection: "connected",
    fileName: replay.fileName,
    zone,
    detectedCharacter: detectedCharacterName,
    activeBoss: null,
    lastPullOutcome: null,
    eventsParsed: 0,
    replayProgress: 0,
    detail: `Replaying ${replay.fileName} at ${speed}x speed...`,
  });

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
