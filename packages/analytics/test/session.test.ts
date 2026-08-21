import { describe, expect, it } from "vitest";
import { CombatSession, analyzeEvents } from "@swtor/analytics";
import { BARAS_OFF_GCD_ABILITY_IDS } from "@swtor/game-data";
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
const SOA = {
  kind: "npc",
  name: "Soa",
  npcId: "soa",
  instanceId: "soa-1",
  position: null,
  hp: 8_000_000,
  maxHp: 10_000_000,
} as const;
const PYlon = {
  kind: "npc",
  name: "Ancient Pylon Defense System",
  npcId: "pylon",
  instanceId: "pylon-1",
  position: null,
  hp: 1_000_000,
  maxHp: 1_000_000,
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
): Extract<CombatEvent, { type: "damage" }> => ({
  ...base(t),
  type: "damage",
  source,
  target,
  value: magnitude(amount),
});

const ability = (
  t: number,
  source: CombatEvent["source"],
  target: CombatEvent["target"],
  id: string,
  name: string,
): CombatEvent => ({
  ...base(t),
  type: "ability",
  source,
  target,
  ability: { id, name },
  phase: "activate",
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
  serverId: "he3000",
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

  it("closes once the engaged fight concludes", () => {
    const session = new CombatSession();
    session.push(areaEntered(0));
    session.push(damage(1_000, LOCAL, TRASH));
    session.push(damage(2_000, ALLY, TRASH));
    session.push(damage(5_000, LOCAL, TRASH));
    session.push(death(5_000, TRASH));
    session.end();

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

  it("captures critical, mitigation, absorption, threat, overkill, and damage type details", () => {
    const detailedDamage: CombatEvent = {
      ...base(1_000),
      type: "damage",
      source: LOCAL,
      target: { ...BOSS, hp: 50 },
      threat: 55,
      value: {
        ...magnitude(120, 80),
        critical: true,
        damageType: "energy",
        mitigation: "shield",
        absorbed: 40,
      },
    };
    const detailedPull = analyzeEvents([
      areaEntered(0),
      detailedDamage,
      death(5_000, BOSS),
    ])[0]!;
    const actor = detailedPull.actors.find((entry) => entry.actorId === LOCAL.playerId)!;
    const enemy = detailedPull.bossFight!.bossEntities[0]!;

    expect(actor).toMatchObject({
      criticalHits: 1,
      criticalDamage: 80,
      mitigatedDamage: 40,
      absorbed: 0,
      overkill: 30,
      threat: 55,
      damageByType: { energy: 80 },
      mitigationByType: { shield: 40 },
    });
    expect(enemy).toMatchObject({
      damageTaken: 80,
      absorbed: 40,
      criticalHits: 1,
      criticalDamage: 80,
      mitigatedDamage: 40,
      overkill: 30,
      threat: 55,
      damageByType: { energy: 80 },
      mitigationByType: { shield: 40 },
    });
    expect(enemy.players[0]).toMatchObject({ actorId: "1", damage: 80, dps: 80 / 4 });
  });

  it("counts ability activations separately from their damage hits", () => {
    const abilityRef = { id: "42", name: "Channeled Attack" };
    const secondTarget = { ...TRASH, npcId: "trash-2", instanceId: "trash-2" };
    const criticalHit: CombatEvent = {
      ...damage(3_000, LOCAL, BOSS, 200),
      ability: abilityRef,
      value: { ...magnitude(200), critical: true },
    };
    const pulls = analyzeEvents([
      areaEntered(0),
      ability(1_000, LOCAL, BOSS, abilityRef.id, abilityRef.name),
      { ...damage(2_000, LOCAL, BOSS, 100), ability: abilityRef },
      criticalHit,
      { ...damage(4_000, LOCAL, secondTarget, 300), ability: abilityRef },
      death(5_000, BOSS),
      death(6_000, secondTarget),
    ]);

    expect(pulls[0]!.bossFight!.abilities).toContainEqual(expect.objectContaining({
      abilityId: abilityRef.id,
      casts: 1,
      hits: 3,
      misses: 0,
      criticalHits: 1,
      targets: 2,
      damage: 600,
      players: [expect.objectContaining({ playerId: LOCAL.playerId, casts: 1, hits: 3, targets: 2, damage: 600 })],
      targetBreakdown: expect.arrayContaining([
        expect.objectContaining({ targetNpcId: BOSS.npcId, hits: 2, damage: 300 }),
        expect.objectContaining({ targetNpcId: secondTarget.npcId, hits: 1, damage: 300 }),
      ]),
      phases: [expect.objectContaining({ phaseOrder: 1, casts: 1, hits: 3, targets: 2, damage: 600 })],
    }));
  });

  it("computes APM and the on-GCD/off-GCD action split from activations", () => {
    const offGcdId = BARAS_OFF_GCD_ABILITY_IDS.values().next().value!;
    const pulls = analyzeEvents([
      areaEntered(0),
      ability(1_000, LOCAL, BOSS, offGcdId, "Off GCD"),
      ability(2_000, LOCAL, BOSS, "not-off-gcd", "On GCD"),
      damage(3_000, LOCAL, BOSS, 100),
      damage(5_000, LOCAL, BOSS, 100),
      death(6_000, BOSS),
    ]);
    const actor = pulls[0]!.actors.find((entry) => entry.actorId === LOCAL.playerId)!;

    expect(actor).toMatchObject({ actions: 2, offGcdActions: 1, onGcdActions: 1 });
    expect(actor.apm).toBeCloseTo(24, 5);
  });
});

describe("enemy timeline", () => {
  it("keeps character metrics scoped to the enemy they damaged", () => {
    const otherEnemy = { ...TRASH, instanceId: "3", npcId: "trash-2", name: "Other Mob" };
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, TRASH, 100),
      damage(2_000, ALLY, TRASH, 300),
      damage(3_000, LOCAL, otherEnemy, 500),
      death(5_000, TRASH),
      death(6_000, otherEnemy),
    ]);
    const timelines = pulls.flatMap((pull) => pull.enemyTimelines);
    const first = timelines.find((enemy) => enemy.name === "Trash Mob")!;
    const second = timelines.find((enemy) => enemy.name === "Other Mob")!;
    expect(first.players.map((player) => player.actorId)).toEqual(["1", "2"]);
    expect(second.players.map((player) => player.actorId)).toEqual(["1"]);
    expect(first.players.find((player) => player.actorId === "1")?.damage).toBe(100);
    expect(second.players[0]?.damage).toBe(500);
  });

  it("classifies catalogued standalone trash as mechanics", () => {
    const dustclaw = { ...TRASH, name: "Dustclaw Ravager", npcId: "dustclaw", instanceId: "dustclaw-1" };
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, dustclaw, 400),
      death(5_000, dustclaw),
    ]);
    const timeline = pulls[0]!.enemyTimelines.find((enemy) => enemy.name === "Dustclaw Ravager")!;
    expect(timeline.role).toBe("mechanic");
  });
});

