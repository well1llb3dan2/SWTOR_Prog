import type { GroupSize, Role } from "./types.js";

export type SignupStatus = "tank" | "healer" | "dps" | "bench" | "declined";

export interface Signup {
  discordUserId: string;
  displayName: string;
  characterName: string | null;
  status: SignupStatus;
  respondedAt: number;
}

export interface RosterLimits {
  tanks: number;
  healers: number;
  dps: number;
}

/** Standard operation compositions. */
export function defaultLimits(groupSize: GroupSize | null): RosterLimits {
  switch (groupSize) {
    case 16:
      return { tanks: 4, healers: 4, dps: 8 };
    case 4:
      return { tanks: 1, healers: 1, dps: 2 };
    default:
      return { tanks: 2, healers: 2, dps: 4 };
  }
}

export interface RosterGroup {
  role: Role;
  confirmed: Signup[];
  /** Signed up for this role but past the limit; first come, first served. */
  waitlisted: Signup[];
  limit: number;
}

export interface RosterSummary {
  tanks: RosterGroup;
  healers: RosterGroup;
  dps: RosterGroup;
  bench: Signup[];
  declined: Signup[];
  confirmedCount: number;
  totalSlots: number;
  isFull: boolean;
  /** Slots still open per role, for "needs 1 healer" messaging. */
  openSlots: RosterLimits;
}

const STATUS_TO_ROLE: Record<string, Role> = {
  tank: "tank",
  healer: "healer",
  dps: "dps",
};

/**
 * Splits signups into confirmed and waitlisted places.
 *
 * Ordering is by response time so a raider who signed up first keeps their
 * slot when someone else picks the same role — the alternative, silently
 * bumping people, is how signup tools lose trust.
 */
export function summariseRoster(signups: readonly Signup[], limits: RosterLimits): RosterSummary {
  const ordered = [...signups].sort((a, b) => a.respondedAt - b.respondedAt);

  const group = (status: SignupStatus, limit: number): RosterGroup => {
    const matching = ordered.filter((signup) => signup.status === status);
    return {
      role: STATUS_TO_ROLE[status]!,
      confirmed: matching.slice(0, limit),
      waitlisted: matching.slice(limit),
      limit,
    };
  };

  const tanks = group("tank", limits.tanks);
  const healers = group("healer", limits.healers);
  const dps = group("dps", limits.dps);

  const confirmedCount = tanks.confirmed.length + healers.confirmed.length + dps.confirmed.length;
  const totalSlots = limits.tanks + limits.healers + limits.dps;

  return {
    tanks,
    healers,
    dps,
    bench: ordered.filter((s) => s.status === "bench"),
    declined: ordered.filter((s) => s.status === "declined"),
    confirmedCount,
    totalSlots,
    isFull: confirmedCount >= totalSlots,
    openSlots: {
      tanks: Math.max(0, limits.tanks - tanks.confirmed.length),
      healers: Math.max(0, limits.healers - healers.confirmed.length),
      dps: Math.max(0, limits.dps - dps.confirmed.length),
    },
  };
}

/** Short human summary such as "needs 1 tank, 2 dps". */
export function describeOpenSlots(summary: RosterSummary): string {
  if (summary.isFull) return "Full";

  const parts: string[] = [];
  if (summary.openSlots.tanks > 0) parts.push(`${summary.openSlots.tanks} tank`);
  if (summary.openSlots.healers > 0) parts.push(`${summary.openSlots.healers} heal`);
  if (summary.openSlots.dps > 0) parts.push(`${summary.openSlots.dps} dps`);
  return parts.length === 0 ? "Full" : `Needs ${parts.join(", ")}`;
}
