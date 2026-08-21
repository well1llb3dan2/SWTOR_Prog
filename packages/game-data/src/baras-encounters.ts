import { BARAS_ENCOUNTER_DEFINITIONS } from "./generated/baras-encounters.js";
import type { BarasEncounterDefinition } from "./types.js";

export { BARAS_ENCOUNTER_DEFINITIONS, BARAS_ENCOUNTER_DEFINITIONS_VERSION } from "./generated/baras-encounters.js";

export const BARAS_ENCOUNTER_DEFINITIONS_BY_ID = new Map(
  BARAS_ENCOUNTER_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const BY_BOSS_NPC_ID = new Map<string, BarasEncounterDefinition[]>();
for (const definition of BARAS_ENCOUNTER_DEFINITIONS) {
  for (const npcId of definition.bossNpcIds) {
    const matches = BY_BOSS_NPC_ID.get(npcId) ?? [];
    matches.push(definition);
    BY_BOSS_NPC_ID.set(npcId, matches);
  }
}

export function resolveBarasEncounterDefinition(npcIds: Iterable<string>): BarasEncounterDefinition | null {
  const scores = new Map<BarasEncounterDefinition, number>();
  for (const npcId of npcIds) {
    for (const definition of BY_BOSS_NPC_ID.get(npcId) ?? []) {
      scores.set(definition, (scores.get(definition) ?? 0) + 1);
    }
  }
  let best: BarasEncounterDefinition | null = null;
  let bestScore = 0;
  for (const [definition, score] of scores) {
    if (score > bestScore) {
      best = definition;
      bestScore = score;
    }
  }
  return best;
}