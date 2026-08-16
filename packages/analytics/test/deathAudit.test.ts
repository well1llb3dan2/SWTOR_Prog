import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUDIT_WINDOW_MS,
  buildDeathAudit,
  buildFightDeathAudits,
  findPlayerDeaths,
} from "@swtor/analytics";
import { LogParser } from "@swtor/parser";
import type { CombatEvent, MagnitudeValue } from "@swtor/shared";

const FILE = "combat_2026-08-15_22_48_11_971003.txt";

const player = (hp: number, maxHp = 400_000) =>
  ({
    kind: "player",
    name: "Valzler",
    playerId: "689933590972198",
    position: null,
    hp,
    maxHp,
  }) as const;

const boss = {
  kind: "npc",
  name: "Dash'Roode",
  npcId: "boss",
  instanceId: "1",
  position: null,
  hp: 1_000,
  maxHp: 1_000,
} as const;

const healer = {
  kind: "player",
  name: "Zephyr",
  playerId: "690575234566326",
  position: null,
  hp: 100,
  maxHp: 100,
} as const;

const magnitude = (amount: number, effective = amount): MagnitudeValue => ({
  kind: "magnitude",
  amount,
  effective,
  critical: false,
  damageType: "kinetic",
  mitigation: null,
  absorbed: null,
  reflected: false,
});

const base = (timestamp: number) => ({
  timestamp,
  lineNumber: 0,
  source: null,
  target: null,
  ability: null,
  threat: null,
});

const hit = (t: number, amount: number, hp: number, ability = "Sand Blast"): CombatEvent => ({
  ...base(t),
  type: "damage",
  source: boss,
  target: player(hp),
  ability: { name: ability, id: "9" },
  value: magnitude(amount),
});

const heal = (t: number, amount: number, hp: number): CombatEvent => ({
  ...base(t),
  type: "heal",
  source: healer,
  target: player(hp),
  ability: { name: "Healing Trance", id: "8" },
  value: magnitude(amount),
});

const defensive = (t: number, name: string, id: string, end = false): CombatEvent =>
  end
    ? {
        ...base(t),
        type: "removeEffect",
        source: player(100_000),
        target: player(100_000),
        effect: { name, id },
      }
    : {
        ...base(t),
        type: "applyEffect",
        source: player(100_000),
        target: player(100_000),
        effect: { name, id },
        value: null,
      };

const death = (t: number): CombatEvent => ({
  ...base(t),
  type: "death",
  source: boss,
  target: player(0),
  revived: false,
});

const DIED_AT = 100_000;
const moment = { playerId: "689933590972198", name: "Valzler", timestamp: DIED_AT };

describe("findPlayerDeaths", () => {
  it("ignores NPC deaths", () => {
    const npcDeath: CombatEvent = { ...base(1), type: "death", target: boss, revived: false };
    expect(findPlayerDeaths([npcDeath, death(DIED_AT)])).toEqual([moment]);
  });
});

describe("buildDeathAudit", () => {
  const events = [
    hit(DIED_AT - 30_000, 50_000, 350_000, "Ignored, outside window"),
    defensive(DIED_AT - 9_000, "Saber Ward", "807793154064384"),
    hit(DIED_AT - 8_000, 40_000, 310_000),
    heal(DIED_AT - 6_000, 30_000, 340_000),
    defensive(DIED_AT - 4_000, "Saber Ward", "807793154064384", true),
    hit(DIED_AT - 2_000, 120_000, 220_000),
    hit(DIED_AT - 500, 220_000, 0, "Sandstorm"),
    death(DIED_AT),
  ];

  const audit = buildDeathAudit(events, moment);

  it("only covers the configured window", () => {
    expect(audit.windowMs).toBe(DEFAULT_AUDIT_WINDOW_MS);
    expect(audit.entries.some((e) => e.ability === "Ignored, outside window")).toBe(false);
  });

  it("totals damage taken and healing received", () => {
    expect(audit.damageTaken).toBe(380_000);
    expect(audit.healingReceived).toBe(30_000);
    expect(audit.largestHit).toBe(220_000);
  });

  it("names the killing blow and its source", () => {
    expect(audit.killingBlow).toEqual({
      ability: "Sandstorm",
      source: "Dash'Roode",
      amount: 220_000,
    });
  });

  // The point of the audit: was a cooldown actually up when they died?
  it("separates defensives that were used from those still active at death", () => {
    expect(audit.defensivesUsed).toEqual(["Saber Ward"]);
    expect(audit.defensivesActive).toEqual([]);
  });

  it("keeps a defensive active when it was never removed", () => {
    const stillUp = buildDeathAudit(
      [defensive(DIED_AT - 3_000, "Force Barrier", "3120895035965440"), death(DIED_AT)],
      moment,
    );
    expect(stillUp.defensivesActive).toEqual(["Force Barrier"]);
  });

  it("orders the timeline and ends on the death", () => {
    expect(audit.entries.at(-1)!.kind).toBe("death");
    const offsets = audit.entries.map((e) => e.offsetMs);
    expect([...offsets].sort((a, b) => b - a)).toEqual(offsets);
  });

  it("records health as the log reported it", () => {
    const killing = audit.entries.find((e) => e.ability === "Sandstorm")!;
    expect(killing.hp).toBe(0);
    expect(killing.hpPercent).toBe(0);
  });

  it("counts an external cooldown cast by someone else", () => {
    const guarded = buildDeathAudit(
      [
        {
          ...base(DIED_AT - 5_000),
          type: "applyEffect",
          source: healer,
          target: player(200_000),
          effect: { name: "Guard", id: "1775934617157632" },
          value: null,
        },
        death(DIED_AT),
      ],
      moment,
    );
    expect(guarded.defensivesUsed).toEqual(["Guard"]);
    expect(guarded.entries[0]!.defensiveCategory).toBe("external");
  });

  it("ignores effects that are not defensives", () => {
    const noise = buildDeathAudit(
      [defensive(DIED_AT - 1_000, "Force Might", "4502809353388032"), death(DIED_AT)],
      moment,
    );
    expect(noise.defensivesUsed).toEqual([]);
  });
});

describe("real operation deaths", () => {
  const path = fileURLToPath(new URL(`../../../samples/combat-logs/${FILE}`, import.meta.url));
  const events = new LogParser({ fileName: FILE }).pushAll(
    readFileSync(path, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/),
  );

  it("audits every death in the operation", () => {
    const audits = buildFightDeathAudits(events);
    expect(audits.length).toBeGreaterThan(20);
    expect(audits.every((a) => a.name.length > 0)).toBe(true);
  });

  it("attributes a killing blow for most deaths", () => {
    const audits = buildFightDeathAudits(events);
    const attributed = audits.filter((a) => a.killingBlow !== null);
    expect(attributed.length / audits.length).toBeGreaterThan(0.5);
  });

  it("finds defensives in use before real deaths", () => {
    const audits = buildFightDeathAudits(events);
    expect(audits.some((a) => a.defensivesUsed.length > 0)).toBe(true);
  });

  it("records damage taken before each death", () => {
    const audits = buildFightDeathAudits(events).filter((a) => a.killingBlow !== null);
    expect(audits.every((a) => a.damageTaken > 0)).toBe(true);
  });
});
