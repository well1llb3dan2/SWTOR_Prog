import { LogParser } from "@swtor/parser";
import { CombatSession, type PullSummary } from "@swtor/analytics";
import type { CombatEvent } from "@swtor/shared";
import { EventBatcher } from "./batcher.js";
import type { IngestClient } from "./ingestClient.js";
import { parseLogFileName } from "@swtor/parser";
import { LogTailer, type TailerOptions } from "./tailer.js";
import type { LogFileInfo } from "./logDirectory.js";
import type { DetectedCharacterInput } from "./api.js";

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
  client: IngestClient;
  onStatus?: (status: StreamerStatus) => void;
  onCharacterDetected?: (character: DetectedCharacterInput) => void;
  onPullCompleted?: (pull: PullSummary, characterName: string, serverId: string | null) => void;
  tailer?: Pick<TailerOptions, "pollIntervalMs" | "startAtEnd">;
}

/** Wires the tailer, parser, batcher, analytics, and ingest client into one pipeline. */
export class LogStreamer {
  readonly #client: IngestClient;
  readonly #tailer: LogTailer;
  readonly #batcher: EventBatcher;
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
  #detectedCharacterName: string | null = null;
  #activeBoss: string | null = null;
  #lastPullOutcome: string | null = null;
  #seenCharacters = new Set<string>();
  #recentTimestamps: number[] = [];

  constructor(options: LogStreamerOptions) {
    this.#client = options.client;
    this.#onStatus = options.onStatus;
    this.#onCharacterDetected = options.onCharacterDetected;
    this.#onPullCompleted = options.onPullCompleted;

    this.#batcher = new EventBatcher({
      maxEvents: 50,
      maxDelayMs: 1_000,
      onFlush: (events) => this.#client.send(events),
    });

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
    this.#batcher.stop();
    this.#combat?.end();
    this.#combat = null;
  }

  #onFileChange(file: LogFileInfo | null): void {
    this.#fileName = file?.name ?? null;
    this.#zone = null;
    this.#serverId = null;
    this.#discipline = null;
    this.#detectedCharacterName = null;
    this.#activeBoss = null;
    this.#lastPullOutcome = null;
    this.#seenCharacters.clear();
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
    this.#client.restartSession(file.name, identity?.startedAt ?? Date.now());
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
        this.#zone = event.zone.name;
        if (event.serverId) this.#serverId = event.serverId;
      }
      if (event.type === "disciplineChanged") {
        this.#discipline = event.discipline.name;
      }
      if (event.source?.kind === "player" && event.source.name) {
        const charName = event.source.name.trim();
        if (charName.length > 0 && !this.#seenCharacters.has(charName)) {
          this.#seenCharacters.add(charName);
          this.#detectedCharacterName = charName;
          this.#onCharacterDetected?.({
            characterName: charName,
            serverId: this.#serverId,
            discipline: this.#discipline,
            occurredAt: new Date(event.timestamp || Date.now()).toISOString(),
          });
        }
      }
      this.#combat?.push(event);
      events.push(event);
    }

    this.#eventsParsed += events.length;
    this.#track(events.length);
    this.#batcher.add(events);
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
