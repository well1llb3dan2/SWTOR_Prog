import { describe, expect, it } from "vitest";
import { CombatSession, analyzeEvents } from "@swtor/analytics";
import type { CombatEvent, MagnitudeValue } from "@swtor/shared";

const LOCAL = {
  kind: "player",
  name: "Local",
  playerId: "1",
  position: null,
  hp: 100,
  maxHp: 100,
} as const;
const ALLY = {
  kind: "player",
  name: "Ally",
  playerId: "2",
  position: null,
  hp: 100,
  maxHp: 100,
} as const;
const BOSS = {
  kind: "npc",
  name: "Dash'Roode",
  npcId: "boss",
  instanceId: "1",
  position: null,
  hp: 5_000_000,
  maxHp: 21_829_804,
} as const;
const TRASH = {
  kind: "npc",
  name: "Trash Mob",
  npcId: "trash",
  instanceId: "2",
  position: null,
  hp: 4_000,
  maxHp: 4_000,
} as const;

function magnitude(amount: number, effective = amount): MagnitudeValue {
  return {
    kind: "magnitude",
    amount,
    effective,
    critical: false,
    damageType: "energy",
    mitigation: null,
    absorbed: null,
    reflected: false,
  };
}

const base = (timestamp: number) => ({
  timestamp,
  lineNumber: 0,
  source: null,
  target: null,
  ability: null,
  threat: null,
});

const damage = (
  t: number,
  source: CombatEvent["source"],
  target: CombatEvent["target"],
  amount = 1000,
): CombatEvent => ({
  ...base(t),
  type: "damage",
  source,
  target,
  value: magnitude(amount),
});

const heal = (
  t: number,
  source: CombatEvent["source"],
  amount: number,
  effective: number,
): CombatEvent => ({
  ...base(t),
  type: "heal",
  source,
  target: source,
  value: magnitude(amount, effective),
});

const death = (t: number, victim: CombatEvent["target"]): CombatEvent => ({
  ...base(t),
  type: "death",
  target: victim,
  revived: false,
});

const combatState = (t: number, state: "enter" | "exit"): CombatEvent => ({
  ...base(t),
  type: "combatState",
  source: LOCAL,
  state,
});

const areaEntered = (t: number): CombatEvent => ({
  ...base(t),
  type: "areaEntered",
  source: LOCAL,
  zone: { name: "Darvannis", id: "137438993037" },
  groupSize: 8,
  difficulty: "Veteran",
  logVersion: "v7.0.0b",
});

const discipline = (t: number, player: typeof LOCAL | typeof ALLY, name: string): CombatEvent => ({
  ...base(t),
  type: "disciplineChanged",
  source: player,
  advancedClass: { name: "Guardian", id: "1" },
  discipline: { name, id: "2" },
  role: name === "Defense" ? "tank" : name === "Seer" ? "healer" : "dps",
});

describe("fight boundaries", () => {
  it("keeps a pull open when the logging player leaves combat but the raid fights on", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      combatState(1_000, "enter"),
      damage(2_000, LOCAL, BOSS),
      combatState(3_000, "exit"),
      // The local player is out, but their allies are still swinging.
      damage(4_000, ALLY, BOSS),
      damage(9_000, ALLY, BOSS),
      damage(14_000, ALLY, BOSS),
      death(15_000, BOSS),
    ]);

    expect(pulls).toHaveLength(1);
    expect(pulls[0]!.outcome).toBe("kill");
    expect(pulls[0]!.durationMs).toBe(14_000);
  });

  it("closes shortly after the logging player exits when nothing else happens", () => {
    const session = new CombatSession();
    session.push(areaEntered(0));
    session.push(combatState(1_000, "enter"));
    session.push(damage(2_000, LOCAL, BOSS));
    session.push(damage(6_000, LOCAL, BOSS));
    session.push(combatState(6_500, "exit"));

    // Still inside the exit grace window.
    session.flush(8_000);
    expect(session.current(8_000)).not.toBeNull();

    session.flush(9_000);
    expect(session.current(9_000)).toBeNull();
    expect(session.pulls).toHaveLength(1);
  });

  it("closes on idle silence even when no exit event is ever emitted", () => {
    const session = new CombatSession();
    session.push(areaEntered(0));
    session.push(damage(1_000, LOCAL, BOSS));
    session.push(damage(6_000, LOCAL, BOSS));

    session.flush(13_000);
    expect(session.current(13_000)).not.toBeNull();

    session.flush(14_001);
    expect(session.pulls).toHaveLength(1);
    expect(session.pulls[0]!.durationMs).toBe(5_000);
  });

  it("closes immediately once the last engaged enemy dies", () => {
    const session = new CombatSession();
    session.push(areaEntered(0));
    session.push(damage(1_000, LOCAL, TRASH));
    session.push(damage(2_000, ALLY, TRASH));
    session.push(damage(5_000, LOCAL, TRASH));
    session.push(death(5_000, TRASH));

    expect(session.current(5_000)).toBeNull();
    expect(session.pulls).toHaveLength(1);
    expect(session.pulls[0]!.outcome).toBe("kill");
  });

  it("splits two pulls separated by a long gap", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, BOSS),
      damage(6_000, LOCAL, BOSS),
      damage(60_000, LOCAL, BOSS),
      damage(66_000, LOCAL, BOSS),
    ]);

    expect(pulls).toHaveLength(2);
    expect(pulls[0]!.startedAt).toBe(1_000);
    expect(pulls[1]!.startedAt).toBe(60_000);
  });

  it("ends a pull when the player zones out", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, BOSS),
      damage(6_000, LOCAL, BOSS),
      areaEntered(7_000),
    ]);

    expect(pulls).toHaveLength(1);
    expect(pulls[0]!.endedAt).toBe(6_000);
  });

  it("discards trivial activity that never becomes a real pull", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, BOSS),
      damage(1_500, LOCAL, BOSS),
    ]);
    expect(pulls).toEqual([]);
  });
});

