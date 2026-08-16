import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUCKET_MS,
  bucketFightEvents,
  buildIndexPlan,
  generateReportCode,
  isReportCode,
  mergeBuckets,
  summariseProgression,
  toFightSummary,
  type FightSummaryDocument,
} from "@swtor/db";
import type { CombatEvent } from "@swtor/shared";

const event = (timestamp: number, lineNumber: number): CombatEvent => ({
  timestamp,
  lineNumber,
  source: null,
  target: null,
  ability: null,
  threat: null,
  type: "ability",
  phase: "activate",
});

const input = (events: CombatEvent[]) => ({
  guildId: "infamous",
  reportCode: "ABC123",
  fightId: 1,
  fightStartedAt: 1_000_000,
  events,
});

describe("bucketFightEvents", () => {
  it("groups events into ten-second slices indexed from the fight start", () => {
    const buckets = bucketFightEvents(
      input([event(1_000_000, 1), event(1_009_999, 2), event(1_010_000, 3), event(1_025_000, 4)]),
    );

    expect(buckets.map((b) => b.bucketIndex)).toEqual([0, 1, 2]);
    expect(buckets[0]!.eventCount).toBe(2);
    expect(buckets[2]!.events[0]!.lineNumber).toBe(4);
    expect(buckets[0]!.endedAt.getTime() - buckets[0]!.startedAt.getTime()).toBe(DEFAULT_BUCKET_MS);
  });

  it("clamps events that precede the recorded fight start into the first bucket", () => {
    const buckets = bucketFightEvents(input([event(999_000, 1), event(1_000_500, 2)]));
    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.bucketIndex).toBe(0);
  });

  // A dense slice of an eight-player operation can approach the 16MB ceiling.
  it("overflows a dense slice into further parts instead of one huge document", () => {
    const events = Array.from({ length: 25 }, (_, i) => event(1_000_000 + i, i));
    const buckets = bucketFightEvents(input(events), { maxEventsPerBucket: 10 });

    expect(buckets.map((b) => b.part)).toEqual([0, 1, 2]);
    expect(buckets.map((b) => b.eventCount)).toEqual([10, 10, 5]);
    expect(buckets.every((b) => b.bucketIndex === 0)).toBe(true);
  });

  it("keeps events indefinitely when no retention window is set", () => {
    const buckets = bucketFightEvents(input([event(1_000_000, 1)]));
    expect(buckets[0]!.expiresAt).toBeNull();
  });

  it("stamps an expiry when a retention window is configured", () => {
    const buckets = bucketFightEvents(input([event(1_000_000, 1)]), { retentionDays: 30 });
    const expected = 1_000_000 + 30 * 24 * 60 * 60 * 1000;
    expect(buckets[0]!.expiresAt?.getTime()).toBe(expected);
  });

  it("round-trips through merge in original order", () => {
    const events = Array.from({ length: 50 }, (_, i) => event(1_000_000 + i * 1_000, i));
    const buckets = bucketFightEvents(input(events), { maxEventsPerBucket: 3 });
    expect(mergeBuckets(buckets)).toEqual(events);
  });

  it("carries the guild through to every bucket", () => {
    const buckets = bucketFightEvents(input([event(1_000_000, 1), event(1_020_000, 2)]));
    expect(buckets.every((b) => b.guildId === "infamous")).toBe(true);
  });
});

describe("generateReportCode", () => {
  it("produces codes of the requested length from the safe alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateReportCode(10);
      expect(code).toHaveLength(10);
      expect(isReportCode(code)).toBe(true);
    }
  });

  it("avoids vowels so codes cannot spell words", () => {
    const codes = Array.from({ length: 200 }, () => generateReportCode(12)).join("");
    expect(codes).not.toMatch(/[AEIOU]/);
  });

  it("does not collide across a large sample", () => {
    const codes = new Set(Array.from({ length: 5_000 }, () => generateReportCode(10)));
    expect(codes.size).toBe(5_000);
  });
});

describe("buildIndexPlan", () => {
  it("omits the TTL index when events are kept forever", () => {
    const buckets = buildIndexPlan(null).find((p) => p.collection === "fightEventBuckets")!;
    expect(buckets.indexes.some((i) => i.name === "bucket_ttl")).toBe(false);
  });

  it("adds a TTL index when a retention window is configured", () => {
    const buckets = buildIndexPlan(30).find((p) => p.collection === "fightEventBuckets")!;
    const ttl = buckets.indexes.find((i) => i.name === "bucket_ttl")!;
    expect(ttl.expireAfterSeconds).toBe(0);
  });

  it("leads every tenanted index with the guild", () => {
    // Lookups that are global by nature key on their own unique identifier.
    const globalKeys = [
      "guildId",
      "code",
      "reportCode",
      "discordMessageId",
      "discordId",
      "tokens.hash",
      "expiresAt",
    ];
    for (const plan of buildIndexPlan(30)) {
      for (const index of plan.indexes) {
        const first = Object.keys(index.key)[0]!;
        expect(globalKeys, `${plan.collection}.${index.name ?? ""}`).toContain(first);
      }
    }
  });
});

describe("summariseProgression", () => {
  const fight = (
    encounterId: string,
    outcome: "kill" | "wipe" | "incomplete",
    hpPercent: number | null,
    startedAt: Date,
  ): FightSummaryDocument => ({
    fightId: 1,
    startedAt,
    endedAt: startedAt,
    durationMs: 1000,
    zone: "Darvannis",
    difficulty: "Veteran",
    groupSize: 8,
    boss: {
      npcId: "1",
      name: "Dash'Roode",
      maxHp: 100,
      hp: hpPercent,
      hpPercent,
      isLikelyBoss: true,
    },
    encounter: {
      encounterId,
      encounterName: "Dash'Roode",
      operationId: "snv",
      operationName: "Scum and Villainy",
      isLair: false,
      matchedBosses: ["dash'roode"],
      phases: [],
      victoryEvent: "Boss defeated",
      cleared: outcome === "kill",
    },
    outcome,
    actors: [],
    deaths: [],
  });

  it("counts attempts and kills per encounter", () => {
    const entries = summariseProgression([
      fight("snv_dashroode", "wipe", 42, new Date("2026-08-15T22:00:00Z")),
      fight("snv_dashroode", "wipe", 18, new Date("2026-08-15T22:10:00Z")),
      fight("snv_dashroode", "kill", 0, new Date("2026-08-15T22:20:00Z")),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ attempts: 3, kills: 1, bestWipeHpPercent: 18 });
    expect(entries[0]!.firstKillAt?.toISOString()).toBe("2026-08-15T22:20:00.000Z");
  });

  it("ignores pulls that matched no encounter", () => {
    const trash = fight("snv_dashroode", "wipe", 50, new Date());
    expect(summariseProgression([{ ...trash, encounter: null }])).toEqual([]);
  });
});

describe("toFightSummary", () => {
  it("drops the time series so fight metadata stays small", () => {
    const summary = toFightSummary(
      {
        id: "p1",
        index: 1,
        startedAt: 1_000,
        endedAt: 2_000,
        durationMs: 1_000,
        zone: "Darvannis",
        difficulty: "Veteran",
        groupSize: 8,
        boss: null,
        encounter: null,
        outcome: "wipe",
        roster: [],
        actors: [],
        deaths: [],
        buckets: [{ index: 0, startedAt: 1_000, damage: {}, healing: {}, damageTaken: {} }],
      },
      7,
    );

    expect(summary.fightId).toBe(7);
    expect(summary).not.toHaveProperty("buckets");
    expect(summary.startedAt.getTime()).toBe(1_000);
  });
});
