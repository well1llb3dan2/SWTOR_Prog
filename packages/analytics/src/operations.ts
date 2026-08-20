import type { BossFightSummary, CombatTimelineEntry, OperationFightSummary, PullSummary, TrashEncounterSummary } from "./types.js";

export function buildCombatTimeline(pulls: Iterable<PullSummary>): CombatTimelineEntry[] {
  const entries: CombatTimelineEntry[] = [];
  for (const pull of pulls) {
    if (pull.bossFight !== null) {
      entries.push({ kind: "boss", startedAt: pull.bossFight.startedAt, endedAt: pull.bossFight.endedAt, fight: pull.bossFight });
      continue;
    }
    for (const enemy of pull.enemyTimelines.filter((candidate) => candidate.players.length > 0)) {
      const fight: TrashEncounterSummary = {
        id: `${pull.id}:${enemy.instanceId}`,
        startedAt: enemy.engagedAt ?? enemy.firstSeenAt,
        endedAt: enemy.diedAt ?? pull.endedAt,
        durationMs: Math.max(0, (enemy.diedAt ?? pull.endedAt) - (enemy.engagedAt ?? enemy.firstSeenAt)),
        zone: pull.zone,
        difficulty: pull.difficulty,
        groupSize: pull.groupSize,
        enemy,
        outcome: enemy.diedAt === null ? pull.outcome : "kill",
      };
      entries.push({ kind: "trash", startedAt: fight.startedAt, endedAt: fight.endedAt, fight });
    }
  }
  return entries.sort((a, b) => a.startedAt - b.startedAt || a.endedAt - b.endedAt);
}

/**
 * Groups only catalogued boss fights into their operation's canonical order.
 * Trash pulls and unmatched combat never enter progression containers.
 */
export function groupBossFightsByOperation(
  pulls: Iterable<PullSummary>,
): OperationFightSummary[] {
  const groups = new Map<string, OperationFightSummary>();

  for (const pull of pulls) {
    const fight = pull.bossFight;
    if (fight === null || fight.encounter === null) continue;

    const operationId = fight.encounter.operationId;
    let group = groups.get(operationId);
    if (group === undefined) {
      group = {
        operationId,
        operationName: fight.encounter.operationName,
        fights: [],
      };
      groups.set(operationId, group);
    }
    group.fights.push(fight);
  }

  const orderFight = (left: BossFightSummary, right: BossFightSummary): number =>
    (left.encounter.order ?? Number.MAX_SAFE_INTEGER) -
      (right.encounter.order ?? Number.MAX_SAFE_INTEGER) ||
    left.startedAt - right.startedAt ||
    left.index - right.index;

  return [...groups.values()]
    .map((group) => ({ ...group, fights: [...group.fights].sort(orderFight) }))
    .sort((left, right) => {
      const leftStarted = left.fights[0]?.startedAt ?? Number.MAX_SAFE_INTEGER;
      const rightStarted = right.fights[0]?.startedAt ?? Number.MAX_SAFE_INTEGER;
      return leftStarted - rightStarted || left.operationName.localeCompare(right.operationName);
    });
}