import { describe, expect, it } from "vitest";
import { EncounterRuntime, type EncounterRuntimeDefinition } from "@swtor/analytics";
import type { CombatEvent } from "@swtor/shared";

const PLAYER = { kind: "player", name: "Player", playerId: "player-1", position: null, hp: 100, maxHp: 100 } as const;
const BOSS = { kind: "npc", name: "Localized Boss", npcId: "1001", instanceId: "boss-1", position: { x: 10, y: 20, z: 5, facing: 0 }, hp: 100, maxHp: 100 } as const;

const base = (timestamp: number) => ({ timestamp, lineNumber: 1, source: BOSS, target: PLAYER, threat: null });

const definition: EncounterRuntimeDefinition = {
  encounterId: "test",
  bossNpcIds: [BOSS.npcId],
  counters: [{
    id: "casts",
    name: "Casts",
    incrementOn: { kind: "abilityCast", abilities: [{ id: "9001", name: "Canonical Cast" }], source: { kind: "boss" } },
  }],
  phases: [
    { id: "opening", order: 1, name: "Opening", style: "Opening", trigger: "Encounter start", startTrigger: { kind: "combatStart" } },
    { id: "burn", order: 2, name: "Burn", style: "Burn", trigger: "Third cast", startTrigger: { kind: "counterReaches", counterId: "casts", value: 3 }, resetsCounters: ["casts"] },
  ],
};

function cast(timestamp: number): CombatEvent {
  return {
    ...base(timestamp),
    type: "ability",
    ability: { id: "9001", name: "Localized Cast" },
    phase: "activate",
  };
}

