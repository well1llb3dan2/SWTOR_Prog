/**
 * Detects a boss "reset" — a re-pull that neither killed nor wiped the raid,
 * modelled on BARAS's `detect_boss_reset`: a new instance of a single-instance
 * boss NPC appears while a different live instance of the same NPC id is
 * still tracked (e.g. the boss room resets and the fight starts over).
 */

export interface TrackedEnemyInstance {
  npcId: string;
  instanceId: string;
  diedAt: number | null;
}

export function detectSingleInstanceReset(
  existing: Iterable<TrackedEnemyInstance>,
  candidate: { npcId: string; instanceId: string; name: string },
  singleInstanceBossNames: readonly string[],
): boolean {
  if (singleInstanceBossNames.length === 0) return false;
  const name = candidate.name.toLowerCase();
  if (!singleInstanceBossNames.some((bossName) => bossName.toLowerCase() === name)) return false;

  for (const enemy of existing) {
    if (enemy.npcId === candidate.npcId && enemy.instanceId !== candidate.instanceId && enemy.diedAt === null) {
      return true;
    }
  }
  return false;
}
