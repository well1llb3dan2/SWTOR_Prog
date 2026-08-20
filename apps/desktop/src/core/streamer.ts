import { open } from "node:fs/promises";
import { LogParser, parseLine, parseLogFileName } from "@swtor/parser";
import { CombatSession, type LivePullState, type PullSummary, type BossFightSummary } from "@swtor/analytics";
import type { CombatEvent } from "@swtor/shared";
import { LogTailer, type TailerOptions } from "./tailer.js";
import type { LogFileInfo } from "./logDirectory.js";
import type { DetectedCharacterInput } from "./api.js";
import { decodeLogText } from "./encoding.js";
import { ReplaySource } from "./replay.js";

export interface LogFileInitialIdentity {
  characterName: string;
  playerId: string;
  serverId?: string | null;
  discipline?: string | null;
  zone?: string | null;
}

export async function readInitialLogIdentity(filePath: string): Promise<LogFileInitialIdentity | null> {
  try {
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(65536);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead === 0) return null;
      const text = decodeLogText(buffer.subarray(0, bytesRead));
      const lines = text.split(/\r?\n/);

      let characterName: string | null = null;
      let playerId: string | null = null;
      let serverId: string | null = null;
      let discipline: string | null = null;
      let zone: string | null = null;

      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = parseLine(line, { timestamp: 0, lineNumber: 1 });
        if (!parsed) continue;
        if (parsed.type === "areaEntered" && parsed.source?.kind === "player") {
          characterName = parsed.source.name.trim();
          playerId = parsed.source.playerId;
          serverId = parsed.serverId ?? null;
          zone = parsed.zone.name;
        } else if (parsed.type === "disciplineChanged" && parsed.source?.kind === "player") {
          if (playerId === null || parsed.source.playerId === playerId) {
            characterName = parsed.source.name.trim();
            playerId = parsed.source.playerId;
            discipline = parsed.discipline.name;
          }
        }
        if (characterName && discipline) break;
      }

      if (characterName && playerId) {
        return { characterName, playerId, serverId, discipline, zone };
      }
      return null;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

export interface StreamerStatus {
  fileName: string | null;
  eventsParsed: number;
  totalEvents?: number | null;
  eventsPerSecond: number;
  unknownLines: number;
  zone: string | null;
  detectedCharacter?: string | null;
  discipline?: string | null;
  combatStyle?: string | null;
  activeBoss?: string | null;
  lastPullOutcome?: string | null;
  liveDps: number;
  liveHps: number;
  liveDtps: number;
  totalDamage: number;
  totalHealing: number;
  totalDamageTaken: number;
  personalDeaths: number;
  raidDeaths: number;
  pullsCount: number;
  bossKills: number;
  bossWipes: number;
}

export interface LogStreamerOptions {
  directory?: string;
  onStatus?: (status: StreamerStatus) => void;
  onLog?: (message: string, level?: "info" | "warn" | "error") => void;
  onSnapshot?: (snapshot: LivePullState | null, inCombat: boolean) => void;
  onCharacterDetected?: (character: DetectedCharacterInput) => void;
  onPullCompleted?: (fight: BossFightSummary, characterName: string, serverId: string | null) => void;
  tailer?: Pick<TailerOptions, "pollIntervalMs" | "startAtEnd">;
}

/** Wires the tailer, parser, analytics, and Merlin progression uplink into one pipeline. */
export class LogStreamer {
  readonly #options: LogStreamerOptions;
  readonly #tailer: LogTailer | null;
  readonly #onStatus: ((status: StreamerStatus) => void) | undefined;
  readonly #onLog: ((message: string, level?: "info" | "warn" | "error") => void) | undefined;
  readonly #onSnapshot: ((snapshot: LivePullState | null, inCombat: boolean) => void) | undefined;
  readonly #onCharacterDetected: ((character: DetectedCharacterInput) => void) | undefined;
  readonly #onPullCompleted: ((fight: BossFightSummary, characterName: string, serverId: string | null) => void) | undefined;

  #parser: LogParser | null = null;
  #combat: CombatSession | null = null;
  #replay: ReplaySource | null = null;
  #fileName: string | null = null;
  #eventsParsed = 0;
  #totalEvents: number | null = null;
  #unknownLines = 0;
  #zone: string | null = null;
  #serverId: string | null = null;
  #discipline: string | null = null;
  #combatStyle: string | null = null;
  #localPlayerId: string | null = null;
  #detectedCharacterName: string | null = null;
  #characterReported = false;
  #activeBoss: string | null = null;
  #lastPullOutcome: string | null = null;
  #recentTimestamps: number[] = [];
  #lastSnapshotSentAt = 0;

