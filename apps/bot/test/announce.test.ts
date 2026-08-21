import type { PullSummary } from "@swtor/analytics";
import { describe, expect, it } from "vitest";
import { AnnouncementPolicy } from "../src/announce.js";
import { buildAnnouncementEmbed } from "../src/embeds.js";

const REF = { reportCode: "ABC123", fightId: 3 };

function pull(over: Partial<PullSummary> = {}): PullSummary {
  return {
    id: "p1",
    index: 1,
    startedAt: 1_000,
    endedAt: 241_000,
    durationMs: 240_000,
    zone: "Darvannis",
    difficulty: "Veteran",
    groupSize: 8,
    boss: {
      npcId: "1",
      name: "Dash'Roode",
      maxHp: 21_829_804,
      hp: 0,
      hpPercent: 0,
      isLikelyBoss: true,
    },
    encounter: {
      encounterId: "snv_dashroode",
      encounterName: "Dash'Roode",
      operationId: "snv",
      operationName: "Scum and Villainy",
      isLair: false,
      matchedBosses: ["dash'roode"],
      phases: [],
      victoryEvent: "Boss defeated",
      cleared: true,
    },
    outcome: "kill",
    enemyTimelines: [],
    roster: [
      {
        playerId: "1",
        name: "Ananias",
        advancedClass: "Guardian",
        discipline: "Defense",
        role: "tank",
      },
      { playerId: "2", name: "Zephyr", advancedClass: "Sage", discipline: "Seer", role: "healer" },
      {
        playerId: "3",
        name: "Valzler",
        advancedClass: "Vanguard",
        discipline: "Plasmatech",
        role: "dps",
      },
    ],
    actors: [
      {
        actorId: "3",
        name: "Valzler",
        role: "dps",
        discipline: "Plasmatech",
        damage: 2_400_000,
        healing: 0,
        overhealing: 0,
        damageTaken: 300_000,
        absorbed: 0,
        deaths: 0,
        dps: 10_000,
        hps: 0,
        dtps: 1_250,
        overhealPercent: 0,
      },
    ],
    deaths: [],
    buckets: [],
    bossFight: {
      id: "p1",
      index: 1,
      startedAt: 1_000,
      endedAt: 241_000,
      durationMs: 240_000,
      zone: "Darvannis",
      difficulty: "Veteran",
      groupSize: 8,
      encounter: {
        encounterId: "snv_dashroode",
        encounterName: "Dash'Roode",
        operationId: "snv",
        operationName: "Scum and Villainy",
        isLair: false,
        matchedBosses: ["dash'roode"],
        phases: [],
        victoryEvent: "Boss defeated",
        cleared: true,
      },
      bossEntities: [{
        instanceId: "1",
        npcId: "1",
        name: "Dash'Roode",
        role: "boss",
        firstSeenAt: 1_000,
        engagedAt: 1_000,
        lastSeenAt: 241_000,
        diedAt: 241_000,
        maxHp: 21_829_804,
        finalHp: 0,
        damageTaken: 21_829_804,
        damageDealt: 0,
        deaths: 1,
        phases: [],
        players: [],
      }],
      mechanicEntities: [],
      unknownEntities: [],
      phases: [],
      players: [],
      deaths: [],
      outcome: "kill",
      terminalEvidence: null,
      buckets: [],
      counters: {},
    },
    ...over,
  };
}

const wipe = (hpPercent: number | null): PullSummary =>
  pull({
    outcome: "wipe",
    boss: {
      npcId: "1",
      name: "Dash'Roode",
      maxHp: 21_829_804,
      hp: hpPercent === null ? null : 1,
      hpPercent,
      isLikelyBoss: true,
    },
    encounter: { ...pull().encounter!, cleared: false },
    bossFight: {
      ...pull().bossFight!,
      outcome: "wipe",
      encounter: { ...pull().bossFight!.encounter, cleared: false },
      bossEntities: [{
        ...pull().bossFight!.bossEntities[0]!,
        diedAt: null,
        finalHp: hpPercent === null ? null : (21_829_804 * hpPercent) / 100,
        deaths: 0,
      }],
    },
  });

const policy = () => new AnnouncementPolicy({ closeWipePercent: 15, bossesOnly: true });

