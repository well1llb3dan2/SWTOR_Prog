import type { CombatEvent } from "@swtor/shared";
import type { FightEventBucketDocument } from "./schema.js";

export const DEFAULT_BUCKET_MS = 10_000;

/**
 * Ceiling on events per document.
 *
 * Ten seconds of an eight-player operation can run to several thousand events;
 * at a few hundred bytes each that approaches MongoDB's 16MB document limit. A
 * bucket that overflows rolls into a further `part` rather than failing.
 */
export const DEFAULT_MAX_EVENTS_PER_BUCKET = 4_000;

export interface BucketOptions {
  bucketMs?: number;
  maxEventsPerBucket?: number;
  /** Days to keep raw events; null keeps them indefinitely. */
  retentionDays?: number | null;
}

export interface BucketInput {
  guildId: string;
  reportCode: string;
  fightId: number;
  eventId: string;
  /** Epoch ms the fight started; bucket indices are relative to it. */
  fightStartedAt: number;
  events: CombatEvent[];
}

/** Splits a fight's events into storage buckets. Pure; safe to unit test. */
export function bucketFightEvents(
  input: BucketInput,
  options: BucketOptions = {},
): FightEventBucketDocument[] {
  const bucketMs = options.bucketMs ?? DEFAULT_BUCKET_MS;
  const maxEvents = options.maxEventsPerBucket ?? DEFAULT_MAX_EVENTS_PER_BUCKET;
  const retentionDays = options.retentionDays ?? null;

  const grouped = new Map<number, CombatEvent[]>();
  for (const event of input.events) {
    const index = Math.max(0, Math.floor((event.timestamp - input.fightStartedAt) / bucketMs));
    const existing = grouped.get(index);
    if (existing === undefined) grouped.set(index, [event]);
    else existing.push(event);
  }

  const documents: FightEventBucketDocument[] = [];
  for (const index of [...grouped.keys()].sort((a, b) => a - b)) {
    const events = grouped.get(index)!;
    const startedAt = input.fightStartedAt + index * bucketMs;

    for (let part = 0; part * maxEvents < events.length; part += 1) {
      const slice = events.slice(part * maxEvents, (part + 1) * maxEvents);
      documents.push({
        guildId: input.guildId,
        reportCode: input.reportCode,
        fightId: input.fightId,
        eventId: input.eventId,
        bucketIndex: index,
        part,
        startedAt: new Date(startedAt),
        endedAt: new Date(startedAt + bucketMs),
        eventCount: slice.length,
        events: slice,
        expiresAt:
          retentionDays === null ? null : new Date(startedAt + retentionDays * 24 * 60 * 60 * 1000),
      });
    }
  }

  return documents;
}

/** Reassembles buckets into a single ordered event stream. */
export function mergeBuckets(buckets: readonly FightEventBucketDocument[]): CombatEvent[] {
  return [...buckets]
    .sort((a, b) => a.bucketIndex - b.bucketIndex || a.part - b.part)
    .flatMap((bucket) => bucket.events);
}