describe("event-driven phase intervals", () => {
  it("starts and ends phases at observed HP transitions", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, { ...SOA, hp: 8_000_000 }, 1_000),
      damage(5_000, LOCAL, { ...SOA, hp: 7_400_000 }, 2_000),
      damage(9_000, LOCAL, { ...SOA, hp: 2_900_000 }, 3_000),
      death(12_000, SOA),
    ]);

    const phases = pulls[0]!.bossFight!.phases;
    expect(phases.map((phase) => phase.order)).toEqual([1, 2, 3]);
    expect(phases.map((phase) => phase.startedAt)).toEqual([1_000, 5_000, 9_000]);
    expect(phases.map((phase) => phase.endedAt)).toEqual([5_000, 9_000, 12_000]);
    expect(phases[1]!.triggerEvidence?.kind).toBe("phase-transition");
    expect(phases[2]!.triggerEvidence?.timestamp).toBe(9_000);
    expect(phases.map((phase) => phase.players[0]?.damage)).toEqual([1_000, 2_000, 3_000]);
    expect(phases.map((phase) => phase.players[0]?.activeMs)).toEqual([0, 0, 0]);
  });

  it("executes imported BARAS phases for a catalogued boss NPC id", () => {
    const titan = {
      ...BOSS,
      name: "Localized Titan",
      npcId: "3152463045591040",
      instanceId: "titan-1",
      maxHp: 10_000_000,
    };
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, { ...titan, hp: 10_000_000 }, 1_000),
      damage(5_000, LOCAL, { ...titan, hp: 1_900_000 }, 1_000),
      death(6_000, titan),
    ]);

    expect(pulls[0]!.encounter?.encounterId).toBe("snv_titan_6");
    expect(pulls[0]!.bossFight?.phases.map((phase) => phase.name)).toEqual(["Titan 6", "Burn"]);
    expect(pulls[0]!.bossFight?.phases.map((phase) => phase.startedAt)).toEqual([1_000, 5_000]);
  });
});

