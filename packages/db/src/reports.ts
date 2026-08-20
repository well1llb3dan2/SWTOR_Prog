import type { BossFightSummary } from "@swtor/analytics";
import type { BossFightDocument } from "./schema.js";

/** Strips the time series; buckets hold the raw events instead. */
export function toBossFightDocument(fight: BossFightSummary, fightId: number): BossFightDocument {
  return {
    fightId,
    ...fight,
    startedAt: new Date(fight.startedAt),
    endedAt: new Date(fight.endedAt),
  };
}

export interface ProgressionEntry {
  encounterId: string;
  encounterName: string;
  operationName: string;
  attempts: number;
  kills: number;
  firstKillAt: Date | null;
  bestWipeHpPercent: number | null;
}

/**
 * Rolls fights up into per-encounter progression.
 *
 * `bestWipeHpPercent` is the lowest boss health reached on a failed attempt,
 * which is the number a guild actually cares about while progressing. It comes
 * straight from the logged health values rather than any external table.
 */
export function summariseProgression(fights: readonly BossFightDocument[]): ProgressionEntry[] {
  const byEncounter = new Map<string, ProgressionEntry>();

  for (const fight of fights) {
    const encounter = fight.encounter;
    if (encounter === null) continue;

    let entry = byEncounter.get(encounter.encounterId);
    if (entry === undefined) {
      entry = {
        encounterId: encounter.encounterId,
        encounterName: encounter.encounterName,
        operationName: encounter.operationName,
        attempts: 0,
        kills: 0,
        firstKillAt: null,
        bestWipeHpPercent: null,
      };
      byEncounter.set(encounter.encounterId, entry);
    }

    entry.attempts += 1;

    if (fight.outcome === "kill") {
      entry.kills += 1;
      if (entry.firstKillAt === null || fight.startedAt < entry.firstKillAt) {
        entry.firstKillAt = fight.startedAt;
      }
      continue;
    }

    const boss = fight.bossEntities[0];
    const remaining = boss?.maxHp && boss.finalHp !== null
      ? (boss.finalHp / boss.maxHp) * 100
      : null;
    if (
      remaining !== null &&
      (entry.bestWipeHpPercent === null || remaining < entry.bestWipeHpPercent)
    ) {
      entry.bestWipeHpPercent = remaining;
    }
  }

  return [...byEncounter.values()];
}