  #liveDps = 0;
  #liveHps = 0;
  #liveDtps = 0;
  #totalDamage = 0;
  #totalHealing = 0;
  #totalDamageTaken = 0;
  #personalDeaths = 0;
  #raidDeaths = 0;
  #pullsCount = 0;
  #bossKills = 0;
  #bossWipes = 0;

  constructor(options: LogStreamerOptions) {
    this.#options = options;
    this.#onStatus = options.onStatus;
    this.#onLog = options.onLog;
    this.#onSnapshot = options.onSnapshot;
    this.#onCharacterDetected = options.onCharacterDetected;
    this.#onPullCompleted = options.onPullCompleted;

    this.#tailer = options.directory
      ? new LogTailer(options.directory, {
          ...options.tailer,
          onFileChange: (file) => this.#onFileChange(file),
          onLines: (lines) => this.#onLines(lines),
        })
      : null;
  }

  get status(): StreamerStatus {
    return {
      fileName: this.#fileName,
      eventsParsed: this.#eventsParsed,
      totalEvents: this.#totalEvents,
      eventsPerSecond: this.#rate(),
      unknownLines: this.#unknownLines,
      zone: this.#zone,
      detectedCharacter: this.#detectedCharacterName,
      discipline: this.#discipline,
      combatStyle: this.#combatStyle,
      activeBoss: this.#activeBoss,
      lastPullOutcome: this.#lastPullOutcome,
      liveDps: this.#liveDps,
      liveHps: this.#liveHps,
      liveDtps: this.#liveDtps,
      totalDamage: this.#totalDamage,
      totalHealing: this.#totalHealing,
      totalDamageTaken: this.#totalDamageTaken,
      personalDeaths: this.#personalDeaths,
      raidDeaths: this.#raidDeaths,
      pullsCount: this.#pullsCount,
      bossKills: this.#bossKills,
      bossWipes: this.#bossWipes,
    };
  }

  start(): void {
    this.startLive();
  }

  startLive(): void {
    this.stop();
    this.#onLog?.("Started live log tailer on directory: " + (this.#options.directory ?? "default"));
    this.#tailer?.start();
  }

