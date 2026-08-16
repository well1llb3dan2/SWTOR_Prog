import { ENCOUNTERS } from "./encounters.js";
import { encounterIdForNpcId } from "./observed.js";
import { OPERATIONS, OPERATIONS_BY_ID } from "./operations.js";
import type { Encounter, Operation } from "./types.js";

export interface EncounterQuery {
  zoneId?: string | null;
  zoneName?: string | null;
  /** Names of NPCs the raid actually engaged during the pull. */
  npcNames: Iterable<string>;
  /** Optional NPC ids; confirms a match when the id has been seen before. */
  npcIds?: Iterable<string>;
}

export interface EncounterMatch {
  encounter: Encounter;
  operation: Operation;
  /** Encounter boss names that were present in the pull. */
  matchedBosses: string[];
  /** Higher means a more confident match; used to pick between candidates. */
  score: number;
}

const normalise = (value: string): string => value.trim().toLowerCase();

function operationMatchesZone(
  operation: Operation,
  zoneId: string | null,
  zoneName: string | null,
): number {
  if (zoneId !== null && operation.zoneIds.includes(zoneId)) return 6;
  if (zoneName !== null && operation.zoneNames.includes(normalise(zoneName))) return 4;
  return 0;
}

/**
 * Identifies the encounter a pull belongs to.
 *
 * Matching keys on boss names plus the zone rather than NPC ids, because a
 * boss's numeric id changes between difficulties. The zone breaks ties where a
 * name is reused, such as the Mutated Geonosian Queen appearing in both the
 * Dxun operation and the Ossus lair.
 */
export function resolveEncounter(query: EncounterQuery): EncounterMatch | null {
  const present = new Set([...query.npcNames].map(normalise));
  if (present.size === 0) return null;

  const zoneId = query.zoneId ?? null;
  const zoneName = query.zoneName ?? null;

  const confirmed = new Set<string>();
  for (const npcId of query.npcIds ?? []) {
    const encounterId = encounterIdForNpcId(npcId);
    if (encounterId !== null) confirmed.add(encounterId);
  }

  let best: EncounterMatch | null = null;

  for (const encounter of ENCOUNTERS) {
    const matchedBosses = encounter.bossNames.filter((name) => present.has(name));
    if (matchedBosses.length === 0) continue;

    const operation = OPERATIONS_BY_ID.get(encounter.operationId)!;
    const score =
      matchedBosses.length * 2 +
      operationMatchesZone(operation, zoneId, zoneName) +
      (confirmed.has(encounter.id) ? 8 : 0);

    if (best === null || score > best.score) {
      best = { encounter, operation, matchedBosses, score };
    }
  }

  return best;
}

/** True once every target the encounter requires has died. */
export function isEncounterCleared(encounter: Encounter, deadNpcNames: Iterable<string>): boolean {
  const dead = new Set([...deadNpcNames].map(normalise));
  const required =
    encounter.victoryRequires.length > 0 ? encounter.victoryRequires : encounter.bossNames;

  return encounter.victoryRequires.length > 0
    ? required.every((name) => dead.has(name))
    : required.some((name) => dead.has(name));
}

export { ENCOUNTERS, OPERATIONS };
