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

export type EncounterEntityRole = "boss" | "mechanic" | "unknown";

export interface PhaseEvidenceQuery {
  bossHpPercent?: number | null;
  abilityName?: string | null;
  effectName?: string | null;
}

const normalise = (value: string): string => value.trim().toLowerCase();

function phaseThreshold(trigger: string): number | null {
  const values = [...trigger.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
  return values.length > 0 ? Math.max(...values) : null;
}

/** Classifies only entities explicitly known by the matched encounter. */
export function classifyEncounterEntity(encounter: Encounter, name: string): EncounterEntityRole {
  const value = normalise(name);
  if (encounter.bossNames.some((candidate) => normalise(candidate) === value)) return "boss";
  if (encounter.adds.some((candidate) => normalise(candidate) === value || value.includes(normalise(candidate)))) return "mechanic";
  return "unknown";
}

/**
 * Classifies against the full catalog when no specific encounter has been
 * resolved yet (for example, standalone trash timeline rows).
 */
export function classifyCatalogEntity(name: string): EncounterEntityRole {
  const value = normalise(name);
  let boss = false;
  let mechanic = false;

  for (const encounter of ENCOUNTERS) {
    if (!boss && encounter.bossNames.some((candidate) => normalise(candidate) === value)) boss = true;
    if (!mechanic && encounter.adds.some((candidate) => normalise(candidate) === value || value.includes(normalise(candidate)))) mechanic = true;
    if (boss && mechanic) break;
  }

  if (mechanic) return "mechanic";
  if (boss) return "boss";
  return "unknown";
}

/** Resolves the highest phase supported by observed HP or named combat evidence. */
export function resolveEncounterPhase(encounter: Encounter, query: PhaseEvidenceQuery): number {
  if (encounter.phases.length === 0) return 1;
  const evidenceText = normalise(`${query.abilityName ?? ""} ${query.effectName ?? ""}`);
  let resolved = encounter.phases[0]!.order;
  for (const phase of encounter.phases) {
    const threshold = phaseThreshold(phase.trigger);
    if (query.bossHpPercent !== null && query.bossHpPercent !== undefined && threshold !== null && query.bossHpPercent <= threshold) {
      resolved = Math.max(resolved, phase.order);
    }
    const phaseName = normalise(phase.name);
    if (evidenceText.length > 0 && (evidenceText.includes(phaseName) || evidenceText.includes(`phase ${phase.order}`))) {
      resolved = Math.max(resolved, phase.order);
    }
  }
  return resolved;
}

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
export function isEncounterCleared(
  encounter: Encounter,
  deadNpcNames: Iterable<string>,
  victoryEvidenceObserved = false,
): boolean {
  if (victoryEvidenceObserved) return true;
  const dead = new Set([...deadNpcNames].map(normalise));
  const required =
    encounter.victoryRequires.length > 0 ? encounter.victoryRequires : encounter.bossNames;

  return encounter.victoryRequires.length > 0
    ? required.every((name) => dead.has(name))
    : required.some((name) => dead.has(name));
}

export { ENCOUNTERS, OPERATIONS };