describe("EncounterRuntime", () => {
  it("drives a counter and phase transition from authoritative ability IDs", () => {
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(definition);
    runtime.process(cast(2_000), PLAYER.playerId);
    runtime.process(cast(3_000), PLAYER.playerId);
    runtime.process(cast(4_000), PLAYER.playerId);

    expect(runtime.currentPhaseId).toBe("burn");
    expect(runtime.previousPhaseId).toBe("opening");
    expect(runtime.getCounter("casts")).toBe(0);
    expect(runtime.phaseSegments).toMatchObject([
      { phaseId: "opening", startedAt: 1_000, endedAt: 4_000 },
      { phaseId: "burn", startedAt: 4_000, endedAt: null },
    ]);
  });

  it("tracks active effects and the latest entity positions", () => {
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(definition);
    const applied: CombatEvent = {
      ...base(2_000),
      type: "applyEffect",
      ability: { id: "8", name: "Shield Cast" },
      effect: { id: "7", name: "Shield" },
      value: { kind: "charges", charges: 3 },
    };
    runtime.process(applied, PLAYER.playerId);

    expect(runtime.positions.get(BOSS.instanceId)).toEqual(BOSS.position);
    expect([...runtime.effects.values()]).toMatchObject([{ effectId: "7", targetId: PLAYER.playerId, charges: 3 }]);
    runtime.process({ ...applied, timestamp: 3_000, type: "removeEffect" }, PLAYER.playerId);
    expect(runtime.effects.size).toBe(0);
  });

  it("feeds phase endings and timer expirations back into the state machine", () => {
    const chained: EncounterRuntimeDefinition = {
      encounterId: "chained",
      bossNpcIds: [BOSS.npcId],
      counters: [{ id: "expired", name: "Expired", incrementOn: { kind: "timerExpires", timerId: "adds-window" } }],
      phases: [
        {
          id: "main", order: 1, name: "Main", style: "Main", trigger: "Combat start",
          startTrigger: { kind: "combatStart" },
          endTrigger: { kind: "abilityCast", abilities: [{ id: "9001" }] },
        },
        {
          id: "adds", order: 2, name: "Adds", style: "Adds", trigger: "Main ended",
          startTrigger: { kind: "phaseEnded", phaseId: "main" },
        },
        {
          id: "burn", order: 3, name: "Burn", style: "Burn", trigger: "Timer expired",
          startTrigger: { kind: "timerExpires", timerId: "adds-window" },
        },
      ],
      timers: [{
        id: "adds-window",
        name: "Adds Window",
        trigger: { kind: "phaseEntered", phaseId: "adds" },
        durationMs: 1_000,
        enabled: true,
        isAlert: false,
        canRefresh: false,
        conditions: [],
        phaseIds: [],
        difficulties: [],
      }],
    };
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(chained);
    runtime.process(cast(2_000), PLAYER.playerId);
    expect(runtime.currentPhaseId).toBe("adds");
    expect(runtime.timers.get("adds-window")?.expiresAt).toBe(3_000);

    runtime.process({ ...cast(3_001), ability: { id: "other", name: "Other" } }, PLAYER.playerId);
    expect(runtime.currentPhaseId).toBe("burn");
    expect(runtime.getCounter("expired")).toBe(1);
    expect(runtime.timers.has("adds-window")).toBe(false);
  });

  it("activates shields by effect ID and subtracts absorbed damage", () => {
    const shielded: EncounterRuntimeDefinition = {
      encounterId: "shielded",
      bossNpcIds: [BOSS.npcId],
      phases: definition.phases,
      counters: [],
      shields: [{
        id: "boss-shield",
        label: "Boss Shield",
        targetNpcIds: [BOSS.npcId],
        startTrigger: { kind: "effectApplied", effects: [{ id: "7001" }] },
        endTrigger: { kind: "effectRemoved", effects: [{ id: "7001" }] },
        hp: [{ total: 1_000, difficulties: ["Veteran"] }],
      }],
    };
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(shielded);
    const effectBase = { ...base(2_000), source: PLAYER, target: BOSS, ability: { id: "8", name: "Shield Cast" }, effect: { id: "7001", name: "Localized Shield" } };
    runtime.process({ ...effectBase, type: "applyEffect", value: null }, PLAYER.playerId);
    expect([...runtime.shields.values()][0]?.remaining).toBe(1_000);

    runtime.process({
      ...base(3_000),
      source: PLAYER,
      target: BOSS,
      type: "damage",
      ability: { id: "9", name: "Attack" },
      value: { kind: "magnitude", amount: 250, effective: 0, critical: false, damageType: "energy", mitigation: null, absorbed: 250, reflected: false },
    }, PLAYER.playerId);
    expect([...runtime.shields.values()][0]?.remaining).toBe(750);
  });

  it("attributes challenge values by phase, target, ability, and player", () => {
    const challenged: EncounterRuntimeDefinition = {
      encounterId: "challenged",
      bossNpcIds: [BOSS.npcId],
      entityNpcIds: { Boss: [BOSS.npcId] },
      phases: definition.phases,
      counters: [],
      challenges: [{
        id: "boss-damage",
        name: "Boss Damage",
        metric: "damage",
        enabled: true,
        difficulties: ["Veteran"],
        conditions: [
          { type: "phase", phase_ids: ["opening"] },
          { type: "target", match: { selector: [BOSS.npcId] } },
          { type: "ability", ability_ids: ["42"] },
        ],
      }],
    };
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(challenged);
    runtime.process({
      ...base(2_000),
      source: PLAYER,
      target: BOSS,
      type: "damage",
      ability: { id: "42", name: "Attack" },
      value: { kind: "magnitude", amount: 500, effective: 400, critical: false, damageType: "energy", mitigation: null, absorbed: 100, reflected: false },
    }, PLAYER.playerId);

    expect(runtime.challengeSnapshot(3_000)).toEqual([
      expect.objectContaining({
        id: "boss-damage",
        value: 500,
        eventCount: 1,
        durationMs: 2_000,
        players: [expect.objectContaining({ playerId: PLAYER.playerId, value: 500, percent: 100 })],
      }),
    ]);
  });

  it("includes an active effect stack window at its peak value", () => {
    const stacked: EncounterRuntimeDefinition = {
      encounterId: "stacked",
      bossNpcIds: [BOSS.npcId],
      phases: definition.phases,
      counters: [],
      challenges: [{
        id: "stacks",
        name: "Stacks",
        metric: "effect_stacks",
        enabled: true,
        difficulties: [],
        conditions: [
          { type: "target", match: "any_player" },
          { type: "effect", effect_ids: ["7001"] },
        ],
      }],
    };
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(stacked);
    const effectEvent = {
      ...base(2_000),
      effect: { id: "7001", name: "Stacks" },
      ability: null,
    };
    runtime.process({ ...effectEvent, type: "applyEffect", value: { kind: "charges", charges: 2 } }, PLAYER.playerId);
    runtime.process({ ...effectEvent, timestamp: 3_000, type: "modifyCharges", charges: 4 }, PLAYER.playerId);

    expect(runtime.challengeSnapshot(4_000)[0]).toMatchObject({
      value: 4,
      eventCount: 1,
      players: [{ playerId: PLAYER.playerId, value: 4, percent: 100 }],
    });
  });

  it("uses counter-scoped active time for challenge rates", () => {
    const scoped: EncounterRuntimeDefinition = {
      encounterId: "scoped",
      bossNpcIds: [BOSS.npcId],
      phases: definition.phases,
      counters: [{ id: "active", name: "Active", incrementOn: { kind: "abilityCast", abilities: [{ id: "9001" }] } }],
      challenges: [{
        id: "scoped-damage",
        name: "Scoped Damage",
        metric: "damage",
        enabled: true,
        difficulties: [],
        conditions: [{ type: "counter", counter_id: "active", operator: "gte", value: 1 }],
      }],
    };
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(scoped);
    runtime.process(cast(2_000), PLAYER.playerId);
    runtime.process({
      ...base(3_000),
      source: PLAYER,
      target: BOSS,
      type: "damage",
      ability: { id: "42", name: "Attack" },
      value: { kind: "magnitude", amount: 300, effective: 300, critical: false, damageType: "energy", mitigation: null, absorbed: 0, reflected: false },
    }, PLAYER.playerId);

    expect(runtime.challengeSnapshot(5_000)[0]).toMatchObject({ value: 300, durationMs: 3_000, perSecond: 100 });
  });

  it("drives counter triggers from tracked effect stacks", () => {
    const tracked: EncounterRuntimeDefinition = {
      encounterId: "tracked-stacks",
      bossNpcIds: [BOSS.npcId],
      phases: definition.phases,
      counters: [{ id: "stacks", name: "Stacks", trackEffectStacks: { effects: ["7001"], target: "local_player" } }],
      timers: [{
        id: "at-four",
        name: "At Four",
        trigger: { kind: "counterReaches", counterId: "stacks", value: 4 },
        durationMs: 5_000,
        enabled: true,
        isAlert: false,
        canRefresh: false,
        conditions: [],
        phaseIds: [],
        difficulties: [],
      }],
    };
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind(tracked);
    const effectEvent = { ...base(2_000), effect: { id: "7001", name: "Stacks" }, ability: null };
    runtime.process({ ...effectEvent, type: "applyEffect", value: { kind: "charges", charges: 2 } }, PLAYER.playerId);
    runtime.process({ ...effectEvent, timestamp: 3_000, type: "modifyCharges", charges: 4 }, PLAYER.playerId);

    expect(runtime.getCounter("stacks")).toBe(4);
    expect(runtime.timers.has("at-four")).toBe(true);
  });

  it("records terminal victory from an imported trigger", () => {
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind({
      ...definition,
      encounterId: "victory",
      victoryTrigger: { kind: "abilityCast", abilities: [{ id: "9001" }] },
    });
    runtime.process(cast(2_000), PLAYER.playerId);

    expect(runtime.terminal).toMatchObject({ outcome: "victory", timestamp: 2_000 });
  });

  it("resolves a self-targeted activation through the player's current target", () => {
    const runtime = new EncounterRuntime(1_000, "Veteran");
    runtime.bind({
      encounterId: "current-target",
      bossNpcIds: [BOSS.npcId],
      counters: [],
      phases: [
        { id: "opening", order: 1, name: "Opening", style: "Opening", trigger: "Start", startTrigger: { kind: "combatStart" } },
        {
          id: "targeted", order: 2, name: "Targeted", style: "Targeted", trigger: "Cast on current target",
          startTrigger: { kind: "abilityCast", abilities: [{ id: "9001" }], target: { kind: "currentTarget" } },
        },
      ],
    });
    runtime.process({ ...base(1_500), type: "target", source: PLAYER, target: BOSS, ability: null, state: "set" }, PLAYER.playerId);
    runtime.process({ ...base(2_000), type: "ability", source: PLAYER, target: PLAYER, ability: { id: "9001", name: "Cast" }, phase: "activate" }, PLAYER.playerId);

    expect(runtime.currentPhaseId).toBe("targeted");
  });
});