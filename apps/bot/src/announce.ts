import type { BossFightSummary, PullSummary } from "@swtor/analytics";

export type AnnouncementKind = "firstKill" | "kill" | "closeWipe";

export interface PullRef {
  reportCode: string;
  fightId: number;
}

export interface Announcement extends PullRef {
  kind: AnnouncementKind;
  fight: BossFightSummary;
  sourcePull?: PullSummary;
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

  evaluate(input: PullSummary | BossFightSummary, ref: PullRef): Announcement | null {
    const fight = "bossFight" in input ? input.bossFight : input;
    if (fight === null) return null;
    if ("bossFight" in input && (input.encounter === null || input.outcome === "incomplete")) return null;
    const encounter = fight.encounter;
    if (this.#policy.bossesOnly && fight.bossEntities.length === 0) return null;
    if (fight.outcome === "incomplete") return null;

    const current = this.#progress.get(encounter.encounterId) ?? {
      attempts: 0,
      kills: 0,
      bestWipeHpPercent: null,
    };
    const previousBestHpPercent = current.bestWipeHpPercent;
    const attempts = current.attempts + 1;

    if (fight.outcome === "kill") {
      const kills = current.kills + 1;
      this.#progress.set(encounter.encounterId, { ...current, attempts, kills });
      return {
        kind: current.kills === 0 ? "firstKill" : "kill",
        fight,
        ...( "bossFight" in input ? { sourcePull: input } : {}),
        encounterId: encounter.encounterId,
        attempts,
        kills,
        previousBestHpPercent,
        ...ref,
      };
    }

    const boss = fight.bossEntities[0];
    const remaining = boss?.maxHp && boss.finalHp !== null ? (boss.finalHp / boss.maxHp) * 100 : null;
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
      fight,
      ...( "bossFight" in input ? { sourcePull: input } : {}),
      encounterId: encounter.encounterId,
      attempts,
      kills: current.kills,
      previousBestHpPercent,
      ...ref,
    };
  }
}
