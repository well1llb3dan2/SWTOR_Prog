import { isEncounterCleared, resolveEncounter } from "@swtor/game-data";
import type { CombatEvent, Difficulty, GroupSize, MagnitudeValue } from "@swtor/shared";
import {
  isNpc,
  isPlayer,
  type ActorRates,
  type ActorTotals,
  type BossInfo,
  type DeathRecord,
  type EncounterRef,
  type LivePullState,
  type MetricBucket,
  type PullOutcome,
  type PullSummary,
  type RosterEntry,
} from "./types.js";

export const BUCKET_MS = 10_000;

/**
 * Health actually applied to the target.
 *
 * The `~` token is the amount that landed after absorption and overheal; the
 * leading number is only the rolled magnitude. Where the client emits both,
 * the `~` value is the one that reconciles against observed health deltas.
 */
export function appliedAmount(value: MagnitudeValue): number {
  return value.effective ?? value.amount;
}

interface PullContext {
  zone: string | null;
  zoneId: string | null;
  difficulty: Difficulty | null;
  groupSize: GroupSize | null;
  roster: ReadonlyMap<string, RosterEntry>;
}

interface KillingBlow {
  ability: string | null;
  source: string | null;
}

export interface BossThreshold {
  /**
   * An NPC counts as a boss at this multiple of the beefiest player's health.
   *
   * Absolute health floors do not survive contact with real logs: they drift
   * with difficulty, group size and gear. In the sample operation the smallest
   * real boss is ~17x a player's health while the toughest trash is ~2.7x, so a
   * ratio separates them cleanly and keeps doing so as players out-gear content.
   */
  playerHealthMultiple: number;
  /** Used only when no player health has been observed yet. */
  absoluteFloor: number;
}

function emptyTotals(actorId: string, name: string): ActorTotals {
  return {
    actorId,
    name,
    role: null,
    discipline: null,
    damage: 0,
    healing: 0,
    overhealing: 0,
    damageTaken: 0,
    absorbed: 0,
    deaths: 0,
  };
}

/** Accumulates every metric for a single pull. */
export class PullAccumulator {
  readonly id: string;
  readonly index: number;
  readonly startedAt: number;

  #lastActivityAt: number;
  readonly #context: PullContext;
  readonly #totals = new Map<string, ActorTotals>();
  readonly #buckets = new Map<number, MetricBucket>();
  readonly #npcs = new Map<string, { name: string; maxHp: number; hp: number | null }>();
  readonly #engagedNpcIds = new Set<string>();
  readonly #engagedNpcNames = new Set<string>();
  readonly #deadNpcIds = new Set<string>();
  readonly #deadNpcNames = new Set<string>();
  readonly #deaths: DeathRecord[] = [];
  readonly #lastHitOnPlayer = new Map<string, KillingBlow>();
  readonly #participants = new Set<string>();
  readonly #bossThreshold: BossThreshold;
  #peakPlayerMaxHp = 0;

  constructor(
    id: string,
    index: number,
    startedAt: number,
    context: PullContext,
    bossThreshold: BossThreshold,
  ) {
    this.id = id;
    this.index = index;
    this.startedAt = startedAt;
    this.#lastActivityAt = startedAt;
    this.#context = context;
    this.#bossThreshold = bossThreshold;
  }

  get lastActivityAt(): number {
    return this.#lastActivityAt;
  }