  async startReplay(
    filePath: string,
    speed: number,
    onProgress?: (progress: { emitted: number; total: number; percent: number }) => void,
    onDone?: () => void,
  ): Promise<{ ok: boolean; totalEvents?: number; error?: string }> {
    this.stop();

    this.#resetSession(filePath);
    this.#onLog?.(`Opening combat log for replay: ${filePath}`);

    // Read initial identity
    const initialIdentity = await readInitialLogIdentity(filePath);
    if (initialIdentity) {
      this.#localPlayerId = initialIdentity.playerId;
      this.#detectedCharacterName = initialIdentity.characterName;
      this.#serverId = initialIdentity.serverId ?? null;
      this.#discipline = initialIdentity.discipline ?? null;
      this.#zone = initialIdentity.zone ?? null;
      this.#characterReported = true;
      this.#onLog?.(`Header identified local player: "${initialIdentity.characterName}" (${initialIdentity.zone ?? "Unknown Zone"})`);
      this.#onCharacterDetected?.({
        characterName: initialIdentity.characterName,
        serverId: this.#serverId,
        discipline: this.#discipline,
        occurredAt: new Date().toISOString(),
      });
    }

    this.#initCombatSession();

    this.#replay = new ReplaySource({
      filePath,
      speed: speed > 0 ? speed : 4,
      tickMs: 50,
      onEvents: (events) => {
        this.#processEvents(events);
      },
      onProgress: (p) => {
        const percent = Math.min(100, Math.round((p.emitted / p.total) * 100));
        onProgress?.({ emitted: p.emitted, total: p.total, percent });
      },
      onDone: () => {
        this.#combat?.end();
        this.#onSnapshot?.(null, false);
        this.#activeBoss = null;
        this.#onLog?.(`Replay simulation completed (${this.#eventsParsed.toLocaleString()} total events processed).`);
        this.#onStatus?.(this.status);
        onDone?.();
      },
    });

    try {
      this.#onLog?.("Parsing log events into timeline buffer...");
      const totalEvents = await this.#replay.load();
      if (totalEvents === 0) {
        this.#onLog?.("No combat events found in log file.", "warn");
        return { ok: false, error: "No combat events found in that log file." };
      }
      this.#totalEvents = totalEvents;
      this.#fileName = this.#replay.fileName;
      this.#onLog?.(`Loaded ${totalEvents.toLocaleString()} events. Starting playback engine at ${speed}x speed...`);
      this.#replay.start();
      this.#onStatus?.(this.status);
      return { ok: true, totalEvents };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#onLog?.(`Failed to load replay log: ${message}`, "error");
      return { ok: false, error: `Failed to load log file: ${message}` };
    }
  }

  stop(): void {
    this.#tailer?.stop();
    this.#replay?.stop();
    this.#replay = null;
    this.#combat?.end();
    this.#combat = null;
    this.#onSnapshot?.(null, false);
  }

  #resetSession(fileName: string | null) {
    this.#fileName = fileName;
    this.#zone = null;
    this.#serverId = null;
    this.#discipline = null;
    this.#combatStyle = null;
    this.#localPlayerId = null;
    this.#detectedCharacterName = null;
    this.#characterReported = false;
    this.#activeBoss = null;
    this.#lastPullOutcome = null;
    this.#eventsParsed = 0;
    this.#totalEvents = null;
    this.#unknownLines = 0;
    this.#recentTimestamps = [];
    this.#liveDps = 0;
    this.#liveHps = 0;
    this.#liveDtps = 0;
    this.#totalDamage = 0;
    this.#totalHealing = 0;
    this.#totalDamageTaken = 0;
    this.#personalDeaths = 0;
    this.#raidDeaths = 0;
    this.#pullsCount = 0;
    this.#bossKills = 0;
    this.#bossWipes = 0;
  }

  #initCombatSession() {
    this.#combat?.end();
    this.#combat = new CombatSession({
      onPullStart: (live) => {
        const isBoss = live.encounter !== null || live.boss?.isLikelyBoss === true;
        this.#activeBoss = live.encounter?.encounterName ?? live.boss?.name ?? "Combat Pull";
        if (isBoss) {
          this.#onLog?.(`Combat engaged: ${this.#activeBoss} (${live.difficulty ?? "Story"})`);
        } else {
          this.#onLog?.(`Combat engaged: ${this.#activeBoss}`);
        }
        this.#onStatus?.(this.status);
        this.#onSnapshot?.(live, true);
      },
      onPullEnd: (pull) => {
        this.#activeBoss = null;
        this.#pullsCount += 1;
        this.#raidDeaths += pull.deaths.length;
        const localDied = pull.deaths.some((d) => d.name === this.#detectedCharacterName);
        if (localDied) this.#personalDeaths += 1;

        const isBoss = pull.encounter !== null || pull.boss?.isLikelyBoss === true;
        if (isBoss) {
          if (pull.outcome === "kill") this.#bossKills += 1;
          else if (pull.outcome === "wipe") this.#bossWipes += 1;
        }

        const hasCombatData = pull.actors.some((a) => a.damage > 0 || a.healing > 0 || a.damageTaken > 0);

        if (hasCombatData) {
          const bossName = pull.encounter?.encounterName ?? pull.boss?.name ?? "Combat Pull";
          const durationSec = Math.round(pull.durationMs / 1000);
          this.#lastPullOutcome = `${bossName} (${pull.outcome})`;
          if (isBoss) {
            this.#onLog?.(`👑 Boss Encounter: ${bossName} (${pull.outcome.toUpperCase()}) in ${durationSec}s [Raid Deaths: ${pull.deaths.length}]. Syncing to Merlin...`);
            const characterName = this.#detectedCharacterName ?? "Unknown Character";
            if (pull.bossFight !== null) this.#onPullCompleted?.(pull.bossFight, characterName, this.#serverId);
          } else {
            this.#onLog?.(`⚔️ Trash clear: ${bossName} in ${durationSec}s [Deaths: ${pull.deaths.length}].`);
          }
        }
        this.#onStatus?.(this.status);
        this.#onSnapshot?.(null, false);
      },
    });
  }

  async #onFileChange(file: LogFileInfo | null): Promise<void> {
    this.#resetSession(file?.name ?? null);
    this.#combat?.end();
    this.#combat = null;

    if (file === null) {
      this.#parser = null;
      return;
    }

    this.#parser = new LogParser({ fileName: file.name });
    this.#initCombatSession();

    const identity = parseLogFileName(file.name);
    // Read the beginning of the log file to identify the local player
    const initialIdentity = await readInitialLogIdentity(file.path);
    if (initialIdentity) {
      this.#localPlayerId = initialIdentity.playerId;
      this.#detectedCharacterName = initialIdentity.characterName;
      this.#serverId = initialIdentity.serverId ?? null;
      this.#discipline = initialIdentity.discipline ?? null;
      this.#zone = initialIdentity.zone ?? null;
      this.#characterReported = true;
      this.#onLog?.(`New live log attached: ${file.name} | Character: ${initialIdentity.characterName}`);
      this.#onCharacterDetected?.({
        characterName: initialIdentity.characterName,
        serverId: this.#serverId,
        discipline: this.#discipline,
        occurredAt: new Date(identity?.startedAt ?? Date.now()).toISOString(),
      });
    }

    this.#onStatus?.(this.status);
  }

  #onLines(lines: string[]): void {
    if (this.#parser === null) return;
    const events: CombatEvent[] = [];
    for (const line of lines) {
      const event = this.#parser.push(line);
      if (event !== null) events.push(event);
    }
    this.#processEvents(events);
  }

  #processEvents(events: CombatEvent[]): void {
    for (const event of events) {
      if (event.type === "unknown") this.#unknownLines += 1;

      if (event.type === "areaEntered") {
        if (this.#localPlayerId === null || (event.source?.kind === "player" && event.source.playerId === this.#localPlayerId)) {
          this.#zone = event.zone.name;
          if (event.serverId) this.#serverId = event.serverId;
          if (event.source?.kind === "player") {
            this.#localPlayerId = event.source.playerId;
            this.#detectedCharacterName = event.source.name.trim();
          }
        }
      }

      if (event.type === "disciplineChanged") {
        if (event.source?.kind === "player" && (this.#localPlayerId === null || event.source.playerId === this.#localPlayerId)) {
          this.#localPlayerId = event.source.playerId;
          this.#detectedCharacterName = event.source.name.trim();
          this.#discipline = event.discipline.name;
        }
      }

      if (this.#localPlayerId === null && event.source?.kind === "player" && (event.type === "areaEntered" || event.type === "disciplineChanged")) {
        this.#localPlayerId = event.source.playerId;
        this.#detectedCharacterName = event.source.name.trim();
      }

      if (this.#detectedCharacterName && !this.#characterReported) {
        this.#characterReported = true;
        this.#onCharacterDetected?.({
          characterName: this.#detectedCharacterName,
          serverId: this.#serverId,
          discipline: this.#discipline,
          occurredAt: new Date(event.timestamp || Date.now()).toISOString(),
        });
      }

      this.#combat?.push(event);
    }

    this.#eventsParsed += events.length;
    this.#track(events.length);

    if (events.length > 0 && this.#combat) {
      const now = events[events.length - 1]!.timestamp;
      const live = this.#combat.current(now);
      if (live) {
        const localActor = live.actors.find((a) => a.name === this.#detectedCharacterName) ?? live.actors[0];
        if (localActor) {
          this.#liveDps = Math.round(localActor.dps);
          this.#liveHps = Math.round(localActor.hps);
          this.#liveDtps = Math.round(localActor.dtps);
          this.#totalDamage = localActor.damage;
          this.#totalHealing = localActor.healing;
          this.#totalDamageTaken = localActor.damageTaken;
        }
        if (Date.now() - this.#lastSnapshotSentAt >= 500 && this.#onSnapshot) {
          this.#lastSnapshotSentAt = Date.now();
          this.#onSnapshot(live, true);
        }
      }
    }

    this.#onStatus?.(this.status);
  }

  #track(count: number): void {
    const now = Date.now();
    for (let i = 0; i < count; i += 1) this.#recentTimestamps.push(now);
    const cutoff = now - 5_000;
    while (this.#recentTimestamps.length > 0 && this.#recentTimestamps[0]! < cutoff) {
      this.#recentTimestamps.shift();
    }
  }

  #rate(): number {
    return Math.round(this.#recentTimestamps.length / 5);
  }
}