describe("pull metrics", () => {
  const pulls = analyzeEvents([
    areaEntered(0),
    discipline(500, LOCAL, "Defense"),
    discipline(500, ALLY, "Seer"),
    combatState(1_000, "enter"),
    damage(1_000, LOCAL, BOSS, 10_000),
    damage(5_000, LOCAL, BOSS, 10_000),
    heal(5_000, ALLY, 4_000, 1_000),
    damage(9_000, BOSS, LOCAL, 3_000),
    damage(11_000, LOCAL, BOSS, 10_000),
    death(11_000, BOSS),
  ]);

  const pull = pulls[0]!;

  it("identifies the boss by health and records the kill", () => {
    expect(pull.boss).toMatchObject({ name: "Dash'Roode", isLikelyBoss: true });
    expect(pull.outcome).toBe("kill");
  });

  it("carries zone, difficulty and group size onto the pull", () => {
    expect(pull).toMatchObject({ zone: "Darvannis", difficulty: "Veteran", groupSize: 8 });
  });

  it("computes rates over the pull duration", () => {
    const local = pull.actors.find((a) => a.actorId === "1")!;
    expect(local.damage).toBe(30_000);
    expect(local.damageTaken).toBe(3_000);
    expect(local.dps).toBeCloseTo(3_000, 5);
    expect(local.role).toBe("tank");
  });

  it("counts the unhealed portion of a heal as overhealing", () => {
    const ally = pull.actors.find((a) => a.actorId === "2")!;
    expect(ally.healing).toBe(1_000);
    expect(ally.overhealing).toBe(3_000);
    expect(ally.overhealPercent).toBeCloseTo(75, 5);
  });

  it("buckets the time series into ten-second slices", () => {
    expect(pull.buckets.map((b) => b.index)).toEqual([0, 1]);
    expect(pull.buckets[0]!.damage["1"]).toBe(20_000);
    expect(pull.buckets[1]!.damage["1"]).toBe(10_000);
  });
});

describe("wipes", () => {
  it("reports a wipe when every participant dies and the boss lives", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, BOSS),
      damage(2_000, ALLY, BOSS),
      damage(3_000, BOSS, LOCAL, 500_000),
      death(4_000, LOCAL),
      death(5_000, ALLY),
    ]);

    expect(pulls[0]!.outcome).toBe("wipe");
    expect(pulls[0]!.deaths.map((d) => d.name)).toEqual(["Local", "Ally"]);
  });

  it("treats a clearing kill as a kill even when the target is trash", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, TRASH),
      damage(2_000, ALLY, TRASH),
      damage(5_000, LOCAL, TRASH),
      death(5_000, TRASH),
    ]);

    expect(pulls[0]!.outcome).toBe("kill");
  });

  it("attributes the killing blow to the last hit taken", () => {
    const killingHit: CombatEvent = {
      ...base(3_000),
      type: "damage",
      source: BOSS,
      target: LOCAL,
      ability: { name: "Sand Blast", id: "9" },
      value: magnitude(500_000),
    };

    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, BOSS),
      killingHit,
      death(4_000, LOCAL),
      damage(5_000, ALLY, BOSS),
    ]);

    expect(pulls[0]!.deaths[0]).toMatchObject({
      name: "Local",
      killingBlowAbility: "Sand Blast",
      killingBlowSource: "Dash'Roode",
      offsetMs: 3_000,
    });
  });
});
