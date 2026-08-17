import type {
  ActorRates,
  BossInfo,
  DeathRecord,
  EncounterRef,
  RosterEntry,
} from "@swtor/analytics";
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
  fights: FightSummaryDocument[];
  createdAt: Date;
  updatedAt: Date;
}

/** Fight metadata persisted for reporting and progression views. */
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
  operationEvents: "operationEvents",
} as const;
