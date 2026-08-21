import { BARAS_ATTACK_TYPES_BY_ID, BARAS_INTERRUPT_ABILITY_IDS, canonicalNpcName, classifyCatalogEntity, classifyEncounterEntity, isEncounterCleared, NPC_CATALOG_SOURCE, NPC_CATALOG_VERSION, resolveEncounter, resolveEncounterPhase, type ConditionContext } from "@swtor/game-data";
import { combatStyleForDiscipline, type CombatEvent, type Difficulty, type GroupSize, type MagnitudeValue } from "@swtor/shared";
import { detectSingleInstanceReset } from "./reset.js";
import {
  isNpc,
  isPlayer,
  type ActorRates,
  type ActorTotals,
  type BossInfo,
  type BossFightSummary,
  type BossPhaseSummary,
  type DeathRecord,
  type EnemyTimeline,
  type EnemyPlayerMetrics,
  type EncounterRef,
  type InterruptRecord,
    type AbilityUsageSummary,
  type LivePullState,
  type LiveBossFightSnapshot,
  type MetricBucket,
  type PlayerPhaseMetrics,
  type PullOutcome,
  type PullSummary,
  type RosterEntry,
  type TerminalEvidence,
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
  localPlayerId: string | null;
}

export type PullEndReason = "sustained-silence" | "stream-ended";

interface KillingBlow {
  ability: string | null;
  source: string | null;
}

interface EnemyState {
  instanceId: string;
  npcId: string;
  name: string;
  rawName: string;
  identitySource: "catalog" | "log";
  firstSeenAt: number;
  engagedAt: number | null;
  lastSeenAt: number;
  diedAt: number | null;
  maxHp: number | null;
  finalHp: number | null;
  damageTaken: number;
  damageDealt: number;
  absorbed: number;
  criticalHits: number;
  criticalDamage: number;
  mitigatedDamage: number;
  overkill: number;
  threat: number;
  damageByType: Record<string, number>;
  mitigationByType: Record<string, number>;
  deaths: number;
  phases: number[];
  players: Map<string, EnemyPlayerState>;
}

interface EnemyPlayerState {
  totals: ActorTotals;
  firstDamageAt: number;
  lastDamageAt: number;
  phaseTotals: Map<number, PhaseActorState>;
}

interface PhaseActorState {
  totals: ActorTotals;
  firstActionAt: number;
  lastActionAt: number;
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
    combatStyle: null,
    damage: 0,
    healing: 0,
    overhealing: 0,
    damageTaken: 0,
    absorbed: 0,
    criticalHits: 0,
    criticalDamage: 0,
    mitigatedDamage: 0,
    overkill: 0,
    threat: 0,
    damageByType: {},
    mitigationByType: {},
    deaths: 0,
  };
}

function increment(map: Record<string, number>, key: string | null, amount: number): void {
  if (key === null || amount === 0) return;
  map[key] = (map[key] ?? 0) + amount;
}

/** Accumulates every metric for a single pull. */
export class PullAccumulator {
  readonly id: string;
  readonly index: number;
  readonly startedAt: number;

  #lastActivityAt: number;
  readonly #context: PullContext;
  readonly #totals = new Map<string, ActorTotals>();
  readonly #phaseTotals = new Map<number, Map<string, PhaseActorState>>();
  readonly #buckets = new Map<number, MetricBucket>();
  readonly #npcs = new Map<string, { name: string; maxHp: number; hp: number | null }>();
  readonly #enemies = new Map<string, EnemyState>();
  readonly #phaseStartedAt = new Map<number, number>();
  readonly #phaseEvidence = new Map<number, TerminalEvidence>();
  #victoryEvidence: TerminalEvidence | null = null;
  readonly #engagedNpcIds = new Set<string>();
  readonly #engagedNpcNames = new Set<string>();
  readonly #deadNpcIds = new Set<string>();
  readonly #deadNpcNames = new Set<string>();
  readonly #deaths: DeathRecord[] = [];
  readonly #interrupts: InterruptRecord[] = [];
  readonly #abilities = new Map<string, AbilityUsageSummary>();
  readonly #lastHitOnPlayer = new Map<string, KillingBlow>();
  readonly #participants = new Set<string>();
  readonly #bossThreshold: BossThreshold;
  #currentPhaseOrder = 1;
  #peakPlayerMaxHp = 0;
  readonly #counters = new Map<string, number>();
  #resetDetectedAt: number | null = null;

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

