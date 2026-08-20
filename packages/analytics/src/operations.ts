import type { BossFightSummary, OperationFightSummary, PullSummary } from "./types.js";

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