import type {
  ActorRates,
  BossInfo,
  DeathRecord,
  EncounterRef,
  RosterEntry,
} from "@swtor/analytics";
import type { CombatEvent, Difficulty, GroupSize, RosterLimits, Signup } from "@swtor/shared";

/**
 * Every document carries `guildId`.
 *
 * Tenancy is cheap to include now and expensive to retrofit: adding it later
 * means backfilling and re-indexing the largest collection in the system.
 */
export interface Tenanted {
  guildId: string;
}

/** A single uploaded logging session; the container reports are shared by. */
export interface ReportDocument extends Tenanted {
  /** Short URL-safe identifier used in report links. */
  code: string;
  ownerUserId: string | null;
  /** Filename the desktop client streamed from. */
  logFileName: string;
  startedAt: Date;
  endedAt: Date | null;
  zone: string | null;
  zoneId: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  roster: RosterEntry[];
  fights: FightSummaryDocument[];
  createdAt: Date;
  updatedAt: Date;
}

/** Fight metadata. Raw events live in bucket documents, never here. */
export interface FightSummaryDocument {
  fightId: number;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  zone: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  boss: BossInfo | null;
  encounter: EncounterRef | null;
  outcome: "kill" | "wipe" | "incomplete";
  actors: ActorRates[];
  deaths: DeathRecord[];
}

/**
 * Bucket-pattern storage for raw combat events.
 *
 * Events are grouped into fixed time slices so a busy fight becomes tens of
 * documents rather than hundreds of thousands, which keeps index overhead flat.
 * `part` exists because a 10-second slice of an eight-player operation can
 * approach the 16MB document ceiling on its own; overflow rolls into part 1, 2
 * and so on rather than failing the write.
 */
export interface FightEventBucketDocument extends Tenanted {
  reportCode: string;
  fightId: number;
  bucketIndex: number;
  part: number;
  startedAt: Date;
  endedAt: Date;
  eventCount: number;
  events: CombatEvent[];
  /** Set when a retention window is configured; drives the TTL index. */
  expiresAt: Date | null;
}

export type { RosterLimits, Signup, SignupStatus } from "@swtor/shared";

/** Scheduled operation, kept in sync between the portal and Discord. */
export interface OperationEventDocument extends Tenanted {
  /** Stable id used in portal URLs and Discord custom ids. */
  code: string;
  title: string;
  description: string | null;
  encounterId: string | null;
  operationId: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  limits: RosterLimits;
  /** Absolute instant; the portal renders it in the guild's server timezone. */
  scheduledFor: Date;
  createdByUserId: string;
  /** Set once the bot has posted, so button clicks can find the message. */
  discordChannelId: string | null;
  discordMessageId: string | null;
  signups: Signup[];
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const COLLECTIONS = {
  reports: "reports",
  fightEventBuckets: "fightEventBuckets",
  operationEvents: "operationEvents",
} as const;
