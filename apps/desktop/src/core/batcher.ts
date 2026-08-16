import type { CombatEvent } from "@swtor/shared";

export interface BatcherOptions {
  /** Flush once this many events are pending. */
  maxEvents?: number;
  /** Flush at least this often, even when quiet. */
  maxDelayMs?: number;
  onFlush: (events: CombatEvent[]) => void;
}

/**
 * Buffers parsed events into batches.
 *
 * Flushing on whichever of size or time comes first keeps the live meter
 * responsive during a quiet moment without sending a socket frame per event
 * during a burst.
 */
export class EventBatcher {
  readonly #maxEvents: number;
  readonly #maxDelayMs: number;
  readonly #onFlush: (events: CombatEvent[]) => void;

  #pending: CombatEvent[] = [];
  #timer: NodeJS.Timeout | null = null;

  constructor(options: BatcherOptions) {
    this.#maxEvents = options.maxEvents ?? 50;
    this.#maxDelayMs = options.maxDelayMs ?? 1_000;
    this.#onFlush = options.onFlush;
  }

  get pendingCount(): number {
    return this.#pending.length;
  }

  add(events: readonly CombatEvent[]): void {
    for (const event of events) {
      this.#pending.push(event);
      if (this.#pending.length >= this.#maxEvents) this.flush();
    }
    if (this.#pending.length > 0) this.#arm();
  }

  flush(): void {
    this.#disarm();
    if (this.#pending.length === 0) return;
    const batch = this.#pending;
    this.#pending = [];
    this.#onFlush(batch);
  }

  stop(): void {
    this.#disarm();
    this.#pending = [];
  }

  #arm(): void {
    if (this.#timer !== null) return;
    this.#timer = setTimeout(() => this.flush(), this.#maxDelayMs);
    this.#timer.unref?.();
  }

  #disarm(): void {
    if (this.#timer === null) return;
    clearTimeout(this.#timer);
    this.#timer = null;
  }
}
