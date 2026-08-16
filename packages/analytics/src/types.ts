import type { EncounterPhase } from "@swtor/game-data";
import type { Actor, Difficulty, GroupSize, Role } from "@swtor/shared";

/** The catalogued encounter a pull was matched to, if any. */
export interface EncounterRef {
  encounterId: string;
  encounterName: string;
  operationId: string;
  operationName: string;
  isLair: boolean;
  /** Encounter bosses actually engaged during this pull. */
  matchedBosses: string[];
  phases: EncounterPhase[];
  victoryEvent: string;
  /** Every required target died. */
  cleared: boolean;
}

export interface RosterEntry {
  playerId: string;
  name: string;
  advancedClass: string | null;
  discipline: string | null;
  role: Role | null;
}

export interface BossInfo {
  npcId: string;
  name: string;
  maxHp: number;
  hp: number | null;
  /** Remaining health as a percentage, derived from the log's health fields. */
  hpPercent: number | null;
  /** False for trash: the largest NPC in the pull was below the boss health floor. */
  isLikelyBoss: boolean;
}

export interface DeathRecord {
  playerId: string;
  name: string;
  timestamp: number;
  /** Milliseconds into the pull. */
  offsetMs: number;
  killingBlowAbility: string | null;
  killingBlowSource: string | null;
}

export interface ActorTotals {
  actorId: string;
  name: string;
  role: Role | null;
  discipline: string | null;
  damage: number;
  healing: number;
  /** Raw healing minus effective healing. */
  overhealing: number;
  damageTaken: number;
  absorbed: number;
  deaths: number;
}

export interface ActorRates extends ActorTotals {
  dps: number;
  hps: number;
  dtps: number;
  overhealPercent: number;
}

/** Fixed-width time series slice; mirrors the storage bucket used downstream. */
export interface MetricBucket {
  index: number;
  startedAt: number;
  damage: Record<string, number>;
  healing: Record<string, number>;
  damageTaken: Record<string, number>;
}

export type PullOutcome = "kill" | "wipe" | "incomplete";

export interface PullSummary {
  id: string;
  index: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  zone: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  boss: BossInfo | null;
  encounter: EncounterRef | null;
  outcome: PullOutcome;
  roster: RosterEntry[];
  actors: ActorRates[];
  deaths: DeathRecord[];
  buckets: MetricBucket[];
}

export interface LivePullState {
  id: string;
  index: number;
  startedAt: number;
  elapsedMs: number;
  zone: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  boss: BossInfo | null;
  encounter: EncounterRef | null;
  actors: ActorRates[];
  deaths: DeathRecord[];
}

export function isPlayer(actor: Actor | null): actor is Extract<Actor, { kind: "player" }> {
  return actor !== null && actor.kind === "player";
}

export function isNpc(actor: Actor | null): actor is Extract<Actor, { kind: "npc" }> {
  return actor !== null && actor.kind === "npc";
}
