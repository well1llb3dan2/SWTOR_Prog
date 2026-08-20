import { open } from "node:fs/promises";
import { LogParser, parseLine, parseLogFileName } from "@swtor/parser";
import { CombatSession, type LivePullState, type PullSummary } from "@swtor/analytics";
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
  eventsPerSecond: number;
  unknownLines: number;
  zone: string | null;
  detectedCharacter?: string | null;
  activeBoss?: string | null;
  lastPullOutcome?: string | null;
}

export interface LogStreamerOptions {
  directory?: string;
  onStatus?: (status: StreamerStatus) => void;
  onSnapshot?: (snapshot: LivePullState | null, inCombat: boolean) => void;
  onCharacterDetected?: (character: DetectedCharacterInput) => void;
  onPullCompleted?: (pull: PullSummary, characterName: string, serverId: string | null) => void;
  tailer?: Pick<TailerOptions, "pollIntervalMs" | "startAtEnd">;
}

/** Wires the tailer, parser, analytics, and Merlin progression uplink into one pipeline. */
export class LogStreamer {
  readonly #options: LogStreamerOptions;
  readonly #tailer: LogTailer | null;
  readonly #onStatus: ((status: StreamerStatus) => void) | undefined;
  readonly #onSnapshot: ((snapshot: LivePullState | null, inCombat: boolean) => void) | undefined;
  readonly #onCharacterDetected: ((character: DetectedCharacterInput) => void) | undefined;
  readonly #onPullCompleted: ((pull: PullSummary, characterName: string, serverId: string | null) => void) | undefined;

  #parser: LogParser | null = null;
  #combat: CombatSession | null = null;
  #replay: ReplaySource | null = null;
  #fileName: string | null = null;
  #eventsParsed = 0;
  #unknownLines = 0;
  #zone: string | null = null;
  #serverId: string | null = null;
  #discipline: string | null = null;
  #localPlayerId: string | null = null;
  #detectedCharacterName: string | null = null;
  #characterReported = false;
  #activeBoss: string | null = null;
  #lastPullOutcome: string | null = null;
  #recentTimestamps: number[] = [];
  #lastSnapshotSentAt = 0;

  constructor(options: LogStreamerOptions) {
    this.#options = options;
    this.#onStatus = options.onStatus;
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
      eventsPerSecond: this.#rate(),
      unknownLines: this.#unknownLines,
      zone: this.#zone,
      detectedCharacter: this.#detectedCharacterName,
      activeBoss: this.#activeBoss,
      lastPullOutcome: this.#lastPullOutcome,
    };
  }

  start(): void {
    this.startLive();
  }

  startLive(): void {
    this.stop();
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

    // Read initial identity
    const initialIdentity = await readInitialLogIdentity(filePath);
    if (initialIdentity) {
      this.#localPlayerId = initialIdentity.playerId;
      this.#detectedCharacterName = initialIdentity.characterName;
      this.#serverId = initialIdentity.serverId ?? null;
      this.#discipline = initialIdentity.discipline ?? null;
      this.#zone = initialIdentity.zone ?? null;
      this.#characterReported = true;
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
        this.#onStatus?.(this.status);
        onDone?.();
      },
    });

    try {
      const totalEvents = await this.#replay.load();
      if (totalEvents === 0) return { ok: false, error: "No combat events found in that log file." };
      this.#fileName = this.#replay.fileName;
      this.#replay.start();
      this.#onStatus?.(this.status);
      return { ok: true, totalEvents };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
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
    this.#localPlayerId = null;
    this.#detectedCharacterName = null;
    this.#characterReported = false;
    this.#activeBoss = null;
    this.#lastPullOutcome = null;
    this.#eventsParsed = 0;
    this.#unknownLines = 0;
    this.#recentTimestamps = [];
  }

  #initCombatSession() {
    this.#combat?.end();
    this.#combat = new CombatSession({
      onPullStart: (live) => {
        this.#activeBoss = live.encounter?.encounterName ?? live.boss?.name ?? "Boss Pull";
        this.#onStatus?.(this.status);
        this.#onSnapshot?.(live, true);
      },
      onPullEnd: (pull) => {
        this.#activeBoss = null;
        const hasCombatData =
          pull.boss !== null ||
          pull.encounter !== null ||
          (pull.actors && pull.actors.some((a) => a.damage > 0 || a.healing > 0));
        if (hasCombatData) {
          const bossName = pull.encounter?.encounterName ?? pull.boss?.name ?? "Boss Encounter";
          this.#lastPullOutcome = `${bossName} (${pull.outcome === "kill" ? "Kill" : "Wipe"})`;
          const characterName = this.#detectedCharacterName ?? "Unknown Character";
          this.#onPullCompleted?.(pull, characterName, this.#serverId);
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
    this.#onStatus?.(this.status);

    if (events.length > 0 && this.#onSnapshot && this.#combat) {
      const now = events[events.length - 1]!.timestamp;
      if (Date.now() - this.#lastSnapshotSentAt >= 500) {
        this.#lastSnapshotSentAt = Date.now();
        const live = this.#combat.current(now);
        if (live) this.#onSnapshot(live, true);
      }
    }
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