  add(event: CombatEvent): void {
    this.#observeHealth(event);

    switch (event.type) {
      case "damage":
        this.#addDamage(
          event.timestamp,
          event.source,
          event.target,
          event.value,
          event.ability?.name ?? null,
        );
        this.#lastActivityAt = event.timestamp;
        break;

      case "heal":
        this.#addHealing(event.timestamp, event.source, event.value);
        this.#lastActivityAt = event.timestamp;
        break;

      case "death":
        this.#addDeath(event);
        this.#lastActivityAt = event.timestamp;
        break;

      default:
        break;
    }
  }

  #observeHealth(event: CombatEvent): void {
    for (const actor of [event.source, event.target]) {
      if (isPlayer(actor) && actor.maxHp !== null && actor.maxHp > this.#peakPlayerMaxHp) {
        this.#peakPlayerMaxHp = actor.maxHp;
      }
      if (!isNpc(actor) || actor.maxHp === null || actor.maxHp <= 0) continue;
      const existing = this.#npcs.get(actor.npcId);
      if (existing === undefined || actor.maxHp > existing.maxHp) {
        this.#npcs.set(actor.npcId, { name: actor.name, maxHp: actor.maxHp, hp: actor.hp });
      } else {
        existing.hp = actor.hp;
      }
    }
  }

  #totalsFor(id: string, name: string): ActorTotals {
    let totals = this.#totals.get(id);
    if (totals === undefined) {
      totals = emptyTotals(id, name);
      const roster = this.#context.roster.get(id);
      if (roster !== undefined) {
        totals.role = roster.role;
        totals.discipline = roster.discipline;
      }
      this.#totals.set(id, totals);
    }
    return totals;
  }

  #bucketFor(timestamp: number): MetricBucket {
    const index = Math.max(0, Math.floor((timestamp - this.startedAt) / BUCKET_MS));
    let bucket = this.#buckets.get(index);
    if (bucket === undefined) {
      bucket = {
        index,
        startedAt: this.startedAt + index * BUCKET_MS,
        damage: {},
        healing: {},
        damageTaken: {},
      };
      this.#buckets.set(index, bucket);
    }
    return bucket;
  }

  #addDamage(
    timestamp: number,
    source: CombatEvent["source"],
    target: CombatEvent["target"],
    value: MagnitudeValue,
    ability: string | null,
  ): void {
    const applied = appliedAmount(value);
    const bucket = this.#bucketFor(timestamp);

    if (isPlayer(source) && isNpc(target)) {
      this.#engagedNpcIds.add(target.npcId);
      this.#engagedNpcNames.add(target.name);
      this.#participants.add(source.playerId);
      const totals = this.#totalsFor(source.playerId, source.name);
      totals.damage += applied;
      bucket.damage[source.playerId] = (bucket.damage[source.playerId] ?? 0) + applied;
    }

    if (isPlayer(target)) {
      const totals = this.#totalsFor(target.playerId, target.name);
      totals.damageTaken += applied;
      totals.absorbed += value.absorbed ?? 0;
      bucket.damageTaken[target.playerId] = (bucket.damageTaken[target.playerId] ?? 0) + applied;
      this.#lastHitOnPlayer.set(target.playerId, {
        ability,
        source: source === null ? null : source.name,
      });
    }
  }

  #addHealing(timestamp: number, source: CombatEvent["source"], value: MagnitudeValue): void {
    if (!isPlayer(source)) return;

    const applied = appliedAmount(value);
    const overheal = Math.max(0, value.amount - applied);
    const totals = this.#totalsFor(source.playerId, source.name);
    totals.healing += applied;
    totals.overhealing += overheal;
    this.#participants.add(source.playerId);

    const bucket = this.#bucketFor(timestamp);
    bucket.healing[source.playerId] = (bucket.healing[source.playerId] ?? 0) + applied;
  }

  #addDeath(event: Extract<CombatEvent, { type: "death" }>): void {
    const victim = event.target;

    if (isNpc(victim)) {
      this.#deadNpcIds.add(victim.npcId);
      this.#deadNpcNames.add(victim.name);
      return;
    }
    if (!isPlayer(victim)) return;

    const totals = this.#totalsFor(victim.playerId, victim.name);
    totals.deaths += 1;

    const blow = this.#lastHitOnPlayer.get(victim.playerId);
    this.#deaths.push({
      playerId: victim.playerId,
      name: victim.name,
      timestamp: event.timestamp,
      offsetMs: event.timestamp - this.startedAt,
      killingBlowAbility: blow?.ability ?? null,
      killingBlowSource: blow?.source ?? null,
    });
  }

  /** Largest engaged NPC by max health; refined by a curated table later. */
  #boss(encounter: EncounterRef | null): BossInfo | null {
    const floor =
      this.#peakPlayerMaxHp > 0
        ? this.#peakPlayerMaxHp * this.#bossThreshold.playerHealthMultiple
        : this.#bossThreshold.absoluteFloor;

    let best: BossInfo | null = null;
    for (const npcId of this.#engagedNpcIds) {
      const npc = this.#npcs.get(npcId);
      if (npc === undefined) continue;
      if (best === null || npc.maxHp > best.maxHp) {
        best = {
          npcId,
          name: npc.name,
          maxHp: npc.maxHp,
          hp: npc.hp,
          hpPercent: npc.hp === null ? null : (npc.hp / npc.maxHp) * 100,
          // A catalogued encounter is authoritative; the ratio is only a guess.
          isLikelyBoss: encounter !== null || npc.maxHp >= floor,
        };
      }
    }
    return best;
  }

  #encounter(): EncounterRef | null {
    const match = resolveEncounter({
      zoneId: this.#context.zoneId,
      zoneName: this.#context.zone,
      npcNames: this.#engagedNpcNames,
      npcIds: this.#engagedNpcIds,
    });
    if (match === null) return null;

    return {
      encounterId: match.encounter.id,
      encounterName: match.encounter.name,
      operationId: match.operation.id,
      operationName: match.operation.name,
      isLair: match.operation.isLair,
      matchedBosses: match.matchedBosses,
      phases: match.encounter.phases,
      victoryEvent: match.encounter.victoryEvent,
      cleared: isEncounterCleared(match.encounter, this.#deadNpcNames),
    };
  }

  #rates(durationMs: number): ActorRates[] {
    const seconds = Math.max(durationMs, 1) / 1000;
    return [...this.#totals.values()]
      .map((totals) => ({
        ...totals,
        dps: totals.damage / seconds,
        hps: totals.healing / seconds,
        dtps: totals.damageTaken / seconds,
        overhealPercent:
          totals.healing + totals.overhealing === 0
            ? 0
            : (totals.overhealing / (totals.healing + totals.overhealing)) * 100,
      }))
      .sort((a, b) => b.damage - a.damage);
  }

  #outcome(boss: BossInfo | null, encounter: EncounterRef | null): PullOutcome {
    // A matched encounter knows exactly what has to die; multi-boss fights such
    // as the Cartel Warlords are not cleared by felling the biggest target.
    if (encounter !== null) {
      if (encounter.cleared) return "kill";
    } else if (boss !== null && this.#deadNpcIds.has(boss.npcId)) {
      return "kill";
    }

    const died = new Set(this.#deaths.map((d) => d.playerId));
    const everyoneDied =
      this.#participants.size > 0 && [...this.#participants].every((id) => died.has(id));
    if (everyoneDied) return "wipe";

    // A trash pull still counts as a kill when the enemies were cleared and the
    // raid did not fully wipe, even if no boss was identified for the pull.
    if (this.#deadNpcIds.size > 0) return "kill";

    return "incomplete";
  }

  #roster(): RosterEntry[] {
    return [...this.#context.roster.values()].filter(
      (entry) => this.#participants.has(entry.playerId) || this.#totals.has(entry.playerId),
    );
  }

  hasClearedAllEngagedNpcs(): boolean {
    return this.#engagedNpcIds.size > 0 && [...this.#engagedNpcIds].every((id) => this.#deadNpcIds.has(id));
  }

  finish(endedAt: number): PullSummary {
    const durationMs = Math.max(0, endedAt - this.startedAt);
    const encounter = this.#encounter();
    const boss = this.#boss(encounter);
    return {
      id: this.id,
      index: this.index,
      startedAt: this.startedAt,
      endedAt,
      durationMs,
      zone: this.#context.zone,
      difficulty: this.#context.difficulty,
      groupSize: this.#context.groupSize,
      boss,
      encounter,
      outcome: this.#outcome(boss, encounter),
      roster: this.#roster(),
      actors: this.#rates(durationMs),
      deaths: [...this.#deaths],
      buckets: [...this.#buckets.values()].sort((a, b) => a.index - b.index),
    };
  }

  live(now: number): LivePullState {
    const elapsedMs = Math.max(0, now - this.startedAt);
    const encounter = this.#encounter();
    return {
      id: this.id,
      index: this.index,
      startedAt: this.startedAt,
      elapsedMs,
      zone: this.#context.zone,
      difficulty: this.#context.difficulty,
      groupSize: this.#context.groupSize,
      boss: this.#boss(encounter),
      encounter,
      actors: this.#rates(elapsedMs),
      deaths: [...this.#deaths],
    };
  }
}
