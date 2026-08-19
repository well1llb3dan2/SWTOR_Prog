import { open } from "node:fs/promises";
import { LogParser, parseLine, parseLogFileName } from "@swtor/parser";
import { CombatSession, type PullSummary } from "@swtor/analytics";
import type { CombatEvent } from "@swtor/shared";
import { EventBatcher } from "./batcher.js";
import type { IngestClient } from "./ingestClient.js";
import { LogTailer, type TailerOptions } from "./tailer.js";
import type { LogFileInfo } from "./logDirectory.js";
import type { DetectedCharacterInput } from "./api.js";
import { decodeLogText } from "./encoding.js";

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
  directory: string;
  client?: IngestClient | null;
  onStatus?: (status: StreamerStatus) => void;
  onCharacterDetected?: (character: DetectedCharacterInput) => void;
  onPullCompleted?: (pull: PullSummary, characterName: string, serverId: string | null) => void;
  tailer?: Pick<TailerOptions, "pollIntervalMs" | "startAtEnd">;
}

/** Wires the tailer, parser, batcher, analytics, and ingest client into one pipeline. */
export class LogStreamer {
  readonly #client: IngestClient | null;
  readonly #tailer: LogTailer;
  readonly #batcher: EventBatcher | null;
  readonly #onStatus: ((status: StreamerStatus) => void) | undefined;
  readonly #onCharacterDetected: ((character: DetectedCharacterInput) => void) | undefined;
  readonly #onPullCompleted: ((pull: PullSummary, characterName: string, serverId: string | null) => void) | undefined;

  #parser: LogParser | null = null;
  #combat: CombatSession | null = null;
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

  constructor(options: LogStreamerOptions) {
    this.#client = options.client ?? null;
    this.#onStatus = options.onStatus;
    this.#onCharacterDetected = options.onCharacterDetected;
    this.#onPullCompleted = options.onPullCompleted;

    this.#batcher = this.#client !== null ? new EventBatcher({
      maxEvents: 50,
      maxDelayMs: 1_000,
      onFlush: (events) => this.#client?.send(events),
    }) : null;

    this.#tailer = new LogTailer(options.directory, {
      ...options.tailer,
      onFileChange: (file) => this.#onFileChange(file),
      onLines: (lines) => this.#onLines(lines),
    });
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
    this.#tailer.start();
  }

  stop(): void {
    this.#tailer.stop();
    this.#batcher?.stop();
    this.#combat?.end();
    this.#combat = null;
  }

  async #onFileChange(file: LogFileInfo | null): Promise<void> {
    this.#fileName = file?.name ?? null;
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

    this.#combat?.end();
    this.#combat = null;

    if (file === null) {
      this.#parser = null;
      return;
    }

    this.#parser = new LogParser({ fileName: file.name });
    this.#combat = new CombatSession({
      onPullStart: (live) => {
        this.#activeBoss = live.encounter?.encounterName ?? live.boss?.name ?? "Boss Pull";
        this.#onStatus?.(this.status);
      },
      onPullEnd: (pull) => {
        this.#activeBoss = null;
        if (pull.boss?.isLikelyBoss === true || pull.encounter !== null) {
          const bossName = pull.encounter?.encounterName ?? pull.boss?.name ?? "Boss";
          this.#lastPullOutcome = `${bossName} (${pull.outcome === "kill" ? "Kill" : "Wipe"})`;
          const characterName = this.#detectedCharacterName ?? "Unknown Character";
          this.#onPullCompleted?.(pull, characterName, this.#serverId);
        }
        this.#onStatus?.(this.status);
      },
    });

    const identity = parseLogFileName(file.name);
    this.#client?.restartSession(file.name, identity?.startedAt ?? Date.now());

    // Always read the beginning of the log file to definitively identify the local player
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
      if (event === null) continue;
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
      events.push(event);
    }

    this.#eventsParsed += events.length;
    this.#track(events.length);
    this.#batcher?.add(events);
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
