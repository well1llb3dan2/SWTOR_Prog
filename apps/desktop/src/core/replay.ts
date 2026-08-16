import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { LogParser } from "@swtor/parser";
import type { CombatEvent } from "@swtor/shared";

export interface ReplayOptions {
  filePath: string;
  /** Playback multiplier; 1 is real time. */
  speed?: number;
  tickMs?: number;
  onEvents: (events: CombatEvent[]) => void;
  onProgress?: (progress: ReplayProgress) => void;
  onDone?: () => void;
}

export interface ReplayProgress {
  emitted: number;
  total: number;
  /** Position within the log's own timeline. */
  elapsedMs: number;
}

/**
 * Replays a recorded combat log as if it were arriving live.
 *
 * This is the development and test harness for the whole pipeline: it exercises
 * the real parser, server and portal without needing the game running. Events
 * are released on the log's own clock scaled by `speed`, so pull detection and
 * meter behaviour match a live raid rather than arriving as one burst.
 */
export class ReplaySource {
  readonly #options: Required<Omit<ReplayOptions, "onProgress" | "onDone">> &
    Pick<ReplayOptions, "onProgress" | "onDone">;

  #events: CombatEvent[] = [];
  #cursor = 0;
  #virtualNow = 0;
  #timer: NodeJS.Timeout | null = null;

  constructor(options: ReplayOptions) {
    this.#options = { speed: 4, tickMs: 100, ...options };
  }

  get fileName(): string {
    return basename(this.#options.filePath);
  }

  get totalEvents(): number {
    return this.#events.length;
  }

  get startedAt(): number {
    return this.#events[0]?.timestamp ?? Date.now();
  }

  async load(): Promise<number> {
    const text = (await readFile(this.#options.filePath, "utf8")).replace(/^\uFEFF/, "");
    const parser = new LogParser({ fileName: this.fileName });
    this.#events = parser.pushAll(text.split(/\r?\n/));
    this.#cursor = 0;
    this.#virtualNow = this.startedAt;
    return this.#events.length;
  }

  start(): void {
    if (this.#timer !== null || this.#events.length === 0) return;
    this.#timer = setInterval(() => this.tick(), this.#options.tickMs);
    this.#timer.unref?.();
  }

  stop(): void {
    if (this.#timer === null) return;
    clearInterval(this.#timer);
    this.#timer = null;
  }

  /** Advances the virtual clock one step. Exposed so tests can drive it. */
  tick(): void {
    if (this.#cursor >= this.#events.length) {
      this.stop();
      this.#options.onDone?.();
      return;
    }

    this.#virtualNow += this.#options.tickMs * this.#options.speed;

    const batch: CombatEvent[] = [];
    while (
      this.#cursor < this.#events.length &&
      this.#events[this.#cursor]!.timestamp <= this.#virtualNow
    ) {
      batch.push(this.#events[this.#cursor]!);
      this.#cursor += 1;
    }

    if (batch.length > 0) {
      this.#options.onEvents(batch);
      this.#options.onProgress?.({
        emitted: this.#cursor,
        total: this.#events.length,
        elapsedMs: this.#virtualNow - this.startedAt,
      });
    }
  }
}
