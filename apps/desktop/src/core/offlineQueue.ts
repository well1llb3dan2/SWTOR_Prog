import type { CombatEvent } from "@swtor/shared";

export interface QueuedBatch {
  sequence: number;
  events: CombatEvent[];
}

/**
 * Bounded FIFO of batches awaiting delivery.
 *
 * A raid can continue for a long time while the connection is down, so the
 * queue is capped by event count rather than batch count and drops the oldest
 * first: recent combat is what a live meter needs, and the log file remains the
 * durable record either way.
 */
export class OfflineQueue {
  readonly #maxEvents: number;
  #batches: QueuedBatch[] = [];
  #events = 0;
  #dropped = 0;

  constructor(maxEvents = 100_000) {
    this.#maxEvents = maxEvents;
  }

  get size(): number {
    return this.#batches.length;
  }

  get eventCount(): number {
    return this.#events;
  }

  get droppedEvents(): number {
    return this.#dropped;
  }

  push(batch: QueuedBatch): void {
    this.#batches.push(batch);
    this.#events += batch.events.length;

    while (this.#events > this.#maxEvents && this.#batches.length > 1) {
      const oldest = this.#batches.shift()!;
      this.#events -= oldest.events.length;
      this.#dropped += oldest.events.length;
    }
  }

  peek(): QueuedBatch | undefined {
    return this.#batches[0];
  }

  shift(): QueuedBatch | undefined {
    const batch = this.#batches.shift();
    if (batch !== undefined) this.#events -= batch.events.length;
    return batch;
  }

  clear(): void {
    this.#batches = [];
    this.#events = 0;
  }
}
