import { describe, expect, it } from "vitest";
import {
  buildIndexPlan,
  generateReportCode,
  isReportCode,
  summariseProgression,
  toFightSummary,
  type FightSummaryDocument,
} from "@swtor/db";

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
  it("keeps the reports collection indexed for lookup and recent history", () => {
    const reports = buildIndexPlan(null).find((p) => p.collection === "reports")!;
    expect(reports.indexes.some((i) => i.name === "report_code")).toBe(true);
    expect(reports.indexes.some((i) => i.name === "report_recent")).toBe(true);
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
