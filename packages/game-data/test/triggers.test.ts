import { describe, expect, it } from "vitest";
import { matchesEncounterTrigger, type EncounterTrigger, type TriggerEntity, type TriggerSignal } from "@swtor/game-data";

const PLAYER: TriggerEntity = {
  kind: "player",
  id: "player-1",
  npcId: null,
  name: "Player",
  position: { x: 10, y: 20, z: 5, facing: 0 },
};

const BOSS: TriggerEntity = {
  kind: "npc",
  id: "boss-instance",
  npcId: "1234567890123",
  name: "Localized Boss Name",
  position: { x: 15, y: 20, z: 5, facing: 0 },
};

const abilitySignal: TriggerSignal = {
  kind: "abilityCast",
  source: BOSS,
  target: PLAYER,
  ability: { id: "9001", name: "Localized Ability" },
  localPlayerId: PLAYER.id,
  isBossNpcId: (npcId) => npcId === BOSS.npcId,
};

describe("matchesEncounterTrigger", () => {
  it("uses a selector ID authoritatively when its diagnostic name disagrees", () => {
    const trigger: EncounterTrigger = {
      kind: "abilityCast",
      abilities: [{ id: "9001", name: "Canonical Ability" }],
      source: { kind: "boss" },
      target: { kind: "localPlayer" },
    };
    expect(matchesEncounterTrigger(trigger, abilitySignal)).toBe(true);
    expect(matchesEncounterTrigger({ ...trigger, abilities: [{ id: "9002", name: "Localized Ability" }] }, abilitySignal)).toBe(false);
  });

  it("requires every position constraint to match", () => {
    const trigger: EncounterTrigger = {
      kind: "abilityCast",
      abilities: [{ id: "9001" }],
      position: [
        { entity: "source", axis: "x", operator: "gte", value: 15 },
        { entity: "target", axis: "y", operator: "lt", value: 21 },
      ],
    };
    expect(matchesEncounterTrigger(trigger, abilitySignal)).toBe(true);
    expect(matchesEncounterTrigger({ ...trigger, position: [{ entity: "source", axis: "x", operator: "gt", value: 15 }] }, abilitySignal)).toBe(false);
  });

  it("matches HP crossings, deaths, and composite alternatives by NPC ID", () => {
    const trigger: EncounterTrigger = {
      kind: "anyOf",
      conditions: [
        { kind: "bossHpBelow", percent: 50, selector: [{ id: BOSS.npcId! }] },
        { kind: "entityDeath", selector: [{ id: BOSS.npcId! }] },
      ],
    };
    expect(matchesEncounterTrigger(trigger, { kind: "bossHp", entity: BOSS, bossHpPercent: 49.9 })).toBe(true);
    expect(matchesEncounterTrigger(trigger, { kind: "entityDeath", entity: BOSS })).toBe(true);
    expect(matchesEncounterTrigger(trigger, { kind: "bossHp", entity: BOSS, bossHpPercent: 50.1 })).toBe(false);
  });

  it("fires counter and elapsed-time thresholds only when crossed", () => {
    expect(matchesEncounterTrigger(
      { kind: "counterReaches", counterId: "cores", value: 3 },
      { kind: "counterChanged", counterId: "cores", previousCounterValue: 2, counterValue: 3 },
    )).toBe(true);
    expect(matchesEncounterTrigger(
      { kind: "counterReaches", counterId: "cores", value: 3 },
      { kind: "counterChanged", counterId: "cores", previousCounterValue: 3, counterValue: 3 },
    )).toBe(false);
    expect(matchesEncounterTrigger(
      { kind: "timeElapsed", seconds: 10 },
      { kind: "timeElapsed", previousElapsedMs: 9_999, elapsedMs: 10_000 },
    )).toBe(true);
  });
});