describe("AnnouncementPolicy", () => {
  it("celebrates a first kill differently from a repeat", () => {
    const p = policy();
    expect(p.evaluate(pull(), REF)?.kind).toBe("firstKill");
    expect(p.evaluate(pull(), REF)?.kind).toBe("kill");
  });

  // A raid night is mostly wipes; posting all of them buries the milestones.
  it("stays silent on an ordinary wipe", () => {
    expect(policy().evaluate(wipe(72), REF)).toBeNull();
  });

  it("announces a close wipe that beats the previous best", () => {
    const p = policy();
    expect(p.evaluate(wipe(40), REF)).toBeNull();
    const close = p.evaluate(wipe(8), REF);

    expect(close?.kind).toBe("closeWipe");
    expect(close?.previousBestHpPercent).toBe(40);
    expect(close?.attempts).toBe(2);
  });

  it("does not repeat a close wipe that fails to beat the record", () => {
    const p = policy();
    expect(p.evaluate(wipe(5), REF)?.kind).toBe("closeWipe");
    expect(p.evaluate(wipe(9), REF)).toBeNull();
  });

  it("counts silent attempts so the kill reports the right number", () => {
    const p = policy();
    p.evaluate(wipe(80), REF);
    p.evaluate(wipe(60), REF);
    expect(p.evaluate(pull(), REF)?.attempts).toBe(3);
  });

  it("ignores pulls that matched no encounter", () => {
    expect(policy().evaluate(pull({ encounter: null }), REF)).toBeNull();
  });

  it("ignores trash when configured for bosses only", () => {
    const trash = pull({
      boss: {
        npcId: "2",
        name: "Dustclaw Alpha",
        maxHp: 1,
        hp: 0,
        hpPercent: 0,
        isLikelyBoss: false,
      },
      bossFight: null,
    });
    expect(policy().evaluate(trash, REF)).toBeNull();
  });

  it("does not announce trash without a boss fight record", () => {
    const relaxed = new AnnouncementPolicy({ closeWipePercent: 15, bossesOnly: false });
    const trash = pull({
      boss: {
        npcId: "2",
        name: "Dustclaw Alpha",
        maxHp: 1,
        hp: 0,
        hpPercent: 0,
        isLikelyBoss: false,
      },
      bossFight: null,
    });
    expect(relaxed.evaluate(trash, REF)).toBeNull();
  });

  it("never announces an abandoned pull", () => {
    expect(policy().evaluate(pull({ outcome: "incomplete" }), REF)).toBeNull();
  });

  // Restarting the bot must not re-announce a first kill from last week.
  it("respects seeded history after a restart", () => {
    const p = policy();
    p.seed("snv_dashroode", { attempts: 12, kills: 1, bestWipeHpPercent: 3 });
    const result = p.evaluate(pull(), REF);

    expect(result?.kind).toBe("kill");
    expect(result?.attempts).toBe(13);
  });
});

describe("buildAnnouncementEmbed", () => {
  it("links to the report for the fight, not the encounter", () => {
    const announcement = policy().evaluate(pull(), REF)!;
    const embed = buildAnnouncementEmbed(announcement, { webUrl: "https://infamous.gg" });

    expect(embed.url).toBe("https://infamous.gg/reports/ABC123/fights/3");
  });

  it("titles a first kill as a milestone", () => {
    const embed = buildAnnouncementEmbed(policy().evaluate(pull(), REF)!, { webUrl: "x" });

    expect(embed.title).toBe("First kill: Dash'Roode");
    expect(embed.description).toContain("first time");
    expect(embed.color).toBe(0xd4af37);
  });

  it("summarises mode, duration and composition", () => {
    const embed = buildAnnouncementEmbed(policy().evaluate(pull(), REF)!, { webUrl: "x" });
    const fields = Object.fromEntries(embed.fields.map((f) => [f.name, f.value]));

    expect(fields.Operation).toBe("Scum and Villainy");
    expect(fields.Mode).toBe("Veteran · 8-player");
    expect(fields.Duration).toBe("4:00");
    expect(fields.Composition).toBe("1 tank · 1 heal · 1 dps");
    expect(fields["Top damage"]).toContain("Valzler");
  });

  it("shows remaining health and the record it beat on a close wipe", () => {
    const p = policy();
    p.evaluate(wipe(40), REF);
    const embed = buildAnnouncementEmbed(p.evaluate(wipe(6.25), REF)!, { webUrl: "x" });
    const fields = Object.fromEntries(embed.fields.map((f) => [f.name, f.value]));

    expect(embed.title).toBe("So close: Dash'Roode");
    expect(fields["Boss remaining"]).toBe("6.3%");
    expect(fields["Previous best"]).toBe("40.0%");
  });

  it("handles a pull where nobody dealt damage", () => {
    const embed = buildAnnouncementEmbed(policy().evaluate(pull({ actors: [] }), REF)!, {
      webUrl: "x",
    });
    const fields = Object.fromEntries(embed.fields.map((f) => [f.name, f.value]));

    expect(fields["Top damage"]).toBe("—");
  });
});
