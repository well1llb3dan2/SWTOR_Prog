import { LogParser } from "@swtor/parser";
import type { CombatEvent } from "@swtor/shared";
import { EventBatcher } from "./batcher.js";
import type { IngestClient } from "./ingestClient.js";
import { parseLogFileName } from "@swtor/parser";
import { LogTailer, type TailerOptions } from "./tailer.js";
import type { LogFileInfo } from "./logDirectory.js";

export interface StreamerStatus {
  fileName: string | null;
  eventsParsed: number;
  eventsPerSecond: number;
  unknownLines: number;
  zone: string | null;
}

export interface LogStreamerOptions {
  directory: string;
  client: IngestClient;
  onStatus?: (status: StreamerStatus) => void;
  tailer?: Pick<TailerOptions, "pollIntervalMs" | "startAtEnd">;
}

/** Wires the tailer, parser, batcher and ingest client into one pipeline. */
export class LogStreamer {
  readonly #client: IngestClient;
  readonly #tailer: LogTailer;
  readonly #batcher: EventBatcher;
  readonly #onStatus: ((status: StreamerStatus) => void) | undefined;

  #parser: LogParser | null = null;
  #fileName: string | null = null;
  #eventsParsed = 0;
  #unknownLines = 0;
  #zone: string | null = null;
  #recentTimestamps: number[] = [];

  constructor(options: LogStreamerOptions) {
    this.#client = options.client;
    this.#onStatus = options.onStatus;

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
    };
  }

  start(): void {
    this.#tailer.start();
  }

  stop(): void {
    this.#tailer.stop();
    this.#batcher.stop();
  }

  #onFileChange(file: LogFileInfo | null): void {
    this.#fileName = file?.name ?? null;
    this.#zone = null;
    this.#eventsParsed = 0;
    this.#unknownLines = 0;

    if (file === null) {
      this.#parser = null;
      return;
    }

    this.#parser = new LogParser({ fileName: file.name });
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
      if (event.type === "areaEntered") this.#zone = event.zone.name;
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