describe("encounter victory conditions", () => {
  it("completes a puzzle encounter from explicit victory evidence", () => {
    const puzzleVictory: CombatEvent = {
      ...base(5_000),
      type: "ability",
      source: LOCAL,
      target: PYlon,
      ability: { id: "puzzle", name: "Puzzle Solved / Four Rings Aligned" },
      phase: "activate",
    };
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, PYlon),
      puzzleVictory,
      damage(6_000, LOCAL, PYlon),
    ]);

    expect(pulls).toHaveLength(1);
    expect(pulls[0]!.outcome).toBe("kill");
    expect(pulls[0]!.bossFight?.terminalEvidence?.kind).toBe("victory-event");
    expect(pulls[0]!.bossFight?.bossEntities[0]?.diedAt).toBeNull();
  });
});

describe("wipes", () => {
  it("keeps a successful kill when a player dies during the encounter", () => {
    const pulls = analyzeEvents([
      areaEntered(0),
      damage(1_000, LOCAL, BOSS),
      damage(2_000, BOSS, LOCAL, 500_000),
      death(3_000, LOCAL),
      damage(4_000, ALLY, BOSS),
      death(5_000, BOSS),
    ]);

    expect(pulls[0]!.outcome).toBe("kill");
    expect(pulls[0]!.bossFight?.outcome).toBe("kill");
    expect(pulls[0]!.bossFight?.terminalEvidence?.kind).toBe("required-targets-dead");
  });

  it("reports a raid wipe even when the local player never dies", () => {
    const session = new CombatSession({ idleTimeoutMs: 10_000 });
    session.push(areaEntered(0));
    session.push(damage(1_000, LOCAL, BOSS));
    session.push(damage(2_000, ALLY, BOSS));
    session.push(damage(5_000, LOCAL, BOSS));
    session.push(death(6_000, ALLY));
    session.flush(16_001);

    expect(session.pulls[0]!.outcome).toBe("wipe");
    expect(session.pulls[0]!.deaths.map((entry) => entry.name)).toEqual(["Ally"]);
    expect(session.pulls[0]!.bossFight?.terminalEvidence?.kind).toBe("raid-wipe");
  });

  it("classifies sustained boss silence as an encounter reset", () => {
    const session = new CombatSession({ idleTimeoutMs: 10_000 });
    session.push(areaEntered(0));
    session.push(damage(1_000, LOCAL, BOSS));
    session.push(damage(5_000, LOCAL, BOSS));
    session.flush(16_001);

    expect(session.pulls[0]!.outcome).toBe("wipe");
    expect(session.pulls[0]!.deaths).toHaveLength(0);
    expect(session.pulls[0]!.bossFight?.terminalEvidence?.kind).toBe("encounter-reset");
  });

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