  /** Increments a mechanic counter (created at 0 on first use) and returns the new value. */
  incrementCounter(counterId: string): number {
    const next = (this.#counters.get(counterId) ?? 0) + 1;
    this.#counters.set(counterId, next);
    return next;
  }

  /** Decrements a mechanic counter, floored at 0, and returns the new value. */
  decrementCounter(counterId: string): number {
    const next = Math.max(0, (this.#counters.get(counterId) ?? 0) - 1);
    this.#counters.set(counterId, next);
    return next;
  }

  /** Resets a mechanic counter to a specific value (0 by default). */
  resetCounter(counterId: string, value = 0): void {
    this.#counters.set(counterId, value);
  }

  /** Current value of a mechanic counter (0 if never touched). */
  getCounter(counterId: string): number {
    return this.#counters.get(counterId) ?? 0;
  }

  #conditionContext(): ConditionContext {
    return {
      getCounter: (counterId: string) => this.getCounter(counterId),
      currentPhaseOrder: this.#currentPhaseOrder,
    };
  }

  /** Increments any encounter-defined counters whose ability/effect trigger matched this event. */
  #observeCounters(abilityName: string | null, effectName: string | null): void {
    const encounter = this.#encounter();
    const counters = encounter?.counters;
    if (counters === undefined || counters.length === 0) return;
    for (const def of counters) {
      const abilityMatch = def.incrementOnAbility !== undefined
        && abilityName !== null
        && abilityName.toLowerCase().includes(def.incrementOnAbility.toLowerCase());
      const effectMatch = def.incrementOnEffect !== undefined
        && effectName !== null
        && effectName.toLowerCase().includes(def.incrementOnEffect.toLowerCase());
      if (abilityMatch || effectMatch) this.incrementCounter(def.id);
    }
  }

  add(event: CombatEvent): void {
    this.#observeHealth(event);
    this.#observeVictoryEvent(event);

    switch (event.type) {
      case "damage":
        this.#observePhase(event.timestamp, event.target, event.ability?.name ?? null, null);
        this.#observeCounters(event.ability?.name ?? null, null);
        this.#addDamage(
          event.timestamp,
          event.source,
          event.target,
          event.value,
          event.ability,
          event.threat,
        );
        this.#observePhase(event.timestamp, event.target, event.ability?.name ?? null, null);
        this.#lastActivityAt = event.timestamp;
        break;

      case "heal":
        this.#addHealing(event.timestamp, event.source, event.value);
        this.#lastActivityAt = event.timestamp;
        break;

      case "applyEffect":
      case "removeEffect":
      case "ability":
        if (event.type === "ability" && event.phase === "interrupt" && event.ability !== null && BARAS_INTERRUPT_ABILITY_IDS.has(event.ability.id)) {
          this.#interrupts.push({
            timestamp: event.timestamp,
            abilityId: event.ability.id,
            abilityName: event.ability.name,
            sourceId: event.source?.kind === "player" ? event.source.playerId : null,
            sourceName: event.source?.kind === "player" ? event.source.name : null,
            targetNpcId: event.target?.kind === "npc" ? event.target.npcId : null,
            targetName: event.target?.kind === "npc" ? canonicalNpcName(event.target.npcId, event.target.name).name : null,
          });
        }
        this.#observePhase(
          event.timestamp,
          event.target,
          event.type === "ability" ? event.ability?.name ?? null : null,
          event.type === "applyEffect" || event.type === "removeEffect" ? event.effect.name : null,
        );
        this.#observeCounters(
          event.type === "ability" ? event.ability?.name ?? null : null,
          event.type === "applyEffect" || event.type === "removeEffect" ? event.effect.name : null,
        );
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
      const identity = canonicalNpcName(actor.npcId, actor.name);
      const existing = this.#npcs.get(actor.npcId);
      if (existing === undefined || actor.maxHp > existing.maxHp) {
        this.#npcs.set(actor.npcId, { name: identity.name, maxHp: actor.maxHp, hp: actor.hp });
      } else {
        existing.hp = actor.hp;
      }
      const instanceId = actor.instanceId ?? actor.npcId;
      const enemy = this.#enemies.get(instanceId);
      if (enemy === undefined) {
        this.#enemies.set(instanceId, {
          instanceId,
          npcId: actor.npcId,
          name: identity.name,
          rawName: actor.name,
          identitySource: identity.source,
          firstSeenAt: event.timestamp,
          engagedAt: null,
          lastSeenAt: event.timestamp,
          diedAt: null,
          maxHp: actor.maxHp,
          finalHp: actor.hp,
          damageTaken: 0,
          damageDealt: 0,
          absorbed: 0,
          criticalHits: 0,
          criticalDamage: 0,
          mitigatedDamage: 0,
          overkill: 0,
          threat: 0,
          damageByType: {},
          mitigationByType: {},
          deaths: 0,
          phases: [],
          players: new Map(),
        });
      } else {
        enemy.lastSeenAt = event.timestamp;
        enemy.finalHp = actor.hp;
        if (actor.maxHp > (enemy.maxHp ?? 0)) enemy.maxHp = actor.maxHp;
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
        totals.combatStyle = roster.advancedClass ?? (roster.discipline ? combatStyleForDiscipline(roster.discipline) : null);
      }
      this.#totals.set(id, totals);
    }
    return totals;
  }

  #phaseTotalsFor(phaseOrder: number, id: string, name: string, timestamp: number): PhaseActorState {
    let phase = this.#phaseTotals.get(phaseOrder);
    if (phase === undefined) {
      phase = new Map<string, PhaseActorState>();
      this.#phaseTotals.set(phaseOrder, phase);
    }
    let state = phase.get(id);
    if (state === undefined) {
      state = { totals: emptyTotals(id, name), firstActionAt: timestamp, lastActionAt: timestamp };
      const roster = this.#context.roster.get(id);
      if (roster !== undefined) {
        state.totals.role = roster.role;
        state.totals.discipline = roster.discipline;
        state.totals.combatStyle = roster.advancedClass ?? (roster.discipline ? combatStyleForDiscipline(roster.discipline) : null);
      }
      phase.set(id, state);
    } else {
      state.lastActionAt = timestamp;
    }
    return state;
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

  #damageDetails(totals: ActorTotals, value: MagnitudeValue, targetHp: number | null, threat: number | null): void {
    const applied = appliedAmount(value);
    if (value.critical) {
      totals.criticalHits = (totals.criticalHits ?? 0) + 1;
      totals.criticalDamage = (totals.criticalDamage ?? 0) + applied;
    }
    totals.mitigatedDamage = (totals.mitigatedDamage ?? 0) + Math.max(0, value.amount - applied);
    totals.overkill = (totals.overkill ?? 0) + (targetHp === null ? 0 : Math.max(0, applied - targetHp));
    totals.threat = (totals.threat ?? 0) + (threat ?? 0);
    increment(totals.damageByType ??= {}, value.damageType, applied);
    increment(totals.mitigationByType ??= {}, value.mitigation, Math.max(0, value.amount - applied));
  }

  #enemyDamageDetails(enemy: EnemyState, value: MagnitudeValue, targetHp: number | null, threat: number | null): void {
    const applied = appliedAmount(value);
    if (value.critical) {
      enemy.criticalHits += 1;
      enemy.criticalDamage += applied;
    }
    enemy.mitigatedDamage += Math.max(0, value.amount - applied);
    enemy.absorbed += value.absorbed ?? 0;
    enemy.overkill += targetHp === null ? 0 : Math.max(0, applied - targetHp);
    enemy.threat += threat ?? 0;
    increment(enemy.damageByType, value.damageType, applied);
    increment(enemy.mitigationByType, value.mitigation, Math.max(0, value.amount - applied));
  }

  #addDamage(
    timestamp: number,
    source: CombatEvent["source"],
    target: CombatEvent["target"],
    value: MagnitudeValue,
    ability: CombatEvent["ability"],
    threat: number | null,
  ): void {
    const applied = appliedAmount(value);
    const bucket = this.#bucketFor(timestamp);
    if (ability !== null) {
      const metadata = BARAS_ATTACK_TYPES_BY_ID.get(ability.id);
      const usage = this.#abilities.get(ability.id) ?? {
        abilityId: ability.id,
        name: metadata?.name ?? ability.name,
        attackType: metadata?.attackType ?? null,
        damageType: metadata?.damageType ?? null,
        casts: 0,
        damage: 0,
      };
      usage.casts += 1;
      usage.damage += applied;
      this.#abilities.set(ability.id, usage);
    }
    if (isPlayer(source) && isNpc(target)) {
      this.#engagedNpcIds.add(target.npcId);
        this.#engagedNpcNames.add(canonicalNpcName(target.npcId, target.name).name);
      this.#participants.add(source.playerId);
      const totals = this.#totalsFor(source.playerId, source.name);
      totals.damage += applied;
      this.#damageDetails(totals, value, target.hp, threat);
      const phaseState = this.#phaseTotalsFor(this.#currentPhaseOrder, source.playerId, source.name, timestamp);
      phaseState.totals.damage += applied;
      this.#damageDetails(phaseState.totals, value, target.hp, threat);
      bucket.damage[source.playerId] = (bucket.damage[source.playerId] ?? 0) + applied;
      const enemy = this.#enemyFor(target, timestamp);
      enemy.engagedAt ??= timestamp;
      enemy.damageTaken += applied;
      this.#enemyDamageDetails(enemy, value, target.hp, threat);
      const enemyPlayer = this.#enemyPlayerFor(enemy, source, timestamp);
      enemyPlayer.totals.damage += applied;
      this.#damageDetails(enemyPlayer.totals, value, target.hp, threat);
      let enemyPhaseState = enemyPlayer.phaseTotals.get(this.#currentPhaseOrder);
      if (enemyPhaseState === undefined) {
        enemyPhaseState = { totals: emptyTotals(source.playerId, source.name), firstActionAt: timestamp, lastActionAt: timestamp };
        enemyPhaseState.totals.role = enemyPlayer.totals.role;
        enemyPhaseState.totals.discipline = enemyPlayer.totals.discipline;
        enemyPhaseState.totals.combatStyle = enemyPlayer.totals.combatStyle ?? null;
        enemyPlayer.phaseTotals.set(this.#currentPhaseOrder, enemyPhaseState);
      } else {
        enemyPhaseState.lastActionAt = timestamp;
      }
      enemyPhaseState.totals.damage += applied;
      this.#damageDetails(enemyPhaseState.totals, value, target.hp, threat);
    }

    if (isNpc(source) && isPlayer(target)) {
      const enemy = this.#enemyFor(source, timestamp);
      enemy.engagedAt ??= timestamp;
      enemy.damageDealt += applied;
      this.#enemyDamageDetails(enemy, value, target.hp, threat);
    }

    if (isPlayer(target)) {
      const totals = this.#totalsFor(target.playerId, target.name);
      totals.damageTaken += applied;
      totals.absorbed += value.absorbed ?? 0;
      this.#damageDetails(totals, value, target.hp, threat);
      const phaseState = this.#phaseTotalsFor(this.#currentPhaseOrder, target.playerId, target.name, timestamp);
      phaseState.totals.damageTaken += applied;
      phaseState.totals.absorbed += value.absorbed ?? 0;
      this.#damageDetails(phaseState.totals, value, target.hp, threat);
      bucket.damageTaken[target.playerId] = (bucket.damageTaken[target.playerId] ?? 0) + applied;
      this.#lastHitOnPlayer.set(target.playerId, {
        ability: ability?.name ?? null,
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
    const phaseState = this.#phaseTotalsFor(this.#currentPhaseOrder, source.playerId, source.name, timestamp);
    phaseState.totals.healing += applied;
    phaseState.totals.overhealing += overheal;
    this.#participants.add(source.playerId);

    const bucket = this.#bucketFor(timestamp);
    bucket.healing[source.playerId] = (bucket.healing[source.playerId] ?? 0) + applied;
  }

  #addDeath(event: Extract<CombatEvent, { type: "death" }>): void {
    const victim = event.target;

    if (isNpc(victim)) {
      this.#deadNpcIds.add(victim.npcId);
      this.#deadNpcNames.add(victim.name);
      this.#deadNpcNames.add(canonicalNpcName(victim.npcId, victim.name).name);
      const enemy = this.#enemyFor(victim, event.timestamp);
      enemy.diedAt = event.timestamp;
      enemy.finalHp = 0;
      enemy.deaths += 1;
      return;
    }
    if (!isPlayer(victim)) return;

    const totals = this.#totalsFor(victim.playerId, victim.name);
    totals.deaths += 1;
    const phaseState = this.#phaseTotalsFor(this.#currentPhaseOrder, victim.playerId, victim.name, event.timestamp);
    phaseState.totals.deaths += 1;

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

  #enemyFor(actor: Extract<NonNullable<CombatEvent["source"]>, { kind: "npc" }>, timestamp: number): EnemyState {
    const instanceId = actor.instanceId ?? actor.npcId;
    const identity = canonicalNpcName(actor.npcId, actor.name);
    let enemy = this.#enemies.get(instanceId);
    if (enemy === undefined) {
      if (this.#resetDetectedAt === null) {
        const singleInstanceBossNames = this.#encounter()?.singleInstanceBossNames ?? [];
        const isReset = detectSingleInstanceReset(
          [...this.#enemies.values()].map((e) => ({ npcId: e.npcId, instanceId: e.instanceId, diedAt: e.diedAt })),
          { npcId: actor.npcId, instanceId, name: identity.name },
          singleInstanceBossNames,
        );
        if (isReset) this.#resetDetectedAt = timestamp;
      }
      enemy = {
        instanceId,
        npcId: actor.npcId,
        name: identity.name,
        rawName: actor.name,
        identitySource: identity.source,
        firstSeenAt: timestamp,
        engagedAt: timestamp,
        lastSeenAt: timestamp,
        diedAt: null,
        maxHp: actor.maxHp,
        finalHp: actor.hp,
        damageTaken: 0,
        damageDealt: 0,
        absorbed: 0,
        criticalHits: 0,
        criticalDamage: 0,
        mitigatedDamage: 0,
        overkill: 0,
        threat: 0,
        damageByType: {},
        mitigationByType: {},
        deaths: 0,
        phases: [],
        players: new Map(),
      };
      this.#enemies.set(instanceId, enemy);
    }
    enemy.lastSeenAt = timestamp;
    enemy.finalHp = actor.hp;
    if (!enemy.phases.includes(this.#currentPhaseOrder)) enemy.phases.push(this.#currentPhaseOrder);
    return enemy;
  }

  #enemyPlayerFor(enemy: EnemyState, actor: Extract<NonNullable<CombatEvent["source"]>, { kind: "player" }>, timestamp: number): EnemyPlayerState {
    let state = enemy.players.get(actor.playerId);
    if (state === undefined) {
      state = { totals: emptyTotals(actor.playerId, actor.name), firstDamageAt: timestamp, lastDamageAt: timestamp, phaseTotals: new Map() };
      const roster = this.#context.roster.get(actor.playerId);
      if (roster !== undefined) {
        state.totals.role = roster.role;
        state.totals.discipline = roster.discipline;
        state.totals.combatStyle = roster.advancedClass ?? (roster.discipline ? combatStyleForDiscipline(roster.discipline) : null);
      }
      enemy.players.set(actor.playerId, state);
    } else {
      state.lastDamageAt = timestamp;
    }
    return state;
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
      order: match.encounter.order,
      matchedBosses: match.matchedBosses,
      adds: match.encounter.adds,
      phases: match.encounter.phases,
      victoryEvent: match.encounter.victoryEvent,
      cleared: isEncounterCleared(match.encounter, this.#deadNpcNames, this.#victoryEvidence !== null, this.#deadNpcIds),
      bossNpcIds: match.encounter.bossNpcIds ?? [],
      addNpcIds: match.encounter.addNpcIds ?? [],
      singleInstanceBossNames: match.encounter.singleInstanceBossNames ?? [],
      counters: match.encounter.counters ?? [],
      catalogSource: NPC_CATALOG_SOURCE,
      catalogVersion: NPC_CATALOG_VERSION,
    };
  }

  #observeVictoryEvent(event: CombatEvent): void {
    if (this.#victoryEvidence !== null) return;
    const encounter = this.#encounter();
    if (encounter === null || /boss defeated|both bosses defeated|all .* defeated/i.test(encounter.victoryEvent)) return;

    const eventNames = [
      event.ability?.name,
      event.type === "applyEffect" || event.type === "removeEffect" ? event.effect.name : null,
      event.type === "other" ? event.category.name : null,
    ].filter((name): name is string => name !== null);
    if (eventNames.length === 0) return;

    const victoryText = encounter.victoryEvent.toLowerCase();
    const evidenceText = eventNames.join(" ").toLowerCase();
    const markers = ["puzzle", "solv", "align", "core", "vanquish", "retreat", "teleport", "terminal", "destroy"];
    const markerMatches = markers.some((marker) => victoryText.includes(marker) && evidenceText.includes(marker));
    if (!markerMatches) return;

    this.#victoryEvidence = {
      kind: "victory-event",
      timestamp: event.timestamp,
      detail: `Encounter victory evidence observed: ${eventNames.join(" / ")}.`,
      actorIds: event.source?.kind === "player" ? [event.source.playerId] : [],
      npcIds: event.target?.kind === "npc" ? [event.target.npcId] : [],
    };
  }

  #observePhase(
    timestamp: number,
    target: CombatEvent["target"],
    abilityName: string | null,
    effectName: string | null,
  ): void {
    const encounter = this.#encounter();
    if (encounter === null || encounter.phases.length === 0) return;
    const targetHpPercent = isNpc(target) && target.hp !== null && target.maxHp && target.maxHp > 0
      ? (target.hp / target.maxHp) * 100
      : null;
    const order = resolveEncounterPhase(encounter, {
      bossHpPercent: targetHpPercent,
      abilityName,
      effectName,
      deadNpcNames: this.#deadNpcNames,
      conditionContext: this.#conditionContext(),
    });
    if (!this.#phaseStartedAt.has(1)) this.#phaseStartedAt.set(1, this.startedAt);
    const previous = Math.max(...this.#phaseStartedAt.keys());
    if (order <= previous) return;
    this.#phaseStartedAt.set(order, timestamp);
    this.#currentPhaseOrder = order;
    this.#phaseEvidence.set(order, {
      kind: "phase-transition",
      timestamp,
      detail: `Phase ${order} observed from ${abilityName ?? effectName ?? "encounter state"}.`,
      actorIds: [],
      npcIds: isNpc(target) ? [target.npcId] : [],
    });
  }

  #rates(durationMs: number): ActorRates[] {
    return this.#rateValues(this.#totals.values(), durationMs);
  }

  #rateValues(totalsList: Iterable<ActorTotals>, durationMs: number): ActorRates[] {
    const seconds = Math.max(durationMs, 1) / 1000;
    return [...totalsList]
      .map((totals) => {
        let role = totals.role;
        if (!role) {
          if (totals.healing > 10000 && totals.healing > totals.damage * 0.5) {
            role = "healer";
          } else if (totals.damageTaken > 50000 && totals.damageTaken > totals.damage * 0.8) {
            role = "tank";
          } else {
            role = "dps";
          }
        }
        const combatStyle = totals.combatStyle ?? (totals.discipline ? combatStyleForDiscipline(totals.discipline) : null);
        return {
          ...totals,
          role,
          combatStyle,
          dps: totals.damage / seconds,
          hps: totals.healing / seconds,
          dtps: totals.damageTaken / seconds,
          overhealPercent:
            totals.healing + totals.overhealing === 0
              ? 0
              : (totals.overhealing / (totals.healing + totals.overhealing)) * 100,
        };
      })
      .sort((a, b) => b.damage - a.damage);
  }

  #phaseRates(phaseOrder: number, durationMs: number): PlayerPhaseMetrics[] {
    const states = this.#phaseTotals.get(phaseOrder);
    if (states === undefined) return [];
    return [...states.values()].map((state) => ({
      ...this.#rateValues([state.totals], durationMs)[0]!,
      phaseOrder,
      activeMs: Math.max(0, state.lastActionAt - state.firstActionAt),
      firstActionAt: state.firstActionAt,
      lastActionAt: state.lastActionAt,
    }));
  }

  #outcome(boss: BossInfo | null, encounter: EncounterRef | null, endReason: PullEndReason): PullOutcome {
    // 1. A matched encounter knows exactly what has to die to be victorious.
    if (encounter !== null) {
      if (encounter.cleared) return "kill";
    } else if (boss !== null && this.#deadNpcIds.has(boss.npcId)) {
      return "kill";
    }

    // 1b. A detected single-instance boss reset means this attempt never
    // reached a real kill or wipe; the room reset and play continued.
    if (this.#resetDetectedAt !== null) return "reset";

    // 2. Wipe detection:
    const died = new Set(this.#deaths.map((d) => d.playerId));
    const nonLocalParticipants = [...this.#participants].filter((id) => id !== this.#context.localPlayerId);
    const raidWiped = nonLocalParticipants.length > 0 && nonLocalParticipants.every((id) => died.has(id));

    if (raidWiped) return "wipe";

    // If a boss encounter or strong boss was engaged and did not die, and either players died
    // or combat ended without victory, it's a wipe.
    if (encounter !== null || (boss !== null && boss.isLikelyBoss)) {
      if (endReason === "sustained-silence") return "wipe";
      return "incomplete";
    }

    // 3. For trash pulls: killing engaged enemies is a kill, wiping to trash is a wipe
    if (this.#deadNpcIds.size > 0) return "kill";
    if (died.size > 0) return "wipe";

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

  encounter(): EncounterRef | null {
    return this.#encounter();
  }

  hasVictory(): boolean {
    return this.#encounter()?.cleared === true;
  }

  #enemyPlayerMetrics(enemy: EnemyState, phaseOrder?: number): EnemyPlayerMetrics[] {
    return [...enemy.players.values()].flatMap((player) => {
      const phase = phaseOrder === undefined ? null : player.phaseTotals.get(phaseOrder);
      const totals = phase?.totals ?? player.totals;
      const first = phase?.firstActionAt ?? player.firstDamageAt;
      const last = phase?.lastActionAt ?? player.lastDamageAt;
      const rates = this.#rateValues([totals], Math.max(1, (enemy.diedAt ?? this.#lastActivityAt) - first))[0];
      return rates ? [{ ...rates, firstDamageAt: first, lastDamageAt: last, activeMs: Math.max(0, last - first) }] : [];
    });
  }

  #enemyTimeline(encounter: EncounterRef, phaseOrder?: number): { bosses: EnemyTimeline[]; mechanics: EnemyTimeline[]; unknown: EnemyTimeline[] } {
    const all = [...this.#enemies.values()].map((enemy) => ({
      ...enemy,
      role: classifyEncounterEntity({
        id: encounter.encounterId,
        name: encounter.encounterName,
        operationId: encounter.operationId as never,
        order: 0,
        bossNames: encounter.matchedBosses,
        bossNpcIds: encounter.bossNpcIds ?? [],
        addNpcIds: encounter.addNpcIds ?? [],
        victoryRequires: [],
        adds: encounter.adds ?? [],
        phases: encounter.phases,
        wipeMechanics: [],
        victoryEvent: encounter.victoryEvent,
      }, enemy.name, enemy.npcId),
      players: this.#enemyPlayerMetrics(enemy, phaseOrder),
    }));
    return {
      bosses: all.filter((enemy) => enemy.role === "boss"),
      mechanics: all.filter((enemy) => enemy.role === "mechanic"),
      unknown: all.filter((enemy) => enemy.role === "unknown"),
    };
  }

  #allEnemyTimelines(): EnemyTimeline[] {
    const all = [...this.#enemies.values()];
    return all.map((enemy) => ({
      ...enemy,
      role: classifyCatalogEntity(enemy.name, enemy.npcId),
      players: [...enemy.players.values()].map((player): EnemyPlayerMetrics => ({
        ...this.#rateValues([player.totals], Math.max(1, (enemy.diedAt ?? this.#lastActivityAt) - player.firstDamageAt))[0]!,
        firstDamageAt: player.firstDamageAt,
        lastDamageAt: player.lastDamageAt,
        activeMs: Math.max(0, (enemy.diedAt ?? this.#lastActivityAt) - player.firstDamageAt),
      })),
    }));
  }

  #bossFight(encounter: EncounterRef | null, endedAt: number, outcome: PullOutcome, endReason: PullEndReason): BossFightSummary | null {
    if (encounter === null) return null;
    const durationMs = Math.max(0, endedAt - this.startedAt);
    const timelines = this.#enemyTimeline(encounter);
    const terminalEvidence = this.#terminalEvidence(encounter, outcome, endedAt, endReason);
    const observedPhases = encounter.phases.filter((phase) => this.#phaseStartedAt.has(phase.order));
    const phases: BossPhaseSummary[] = observedPhases.map((phase, index) => {
      const startedAt = this.#phaseStartedAt.get(phase.order)!;
      const nextPhase = observedPhases[index + 1];
      const endedPhaseAt = nextPhase
        ? this.#phaseStartedAt.get(nextPhase.order)!
        : endedAt;
      const phaseTimelines = this.#enemyTimeline(encounter, phase.order);
      const enemies = [...phaseTimelines.bosses, ...phaseTimelines.mechanics, ...phaseTimelines.unknown].map((enemy) => ({
        ...enemy,
        phases: enemy.phases.length > 0 ? enemy.phases : [phase.order],
      }));
      const players = this.#phaseRates(phase.order, Math.max(endedPhaseAt - startedAt, 1));
      return {
        order: phase.order,
        name: phase.name,
        style: phase.style,
        trigger: phase.trigger,
        startedAt,
        endedAt: endedPhaseAt,
        triggerEvidence: this.#phaseEvidence.get(phase.order) ??
          (index === observedPhases.length - 1 ? terminalEvidence : null),
        enemies,
        players,
      };
    });
    return {
      id: this.id,
      index: this.index,
      startedAt: this.startedAt,
      endedAt,
      durationMs,
      zone: this.#context.zone,
      difficulty: this.#context.difficulty,
      groupSize: this.#context.groupSize,
      encounter,
      bossEntities: timelines.bosses,
      mechanicEntities: timelines.mechanics,
      unknownEntities: timelines.unknown,
      phases,
      players: this.#rates(durationMs),
      deaths: [...this.#deaths],
      outcome,
      terminalEvidence,
      buckets: [...this.#buckets.values()].sort((a, b) => a.index - b.index),
      counters: Object.fromEntries(this.#counters),
      interrupts: [...this.#interrupts],
      abilities: [...this.#abilities.values()].sort((left, right) => right.damage - left.damage),
      catalogSource: NPC_CATALOG_SOURCE,
      catalogVersion: NPC_CATALOG_VERSION,
    };
  }

  #terminalEvidence(encounter: EncounterRef, outcome: PullOutcome, timestamp: number, endReason: PullEndReason) {
    if (outcome === "kill") {
      if (this.#victoryEvidence !== null) return this.#victoryEvidence;
      return {
        kind: encounter.cleared ? "required-targets-dead" as const : "boss-death" as const,
        timestamp,
        detail: encounter.cleared ? "All required encounter targets were defeated." : "A boss entity was defeated.",
        actorIds: [],
        npcIds: [...this.#deadNpcIds],
      };
    }
    if (outcome === "reset") {
      return {
        kind: "encounter-reset" as const,
        timestamp,
        detail: "A single-instance boss reset was detected; the attempt restarted rather than concluding in a kill or wipe.",
        actorIds: [],
        npcIds: [],
      };
    }
    if (outcome === "wipe") {
      return {
        kind: this.#deaths.length > 0 ? "raid-wipe" as const : "encounter-reset" as const,
        timestamp,
        detail: this.#deaths.length > 0 ? "Player deaths ended the boss attempt." : "The boss attempt ended without a victory.",
        actorIds: this.#deaths.map((death) => death.playerId),
        npcIds: [],
      };
    }
    return {
      kind: endReason,
      timestamp,
      detail: endReason === "sustained-silence"
        ? "The boss attempt ended after sustained hostile silence without a victory event."
        : "The combat stream ended before a terminal encounter result was observed.",
      actorIds: [],
      npcIds: [],
    };
  }

  finish(endedAt: number, endReason: PullEndReason = "stream-ended"): PullSummary {
    const durationMs = Math.max(0, endedAt - this.startedAt);
    const encounter = this.#encounter();
    const boss = this.#boss(encounter);
    const outcome = this.#outcome(boss, encounter, endReason);
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
      outcome,
      roster: this.#roster(),
      actors: this.#rates(durationMs),
      deaths: [...this.#deaths],
      buckets: [...this.#buckets.values()].sort((a, b) => a.index - b.index),
      bossFight: this.#bossFight(encounter, endedAt, outcome, endReason),
      enemyTimelines: this.#allEnemyTimelines(),
    };
  }

  live(now: number): LivePullState {
    const elapsedMs = Math.max(0, now - this.startedAt);
    const encounter = this.#encounter();
    const liveBossFight: LiveBossFightSnapshot | null = encounter === null ? null : {
      id: this.id,
      index: this.index,
      startedAt: this.startedAt,
      elapsedMs,
      zone: this.#context.zone,
      difficulty: this.#context.difficulty,
      groupSize: this.#context.groupSize,
      encounter,
      bossEntities: this.#enemyTimeline(encounter).bosses,
      mechanicEntities: this.#enemyTimeline(encounter).mechanics,
      unknownEntities: this.#enemyTimeline(encounter).unknown,
      phases: encounter.phases.filter((phase) => this.#phaseStartedAt.has(phase.order)).map((phase, index, observed) => ({
        order: phase.order,
        name: phase.name,
        style: phase.style,
        trigger: phase.trigger,
        startedAt: this.#phaseStartedAt.get(phase.order)!,
        endedAt: observed[index + 1] ? this.#phaseStartedAt.get(observed[index + 1]!.order)! : null,
        triggerEvidence: this.#phaseEvidence.get(phase.order) ?? null,
        enemies: [...this.#enemyTimeline(encounter).bosses, ...this.#enemyTimeline(encounter).mechanics, ...this.#enemyTimeline(encounter).unknown],
        players: this.#phaseRates(phase.order, Math.max(elapsedMs, 1)),
      })),
      players: this.#rates(elapsedMs),
    };
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
      bossFight: liveBossFight,
    };
  }
}
