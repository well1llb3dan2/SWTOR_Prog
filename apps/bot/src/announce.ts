import type { PullSummary } from "@swtor/analytics";

export type AnnouncementKind = "firstKill" | "kill" | "closeWipe";

export interface PullRef {
  reportCode: string;
  fightId: number;
}

export interface Announcement extends PullRef {
  kind: AnnouncementKind;
  pull: PullSummary;
  encounterId: string;
  /** Attempts on this encounter including the one being announced. */
  attempts: number;
  kills: number;
  /** Best wipe health before this pull, for "beat our record" messaging. */
  previousBestHpPercent: number | null;
}

export interface AnnouncePolicy {
  closeWipePercent: number;
  bossesOnly: boolean;
}

interface EncounterProgress {
  attempts: number;
  kills: number;
  bestWipeHpPercent: number | null;
}

/**
 * Decides which pulls are worth posting to Discord.
 *
 * A raid night is mostly trash and repeated wipes, so announcing everything
 * makes the channel unreadable and the genuine milestones invisible. Kills
 * always post; wipes only when they beat the guild's best attempt and finish
 * inside the close threshold.
 */
export class AnnouncementPolicy {
  readonly #policy: AnnouncePolicy;
  readonly #progress = new Map<string, EncounterProgress>();

  constructor(policy: AnnouncePolicy) {
    this.#policy = policy;
  }

  progressFor(encounterId: string): EncounterProgress | undefined {
    return this.#progress.get(encounterId);
  }

  /** Seeds history so a restart does not re-announce an old first kill. */
  seed(encounterId: string, progress: EncounterProgress): void {
    this.#progress.set(encounterId, progress);
  }

  evaluate(pull: PullSummary, ref: PullRef): Announcement | null {
    const encounter = pull.encounter;
    if (encounter === null) return null;
    if (this.#policy.bossesOnly && pull.boss?.isLikelyBoss !== true) return null;
    if (pull.outcome === "incomplete") return null;

    const current = this.#progress.get(encounter.encounterId) ?? {
      attempts: 0,
      kills: 0,
      bestWipeHpPercent: null,
    };
    const previousBestHpPercent = current.bestWipeHpPercent;
    const attempts = current.attempts + 1;

    if (pull.outcome === "kill") {
      const kills = current.kills + 1;
      this.#progress.set(encounter.encounterId, { ...current, attempts, kills });
      return {
        kind: current.kills === 0 ? "firstKill" : "kill",
        pull,
        encounterId: encounter.encounterId,
        attempts,
        kills,
        previousBestHpPercent,
        ...ref,
      };
    }

    const remaining = pull.boss?.hpPercent ?? null;
    const improved =
      remaining !== null && (previousBestHpPercent === null || remaining < previousBestHpPercent);

    this.#progress.set(encounter.encounterId, {
      attempts,
      kills: current.kills,
      bestWipeHpPercent: improved ? remaining : previousBestHpPercent,
    });

    if (!improved || remaining > this.#policy.closeWipePercent) return null;

    return {
      kind: "closeWipe",
      pull,
      encounterId: encounter.encounterId,
      attempts,
      kills: current.kills,
      previousBestHpPercent,
      ...ref,
    };
  }
}
