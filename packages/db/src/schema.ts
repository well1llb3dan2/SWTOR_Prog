import type { BossFightSummary, RosterEntry } from "@swtor/analytics";
import type { CombatEvent } from "@swtor/shared";
import type { Difficulty, GroupSize, RosterLimits, Signup } from "@swtor/shared";

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
  fights: BossFightDocument[];
  createdAt: Date;
  updatedAt: Date;
}

/** Date-normalized authoritative boss-fight document. */
export interface BossFightDocument extends Omit<BossFightSummary, "startedAt" | "endedAt"> {
  fightId: number;
  startedAt: Date;
  endedAt: Date;
}

/** Normalized fight document; one document per completed pull. */
export interface NormalizedFightDocument extends BossFightDocument, Tenanted {
  reportCode: string;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Bounded raw-event bucket retained independently from report summaries. */
export interface FightEventBucketDocument extends Tenanted {
  reportCode: string;
  fightId: number;
  eventId: string;
  bucketIndex: number;
  part: number;
  startedAt: Date;
  endedAt: Date;
  eventCount: number;
  events: CombatEvent[];
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
  reportFights: "reportFights",
  fightEventBuckets: "fightEventBuckets",
  operationEvents: "operationEvents",
} as const;
