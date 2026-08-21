import type { CounterDefinition, EncounterPhase } from "@swtor/game-data";
import type { Actor, Difficulty, GroupSize, Role } from "@swtor/shared";

/** The catalogued encounter a pull was matched to, if any. */
export interface EncounterRef {
  encounterId: string;
  encounterName: string;
  operationId: string;
  operationName: string;
  isLair: boolean;
  /** Canonical encounter order within the operation. */
  order?: number;
  /** Encounter bosses actually engaged during this pull. */
  matchedBosses: string[];
  /** Catalogued mechanic/add names belonging to the encounter. */
  adds?: string[];
  phases: EncounterPhase[];
  victoryEvent: string;
  /** Every required target died. */
  cleared: boolean;
  /** Verified boss NPC class ids, when the catalog has them; preferred over name matching. */
  bossNpcIds?: string[];
  /** Verified mechanic/add NPC class ids, when the catalog has them; preferred over name matching. */
  addNpcIds?: string[];
  /** Lowercased boss names eligible for single-instance reset detection. */
  singleInstanceBossNames?: string[];
  /** Mechanic counters tracked for this encounter. */
  counters?: CounterDefinition[];
  catalogSource?: string;
  catalogVersion?: string;
}

export interface RosterEntry {
  playerId: string;
  serverId?: string | null;
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
  combatStyle?: string | null;
  damage: number;
  healing: number;
  /** Raw healing minus effective healing. */
  overhealing: number;
  damageTaken: number;
  absorbed: number;
  criticalHits?: number;
  criticalDamage?: number;
  mitigatedDamage?: number;
  overkill?: number;
  threat?: number;
  damageByType?: Record<string, number>;
  mitigationByType?: Record<string, number>;
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

export type PullOutcome = "kill" | "wipe" | "incomplete" | "reset";

/** The terminal state of a boss fight, based on encounter evidence. */
export type BossFightOutcome = PullOutcome;

export type TerminalEvidenceKind =
  | "boss-death"
  | "phase-transition"
  | "required-targets-dead"
  | "victory-event"
  | "raid-wipe"
  | "encounter-reset"
  | "sustained-silence"
  | "stream-ended";

export interface TerminalEvidence {
  kind: TerminalEvidenceKind;
  timestamp: number;
  /** Human-readable detail retained for diagnostics and report explanations. */
  detail: string;
  actorIds: string[];
  npcIds: string[];
}

export interface InterruptRecord {
  timestamp: number;
  abilityId: string;
  abilityName: string;
  sourceId: string | null;
  sourceName: string | null;
  targetNpcId: string | null;
  targetName: string | null;
}

export type EnemyRole = "boss" | "mechanic" | "unknown";

export interface EnemyTimeline {
  /** Stable instance key when the log provides one; otherwise the best available key. */
  instanceId: string;
  npcId: string;
  name: string;
  /** Original localized name emitted by the combat log, when it differs from name. */
  rawName?: string;
  identitySource?: "catalog" | "log";
  role: EnemyRole;
  firstSeenAt: number;
  engagedAt: number | null;
  lastSeenAt: number;
  diedAt: number | null;
  maxHp: number | null;
  finalHp: number | null;
  damageTaken: number;
  damageDealt: number;
  absorbed?: number;
  criticalHits?: number;
  criticalDamage?: number;
  mitigatedDamage?: number;
  overkill?: number;
  threat?: number;
  damageByType?: Record<string, number>;
  mitigationByType?: Record<string, number>;
  deaths: number;
  phases: number[];
  /** Metrics for characters who damaged this specific enemy. */
  players: EnemyPlayerMetrics[];
}

export interface EnemyPlayerMetrics extends ActorRates {
  firstDamageAt: number;
  lastDamageAt: number;
  activeMs: number;
}

export interface PlayerPhaseMetrics extends ActorRates {
  phaseOrder: number;
  activeMs: number;
  firstActionAt: number | null;
  lastActionAt: number | null;
}

export interface BossPhaseSummary {
  order: number;
  name: string;
  style: string;
  trigger: string;
  startedAt: number;
  endedAt: number | null;
  triggerEvidence: TerminalEvidence | null;
  enemies: EnemyTimeline[];
  players: PlayerPhaseMetrics[];
}

/** Boss-centric record that replaces the flat pull view for progression reporting. */
export interface BossFightSummary {
  id: string;
  index: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  zone: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  encounter: EncounterRef;
  bossEntities: EnemyTimeline[];
  mechanicEntities: EnemyTimeline[];
  unknownEntities: EnemyTimeline[];
  phases: BossPhaseSummary[];
  players: ActorRates[];
  deaths: DeathRecord[];
  outcome: BossFightOutcome;
  terminalEvidence: TerminalEvidence | null;
  buckets: MetricBucket[];
  /** Final mechanic counter values tracked for this encounter (empty when none defined). */
  counters: Record<string, number>;
  interrupts: InterruptRecord[];
  catalogSource?: string;
  catalogVersion?: string;
}

export interface LiveBossFightSnapshot {
  id: string;
  index: number;
  startedAt: number;
  elapsedMs: number;
  zone: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  encounter: EncounterRef;
  bossEntities: EnemyTimeline[];
  mechanicEntities: EnemyTimeline[];
  unknownEntities: EnemyTimeline[];
  phases: BossPhaseSummary[];
  players: ActorRates[];
}

/** Ordered operation container used by progression and intelligence views. */
export interface OperationFightSummary {
  operationId: string;
  operationName: string;
  fights: BossFightSummary[];
}

export interface TrashEncounterSummary {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  zone: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  enemy: EnemyTimeline;
  outcome: PullOutcome;
}

export type CombatTimelineEntry =
  | { kind: "boss"; startedAt: number; endedAt: number; fight: BossFightSummary }
  | { kind: "trash"; startedAt: number; endedAt: number; fight: TrashEncounterSummary };

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
  /** Authoritative boss-centric representation of this pull, when catalogued. */
  bossFight: BossFightSummary | null;
  enemyTimelines: EnemyTimeline[];
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
  bossFight: LiveBossFightSnapshot | null;
}

export function isPlayer(actor: Actor | null): actor is Extract<Actor, { kind: "player" }> {
  return actor !== null && actor.kind === "player";
}

export function isNpc(actor: Actor | null): actor is Extract<Actor, { kind: "npc" }> {
  return actor !== null && actor.kind === "npc";
}
