import { describe, expect, it } from "vitest";
import { bucketFightEvents, mergeBuckets } from "@swtor/db";
import type { CombatEvent } from "@swtor/shared";

function event(timestamp: number, lineNumber: number): CombatEvent {
  return { type: "unknown", timestamp, lineNumber, source: null, target: null, ability: null, threat: null, raw: `line-${lineNumber}`, reason: "test" };
}

describe("fight event buckets", () => {
  it("splits oversized time buckets and merges them in source order", () => {
    const events = [event(1000, 1), event(1001, 2), event(1002, 3)];
    const buckets = bucketFightEvents({ guildId: "guild", reportCode: "R1", fightId: 1, eventId: "evt-1", fightStartedAt: 1000, events }, { bucketMs: 10_000, maxEventsPerBucket: 2 });
    expect(buckets.map((bucket) => bucket.part)).toEqual([0, 1]);
    expect(mergeBuckets(buckets).map((entry) => entry.lineNumber)).toEqual([1, 2, 3]);
  });

  it("assigns time buckets relative to the fight and applies retention", () => {
    const buckets = bucketFightEvents({ guildId: "guild", reportCode: "R1", fightId: 1, eventId: "evt-1", fightStartedAt: 1000, events: [event(12_000, 1)] }, { bucketMs: 10_000, retentionDays: 7 });
    expect(buckets[0]?.bucketIndex).toBe(1);
    expect(buckets[0]?.expiresAt?.getTime()).toBe(604_811_000);
  });
});
