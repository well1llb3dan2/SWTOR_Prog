import {
  evaluateCondition,
  matchesEncounterTrigger,
  resolveEncounterPhase,
  type ConditionContext,
  type CounterDefinition,
  type EncounterChallengeDefinition,
  type EncounterPhase,
  type EncounterShieldDefinition,
  type EncounterTimerDefinition,
  type EncounterTrigger,
  type TriggerEntity,
  type TriggerSignal,
} from "@swtor/game-data";
import type { Actor, CombatEvent, Difficulty, GroupSize, Position } from "@swtor/shared";

export interface EncounterRuntimeDefinition {
  encounterId: string;
  phases: EncounterPhase[];
  counters: CounterDefinition[];
  bossNpcIds: string[];
  timers?: EncounterTimerDefinition[];
  shields?: EncounterShieldDefinition[];
  challenges?: EncounterChallengeDefinition[];
  victoryTrigger?: EncounterTrigger;
  entityNpcIds?: Record<string, string[]>;
}

export interface RuntimePhaseSegment {
  phaseId: string;
  phaseOrder: number;
  startedAt: number;
  endedAt: number | null;
  triggerKind: EncounterTrigger["kind"] | "legacy" | "initial";
  detail: string;
}

export interface RuntimeTimer {
  id: string;
  name: string;
  startedAt: number;
  expiresAt: number;
}

export interface RuntimeEffect {
  effectId: string;
  effectName: string;
  sourceId: string | null;
  targetId: string;
  appliedAt: number;
  charges: number | null;
}

export interface RuntimeShield {
  id: string;
  targetId: string;
  remaining: number;
  startedAt: number;
}

export interface RuntimeTerminalState {
  outcome: "victory" | "wipe" | "reset";
  timestamp: number;
  detail: string;
}

export interface RuntimeTimerEvent {
  timerId: string;
  name: string;
  event: "started" | "expired" | "canceled";
  timestamp: number;
  expiresAt: number | null;
}

export interface RuntimeEffectWindow extends RuntimeEffect {
  removedAt: number | null;
}

export interface RuntimeShieldWindow extends RuntimeShield {
  initial: number;
  endedAt: number | null;
}

interface RuntimeChallengeValue {
  id: string;
  name: string;
  metric: string;
  value: number;
  eventCount: number;
  firstEventAt: number | null;
  conditionActiveMs: number;
  conditionActiveSince: number | null;
  byPlayer: Map<string, { name: string; value: number }>;
}

export interface RuntimeChallengeSummary {
  id: string;
  name: string;
  metric: string;
  value: number;
  eventCount: number;
  durationMs: number;
  perSecond: number | null;
  players: Array<{ playerId: string; name: string; value: number; percent: number; perSecond: number | null }>;
}

function actorId(actor: Actor): string {
  return actor.kind === "player" ? actor.playerId : actor.instanceId ?? actor.npcId;
}

function triggerEntity(actor: Actor | null): TriggerEntity | null {
  if (actor === null) return null;
  return {
    kind: actor.kind,
    id: actorId(actor),
    npcId: actor.kind === "npc" ? actor.npcId : null,
    name: actor.name,
    position: actor.position,
  };
}

export class EncounterRuntime {
  readonly startedAt: number;
  readonly difficulty: Difficulty | null;
  readonly groupSize: GroupSize | null;
  readonly counters = new Map<string, number>();
  readonly phaseSegments: RuntimePhaseSegment[] = [];
  readonly timers = new Map<string, RuntimeTimer>();
  readonly effects = new Map<string, RuntimeEffect>();
  readonly shields = new Map<string, RuntimeShield>();
  readonly positions = new Map<string, Position>();
  readonly challenges = new Map<string, RuntimeChallengeValue>();
  readonly timerEvents: RuntimeTimerEvent[] = [];
  readonly effectWindows: RuntimeEffectWindow[] = [];
  readonly shieldWindows: RuntimeShieldWindow[] = [];
  readonly #seenEntityIds = new Set<string>();
  readonly #pendingChallengeStacks = new Map<string, number>();
  readonly #activeEffectWindows = new Map<string, RuntimeEffectWindow>();
  readonly #activeShieldWindows = new Map<string, RuntimeShieldWindow>();
  readonly #bossHpByNpcId = new Map<string, number>();
  readonly #entitiesById = new Map<string, TriggerEntity>();
  readonly #currentTargets = new Map<string, string>();

  #definition: EncounterRuntimeDefinition | null = null;
  #currentPhaseOrder = 1;
  #currentPhaseId: string | null = null;
  #previousPhaseId: string | null = null;
  #lastTimestamp: number;
  #evaluationTimestamp: number;
  #terminal: RuntimeTerminalState | null = null;

  constructor(startedAt: number, difficulty: Difficulty | null, groupSize: GroupSize | null = null) {
    this.startedAt = startedAt;
    this.difficulty = difficulty;
    this.groupSize = groupSize;
    this.#lastTimestamp = startedAt;
    this.#evaluationTimestamp = startedAt;
  }

  get currentPhaseOrder(): number {
    return this.#currentPhaseOrder;
  }

  get currentPhaseId(): string | null {
    return this.#currentPhaseId;
  }

  get previousPhaseId(): string | null {
    return this.#previousPhaseId;
  }

  get currentPhaseSegmentIndex(): number {
    return Math.max(0, this.phaseSegments.length - 1);
  }

  get terminal(): RuntimeTerminalState | null {
    return this.#terminal;
  }

  bind(definition: EncounterRuntimeDefinition): void {
    if (this.#definition?.encounterId === definition.encounterId) return;
    this.#definition = definition;
    this.counters.clear();
    for (const counter of definition.counters) this.counters.set(counter.id, counter.initialValue ?? 0);
    this.challenges.clear();
    for (const challenge of definition.challenges ?? []) {
      if (!challenge.enabled || (challenge.difficulties.length > 0 && (this.difficulty === null || !challenge.difficulties.includes(this.difficulty)))) continue;
      this.challenges.set(challenge.id, {
        id: challenge.id,
        name: challenge.name,
        metric: challenge.metric,
        value: 0,
        eventCount: 0,
        firstEventAt: null,
        conditionActiveMs: 0,
        conditionActiveSince: null,
        byPlayer: new Map(),
      });
    }
    this.#processSignal({ kind: "combatStart" }, this.startedAt);
    const first = this.#eligiblePhases()[0];
    if (first !== undefined && this.phaseSegments.length === 0) this.#enterPhase(first, this.startedAt, "initial", "Encounter started.");
  }

  getCounter(counterId: string): number {
    return this.counters.get(counterId) ?? 0;
  }

  setCounter(counterId: string, value: number): void {
    this.counters.set(counterId, Math.max(0, value));
  }

  incrementCounter(counterId: string): number {
    const next = this.getCounter(counterId) + 1;
    this.counters.set(counterId, next);
    return next;
  }

  decrementCounter(counterId: string): number {
    const next = Math.max(0, this.getCounter(counterId) - 1);
    this.counters.set(counterId, next);
    return next;
  }

  conditionContext(): ConditionContext {
    return {
      getCounter: (counterId) => this.getCounter(counterId),
      currentPhaseOrder: this.#currentPhaseOrder,
      currentPhaseId: this.#currentPhaseId,
      getTimerRemainingMs: (timerId) => Math.max(0, (this.timers.get(timerId)?.expiresAt ?? this.#evaluationTimestamp) - this.#evaluationTimestamp),
    };
  }

  process(event: CombatEvent, localPlayerId: string | null): void {
    const previousTimestamp = this.#lastTimestamp;
    this.#evaluationTimestamp = event.timestamp;
    this.#observePositions(event);
    this.#observeEffects(event);
    this.#observeBossHp(event);

    const source = triggerEntity(event.source);
    const target = triggerEntity(event.target);
    for (const entity of [source, target]) if (entity !== null) this.#entitiesById.set(entity.id, entity);
    if (event.type === "target" && event.state === "set" && source !== null && target !== null) this.#currentTargets.set(source.id, target.id);
    if (event.type === "target" && event.state === "cleared" && source !== null) this.#currentTargets.delete(source.id);
    const resolvedTarget = event.type === "ability" && source !== null && target?.id === source.id
      ? this.#entitiesById.get(this.#currentTargets.get(source.id) ?? "") ?? target
      : target;
    const base = {
      source,
      target: resolvedTarget,
      localPlayerId,
      currentTargetId: localPlayerId === null ? null : this.#currentTargets.get(localPlayerId) ?? null,
      isBossNpcId: (npcId: string) => this.#definition?.bossNpcIds.includes(npcId) ?? false,
    };
    const previousElapsedMs = Math.max(0, previousTimestamp - this.startedAt);
    const elapsedMs = Math.max(0, event.timestamp - this.startedAt);
    const signals: TriggerSignal[] = [{ kind: "timeElapsed", previousElapsedMs, elapsedMs, ...base }];
    for (const entity of [source, target]) {
      if (entity?.kind !== "npc" || this.#seenEntityIds.has(entity.id)) continue;
      this.#seenEntityIds.add(entity.id);
      signals.push({ kind: "npcAppears", entity, ...base });
    }

    switch (event.type) {
      case "ability":
        if (event.phase === "activate" && event.ability !== null) signals.push({ kind: "abilityCast", ability: event.ability, ...base });
        break;
      case "applyEffect":
        signals.push({ kind: "effectApplied", effect: event.effect, ability: event.ability, ...base });
        break;
      case "removeEffect":
        signals.push({ kind: "effectRemoved", effect: event.effect, ability: event.ability, ...base });
        break;
      case "damage":
        signals.push({ kind: "damage", ability: event.ability, mitigation: event.value.mitigation, ...base });
        if (event.target?.kind === "npc" && event.target.hp !== null && event.target.maxHp !== null && event.target.maxHp > 0) {
          signals.push({ kind: "bossHp", entity: target, bossHpPercent: (event.target.hp / event.target.maxHp) * 100, ...base });
        }
        break;
      case "heal":
        signals.push({ kind: "healing", ability: event.ability, ...base });
        break;
      case "modifyCharges": {
        const effectKey = event.target === null ? null : `${event.effect.id}:${actorId(event.target)}`;
        const previousCharges = effectKey === null ? null : this.effects.get(effectKey)?.charges ?? null;
        signals.push({ kind: "chargesChanged", effect: event.effect, previousCharges, charges: event.charges, ...base });
        if (effectKey !== null) {
          const active = this.effects.get(effectKey);
          if (active !== undefined) active.charges = event.charges;
          const window = this.#activeEffectWindows.get(effectKey);
          if (window !== undefined) window.charges = event.charges;
        }
        break;
      }
      case "death":
        signals.push({ kind: "entityDeath", entity: target, ...base });
        break;
      case "target":
        if (event.state === "set") signals.push({ kind: "targetSet", entity: source, ...base });
        break;
      case "threat":
      case "taunt":
        signals.push({ kind: "threatModified", ability: event.ability, threat: event.threat, ...base });
        break;
      default:
        break;
    }

    signals.push(...this.#updateEffectStackCounters(localPlayerId));

    for (const signal of signals) {
      this.#processSignal(signal, event.timestamp);
      this.#updateShieldDamage(event, signal);
    }
    this.#processLegacyPhase(event);
    this.#observeChallenges(event, localPlayerId);
    this.#updateChallengeConditionTracking(event.timestamp);
    this.#lastTimestamp = Math.max(this.#lastTimestamp, event.timestamp);
  }

  challengeSnapshot(endedAt: number): RuntimeChallengeSummary[] {
    return [...this.challenges.values()].map((value) => {
      const definition = this.#definition?.challenges?.find((candidate) => candidate.id === value.id);
      const phaseIds = (definition?.conditions ?? [])
        .filter((condition) => condition.type === "phase")
        .flatMap((condition) => Array.isArray(condition.phase_ids) ? condition.phase_ids.map(String) : []);
      const durationMs = phaseIds.length > 0
        ? this.phaseSegments.filter((segment) => phaseIds.includes(segment.phaseId)).reduce((total, segment) => total + Math.max(0, (segment.endedAt ?? endedAt) - segment.startedAt), 0)
        : this.#hasScopedChallengeConditions(definition)
          ? value.conditionActiveMs + (value.conditionActiveSince === null ? 0 : Math.max(0, endedAt - value.conditionActiveSince))
          : Math.max(0, endedAt - this.startedAt);
      const seconds = durationMs > 0 ? durationMs / 1000 : 0;
      const byPlayer = new Map([...value.byPlayer].map(([playerId, player]) => [playerId, { ...player }]));
      let pendingTotal = 0;
      let pendingWindows = 0;
      for (const [key, stacks] of this.#pendingChallengeStacks) {
        const prefix = `${value.id}:`;
        if (!key.startsWith(prefix)) continue;
        const playerId = key.slice(prefix.length);
        const player = byPlayer.get(playerId);
        if (player !== undefined) player.value += stacks;
        pendingTotal += stacks;
        pendingWindows += 1;
      }
      const totalValue = value.value + pendingTotal;
      return {
        id: value.id,
        name: value.name,
        metric: value.metric,
        value: totalValue,
        eventCount: value.eventCount + pendingWindows,
        durationMs,
        perSecond: seconds > 0 ? totalValue / seconds : null,
        players: [...byPlayer].map(([playerId, player]) => ({
          playerId,
          name: player.name,
          value: player.value,
          percent: totalValue > 0 ? (player.value / totalValue) * 100 : 0,
          perSecond: seconds > 0 ? player.value / seconds : null,
        })).sort((left, right) => right.value - left.value),
      };
    });
  }

  mechanicsSnapshot(): { timerEvents: RuntimeTimerEvent[]; effectWindows: RuntimeEffectWindow[]; shieldWindows: RuntimeShieldWindow[] } {
    return {
      timerEvents: this.timerEvents.map((event) => ({ ...event })),
      effectWindows: this.effectWindows.map((window) => ({ ...window })),
      shieldWindows: this.shieldWindows.map((window) => ({ ...window })),
    };
  }

  observeLegacyPhase(order: number, timestamp: number, detail: string): void {
    const phase = this.#definition?.phases.find((candidate) => candidate.order === order);
    if (phase !== undefined && order > this.#currentPhaseOrder) this.#enterPhase(phase, timestamp, "legacy", detail);
  }

  startTimer(id: string, timestamp: number, durationMs: number): void {
    const timer = { id, name: id, startedAt: timestamp, expiresAt: timestamp + Math.max(0, durationMs) };
    this.timers.set(id, timer);
    this.timerEvents.push({ timerId: id, name: id, event: "started", timestamp, expiresAt: timer.expiresAt });
  }

  cancelTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer === undefined) return;
    this.timers.delete(id);
    this.timerEvents.push({ timerId: id, name: timer.name, event: "canceled", timestamp: this.#evaluationTimestamp, expiresAt: timer.expiresAt });
  }

  setShield(id: string, targetId: string, remaining: number, timestamp: number): void {
    const shield = { id, targetId, remaining: Math.max(0, remaining), startedAt: timestamp };
    this.shields.set(id, shield);
    const window = { ...shield, initial: shield.remaining, endedAt: null };
    this.shieldWindows.push(window);
    this.#activeShieldWindows.set(id, window);
  }

  setTerminal(outcome: RuntimeTerminalState["outcome"], timestamp: number, detail: string): void {
    this.#terminal ??= { outcome, timestamp, detail };
  }

  #eligiblePhases(): EncounterPhase[] {
    return (this.#definition?.phases ?? [])
      .filter((phase) => phase.difficulties === undefined || phase.difficulties.length === 0 || (this.difficulty !== null && phase.difficulties.includes(this.difficulty)))
      .sort((left, right) => left.order - right.order);
  }

  #processSignal(signal: TriggerSignal, timestamp: number): void {
    const pending: TriggerSignal[] = [signal];
    let processed = 0;
    while (pending.length > 0 && processed < 100) {
      const current = pending.shift()!;
      processed += 1;
      for (const change of this.#updateCounters(current)) pending.push(change);
      for (const phaseSignal of this.#updatePhase(current, timestamp)) pending.push(phaseSignal);
      for (const timerSignal of this.#updateTimers(current, timestamp)) pending.push(timerSignal);
      this.#updateShields(current, timestamp);
      if (this.#definition?.victoryTrigger !== undefined && matchesEncounterTrigger(this.#definition.victoryTrigger, current)) {
        this.setTerminal("victory", timestamp, `Victory trigger ${this.#definition.victoryTrigger.kind} matched.`);
      }
    }
  }

  #updateCounters(signal: TriggerSignal): TriggerSignal[] {
    const changes: TriggerSignal[] = [];
    for (const definition of this.#definition?.counters ?? []) {
      const previous = this.getCounter(definition.id);
      let next = previous;
      if (definition.resetOn !== undefined && matchesEncounterTrigger(definition.resetOn, signal)) next = definition.initialValue ?? 0;
      if (definition.trackEffectStacks !== undefined) {
        if (next !== previous) {
          this.counters.set(definition.id, next);
          changes.push({ kind: "counterChanged", counterId: definition.id, previousCounterValue: previous, counterValue: next });
        }
        continue;
      }
      if (definition.decrementOn !== undefined && matchesEncounterTrigger(definition.decrementOn, signal)) next = Math.max(0, next - 1);
      if (definition.incrementOn !== undefined && matchesEncounterTrigger(definition.incrementOn, signal)) next += 1;
      if (next === previous) continue;
      this.counters.set(definition.id, next);
      changes.push({ kind: "counterChanged", counterId: definition.id, previousCounterValue: previous, counterValue: next });
    }
    return changes;
  }

  #updatePhase(signal: TriggerSignal, timestamp: number): TriggerSignal[] {
    const emitted: TriggerSignal[] = [];
    const current = this.#eligiblePhases().find((phase) => (phase.id ?? String(phase.order)) === this.#currentPhaseId);
    if (current?.endTrigger !== undefined && matchesEncounterTrigger(current.endTrigger, signal)) {
      const ended = this.phaseSegments.at(-1);
      if (ended !== undefined && ended.endedAt === null) ended.endedAt = timestamp;
      const endedId = this.#currentPhaseId;
      this.#previousPhaseId = endedId;
      this.#currentPhaseId = null;
      if (endedId !== null) emitted.push({ kind: "phaseEnded", phaseId: endedId });
    }
    for (const phase of this.#eligiblePhases()) {
      if (phase.startTrigger === undefined || !matchesEncounterTrigger(phase.startTrigger, signal)) continue;
      if (phase.guard !== undefined && !evaluateCondition(phase.guard, this.conditionContext())) continue;
      if (phase.conditions?.some((condition) => !evaluateCondition(condition, this.conditionContext())) ?? false) continue;
      if (phase.precededBy !== undefined && phase.precededBy !== this.#previousPhaseId) continue;
      if ((phase.id ?? String(phase.order)) === this.#currentPhaseId) continue;
      this.#enterPhase(phase, timestamp, phase.startTrigger.kind, `Phase trigger ${phase.startTrigger.kind} matched.`);
      emitted.push({ kind: "phaseEntered", phaseId: phase.id ?? String(phase.order) });
      break;
    }
    return emitted;
  }

  #updateTimers(signal: TriggerSignal, timestamp: number): TriggerSignal[] {
    const emitted: TriggerSignal[] = [];
    for (const timer of [...this.timers.values()]) {
      if (timer.expiresAt > timestamp) continue;
      this.timers.delete(timer.id);
      this.timerEvents.push({ timerId: timer.id, name: timer.name, event: "expired", timestamp, expiresAt: timer.expiresAt });
      emitted.push({ kind: "timerExpires", timerId: timer.id });
    }
    for (const definition of this.#definition?.timers ?? []) {
      if (!this.#timerEligible(definition)) continue;
      const active = this.timers.get(definition.id);
      if (active !== undefined && definition.cancelTrigger !== undefined && matchesEncounterTrigger(definition.cancelTrigger, signal)) {
        this.timers.delete(definition.id);
        this.timerEvents.push({ timerId: active.id, name: active.name, event: "canceled", timestamp, expiresAt: active.expiresAt });
        emitted.push({ kind: "timerCanceled", timerId: definition.id });
        continue;
      }
      if (!matchesEncounterTrigger(definition.trigger, signal) || (active !== undefined && !definition.canRefresh)) continue;
      const timer = { id: definition.id, name: definition.name, startedAt: timestamp, expiresAt: timestamp + definition.durationMs };
      this.timers.set(definition.id, timer);
      this.timerEvents.push({ timerId: timer.id, name: timer.name, event: "started", timestamp, expiresAt: timer.expiresAt });
      emitted.push({ kind: "timerStarted", timerId: definition.id });
      if (definition.durationMs === 0) {
        this.timers.delete(definition.id);
        this.timerEvents.push({ timerId: timer.id, name: timer.name, event: "expired", timestamp, expiresAt: timer.expiresAt });
        emitted.push({ kind: "timerExpires", timerId: definition.id });
      }
    }
    return emitted;
  }

  #timerEligible(timer: EncounterTimerDefinition): boolean {
    if (!timer.enabled) return false;
    if (timer.difficulties.length > 0 && (this.difficulty === null || !timer.difficulties.includes(this.difficulty))) return false;
    if (timer.groupSize !== undefined && timer.groupSize !== this.groupSize) return false;
    if (timer.phaseIds.length > 0 && (this.#currentPhaseId === null || !timer.phaseIds.includes(this.#currentPhaseId))) return false;
    return timer.conditions.every((condition) => evaluateCondition(condition, this.conditionContext()));
  }

  #updateShields(signal: TriggerSignal, timestamp: number): void {
    for (const definition of this.#definition?.shields ?? []) {
      if (matchesEncounterTrigger(definition.endTrigger, signal)) {
        for (const [key] of this.shields) if (key.startsWith(`${definition.id}:`)) this.#endShield(key, timestamp);
      }
      if (!matchesEncounterTrigger(definition.startTrigger, signal)) continue;
      const target = signal.target ?? signal.entity ?? signal.source;
      if (target?.npcId === null || target?.npcId === undefined || !definition.targetNpcIds.includes(target.npcId)) continue;
      const total = this.#shieldTotal(definition);
      this.setShield(`${definition.id}:${target.id}`, target.id, total, timestamp);
    }
  }

  #shieldTotal(definition: EncounterShieldDefinition): number {
    const exact = definition.hp.find((rule) =>
      (rule.difficulties.length === 0 || (this.difficulty !== null && rule.difficulties.includes(this.difficulty)))
      && (rule.groupSize === undefined || rule.groupSize === this.groupSize));
    return exact?.total ?? 0;
  }

  #updateShieldDamage(event: CombatEvent, signal: TriggerSignal): void {
    if (event.type !== "damage" || signal.kind !== "damage" || event.target === null) return;
    const targetId = actorId(event.target);
    const amount = event.value.absorbed ?? 0;
    if (amount <= 0) return;
    for (const [key, shield] of this.shields) {
      if (shield.targetId !== targetId) continue;
      shield.remaining = Math.max(0, shield.remaining - amount);
      const window = this.#activeShieldWindows.get(key);
      if (window !== undefined) window.remaining = shield.remaining;
      if (shield.remaining === 0) this.#endShield(key, event.timestamp);
    }
  }

  #endShield(key: string, timestamp: number): void {
    this.shields.delete(key);
    const window = this.#activeShieldWindows.get(key);
    if (window !== undefined) window.endedAt = timestamp;
    this.#activeShieldWindows.delete(key);
  }

  #processLegacyPhase(event: CombatEvent): void {
    if (this.#definition === null || this.#definition.phases.every((phase) => phase.startTrigger !== undefined)) return;
    const targetHpPercent = event.target?.kind === "npc" && event.target.hp !== null && event.target.maxHp !== null && event.target.maxHp > 0
      ? (event.target.hp / event.target.maxHp) * 100
      : null;
    const order = resolveEncounterPhase(this.#definition, {
      bossHpPercent: targetHpPercent,
      abilityName: event.ability?.name ?? null,
      effectName: event.type === "applyEffect" || event.type === "removeEffect" ? event.effect.name : null,
      conditionContext: this.conditionContext(),
    });
    if (order > this.#currentPhaseOrder) this.observeLegacyPhase(order, event.timestamp, "Legacy phase evidence matched.");
  }

  #enterPhase(
    phase: EncounterPhase,
    timestamp: number,
    triggerKind: RuntimePhaseSegment["triggerKind"],
    detail: string,
  ): void {
    const current = this.phaseSegments.at(-1);
    if (current !== undefined && current.endedAt === null) current.endedAt = timestamp;
    this.#previousPhaseId = this.#currentPhaseId;
    this.#currentPhaseId = phase.id ?? String(phase.order);
    this.#currentPhaseOrder = phase.order;
    for (const counterId of phase.resetsCounters ?? []) this.setCounter(counterId, 0);
    this.phaseSegments.push({
      phaseId: this.#currentPhaseId,
      phaseOrder: phase.order,
      startedAt: timestamp,
      endedAt: null,
      triggerKind,
      detail,
    });
  }

  #observePositions(event: CombatEvent): void {
    for (const actor of [event.source, event.target]) {
      if (actor?.position !== null && actor?.position !== undefined) this.positions.set(actorId(actor), actor.position);
    }
  }

  #observeEffects(event: CombatEvent): void {
    if ((event.type !== "applyEffect" && event.type !== "removeEffect") || event.target === null) return;
    const targetId = actorId(event.target);
    const key = `${event.effect.id}:${targetId}`;
    if (event.type === "removeEffect") {
      this.effects.delete(key);
      const window = this.#activeEffectWindows.get(key);
      if (window !== undefined) window.removedAt = event.timestamp;
      this.#activeEffectWindows.delete(key);
      return;
    }
    const effect = {
      effectId: event.effect.id,
      effectName: event.effect.name,
      sourceId: event.source === null ? null : actorId(event.source),
      targetId,
      appliedAt: event.timestamp,
      charges: event.value?.kind === "charges" ? event.value.charges : null,
    };
    this.effects.set(key, effect);
    const prior = this.#activeEffectWindows.get(key);
    if (prior !== undefined) prior.removedAt = event.timestamp;
    const window = { ...effect, removedAt: null };
    this.effectWindows.push(window);
    this.#activeEffectWindows.set(key, window);
  }

  #observeChallenges(event: CombatEvent, localPlayerId: string | null): void {
    for (const definition of this.#definition?.challenges ?? []) {
      const value = this.challenges.get(definition.id);
      if (value === undefined || !this.#challengeConditionsMatch(definition, event, localPlayerId)) continue;
      const source = event.source?.kind === "player" ? event.source : null;
      const target = event.target?.kind === "player" ? event.target : null;
      let player = source;
      let amount = 0;
      switch (definition.metric) {
        case "damage":
          if (event.type === "damage") amount = event.value.amount;
          break;
        case "damage_taken":
          if (event.type === "damage") {
            player = target;
            amount = event.value.amount;
          }
          break;
        case "damage_absorbed":
          if (event.type === "damage") amount = event.value.absorbed ?? 0;
          break;
        case "healing":
          if (event.type === "heal") amount = event.value.amount;
          break;
        case "effective_healing":
          if (event.type === "heal") amount = event.value.effective ?? event.value.amount;
          break;
        case "healing_taken":
          if (event.type === "heal") {
            player = target;
            amount = event.value.effective ?? event.value.amount;
          }
          break;
        case "ability_count":
          if (event.type === "ability" && event.phase === "activate") {
            player = this.#challengeTracksPlayerTarget(definition) ? target : source;
            amount = 1;
          }
          break;
        case "interrupt_count":
          if (event.type === "ability" && event.phase === "interrupt") amount = 1;
          break;
        case "effect_count":
          if (event.type === "applyEffect") {
            player = this.#challengeTracksPlayerTarget(definition) ? target : source;
            amount = 1;
          }
          break;
        case "effect_stacks": {
          player = this.#challengeTracksPlayerTarget(definition) ? target : source;
          if (player === null || (event.type !== "applyEffect" && event.type !== "modifyCharges" && event.type !== "removeEffect")) break;
          const key = `${definition.id}:${player.playerId}`;
          if (!value.byPlayer.has(player.playerId)) value.byPlayer.set(player.playerId, { name: player.name, value: 0 });
          if (event.type === "removeEffect") {
            amount = this.#pendingChallengeStacks.get(key) ?? 0;
            this.#pendingChallengeStacks.delete(key);
          } else {
            const charges = event.type === "modifyCharges" ? event.charges ?? 0 : event.value?.kind === "charges" ? event.value.charges : 1;
            this.#pendingChallengeStacks.set(key, Math.max(this.#pendingChallengeStacks.get(key) ?? 0, charges));
          }
          break;
        }
        default:
          break;
      }
      if (player === null || amount === 0) continue;
      value.firstEventAt ??= event.timestamp;
      value.value += amount;
      value.eventCount += 1;
      const playerValue = value.byPlayer.get(player.playerId) ?? { name: player.name, value: 0 };
      playerValue.value += amount;
      value.byPlayer.set(player.playerId, playerValue);
    }
  }

  #challengeConditionsMatch(definition: EncounterChallengeDefinition, event: CombatEvent, localPlayerId: string | null): boolean {
    return definition.conditions.every((condition) => {
      switch (condition.type) {
        case "phase":
          return Array.isArray(condition.phase_ids) && condition.phase_ids.map(String).includes(this.#currentPhaseId ?? "");
        case "source":
          return this.#challengeEntityMatches(condition.match, event.source, localPlayerId);
        case "target":
          return this.#challengeEntityMatches(condition.match, event.target, localPlayerId);
        case "ability":
          return event.ability !== null && Array.isArray(condition.ability_ids) && condition.ability_ids.map(String).includes(event.ability.id);
        case "effect": {
          const effect = event.type === "applyEffect" || event.type === "removeEffect" || event.type === "modifyCharges" ? event.effect : null;
          return effect !== null && Array.isArray(condition.effect_ids) && condition.effect_ids.map(String).includes(effect.id);
        }
        case "counter":
          return this.#compareChallenge(this.getCounter(String(condition.counter_id)), String(condition.operator ?? "eq"), Number(condition.value));
        case "boss_hp_range": {
          return this.#bossHpConditionMatches(condition);
        }
        default:
          return false;
      }
    });
  }

  #challengeEntityMatches(filter: unknown, actor: Actor | null, localPlayerId: string | null): boolean {
    if (filter === undefined || filter === null || filter === "any") return true;
    if (actor === null) return false;
    if (typeof filter === "string") {
      switch (filter) {
        case "any_player": case "any_player_or_companion": return actor.kind === "player";
        case "local_player": return actor.kind === "player" && actor.playerId === localPlayerId;
        case "other_players": case "other_player": return actor.kind === "player" && actor.playerId !== localPlayerId;
        case "any_except_local": return actorId(actor) !== localPlayerId;
        case "boss": case "any_boss": return actor.kind === "npc" && (this.#definition?.bossNpcIds.includes(actor.npcId) ?? false);
        case "any_add": return actor.kind === "npc" && !(this.#definition?.bossNpcIds.includes(actor.npcId) ?? false);
        case "npc": case "any_npc": return actor.kind === "npc";
        case "current_target": return actorId(actor) === (localPlayerId === null ? null : this.#currentTargets.get(localPlayerId));
        default: return true;
      }
    }
    if (typeof filter !== "object" || Array.isArray(filter)) return false;
    const selector = (filter as Record<string, unknown>).selector;
    return Array.isArray(selector) && selector.some((candidate) => {
      if (actor.kind !== "npc") return false;
      if (typeof candidate === "number") return actor.npcId === String(candidate);
      const expected = String(candidate);
      return actor.npcId === expected
        || actor.name.toLowerCase() === expected.toLowerCase()
        || (this.#definition?.entityNpcIds?.[expected]?.includes(actor.npcId) ?? false);
    });
  }

  #challengeTracksPlayerTarget(definition: EncounterChallengeDefinition): boolean {
    return definition.conditions.some((condition) => condition.type === "target" && ["any_player", "any_player_or_companion", "local_player", "other_players", "other_player"].includes(String(condition.match)));
  }

  #compareChallenge(left: number, operator: string, right: number): boolean {
    switch (operator) {
      case "eq": return left === right;
      case "ne": return left !== right;
      case "lt": return left < right;
      case "lte": return left <= right;
      case "gt": return left > right;
      case "gte": return left >= right;
      default: return false;
    }
  }

  #observeBossHp(event: CombatEvent): void {
    for (const actor of [event.source, event.target]) {
      if (actor?.kind !== "npc" || actor.hp === null || actor.maxHp === null || actor.maxHp <= 0) continue;
      this.#bossHpByNpcId.set(actor.npcId, (actor.hp / actor.maxHp) * 100);
    }
  }

  #hasScopedChallengeConditions(definition: EncounterChallengeDefinition | undefined): boolean {
    return definition?.conditions.some((condition) => condition.type === "counter" || condition.type === "boss_hp_range") ?? false;
  }

  #updateChallengeConditionTracking(timestamp: number): void {
    for (const definition of this.#definition?.challenges ?? []) {
      const value = this.challenges.get(definition.id);
      if (value === undefined || !this.#hasScopedChallengeConditions(definition)) continue;
      const active = definition.conditions
        .filter((condition) => condition.type === "counter" || condition.type === "boss_hp_range")
        .every((condition) => condition.type === "counter"
          ? this.#compareChallenge(this.getCounter(String(condition.counter_id)), String(condition.operator ?? "eq"), Number(condition.value))
          : this.#bossHpConditionMatches(condition));
      if (active && value.conditionActiveSince === null) value.conditionActiveSince = timestamp;
      if (!active && value.conditionActiveSince !== null) {
        value.conditionActiveMs += Math.max(0, timestamp - value.conditionActiveSince);
        value.conditionActiveSince = null;
      }
    }
  }

  #updateEffectStackCounters(localPlayerId: string | null): TriggerSignal[] {
    const changes: TriggerSignal[] = [];
    for (const definition of this.#definition?.counters ?? []) {
      const tracking = definition.trackEffectStacks;
      if (tracking === undefined) continue;
      const effectIds = new Set((tracking.effects ?? []).map(String));
      const values = [...this.effects.values()]
        .filter((effect) => effectIds.size === 0 || effectIds.has(effect.effectId))
        .filter((effect) => tracking.target !== "local_player" || effect.targetId === localPlayerId)
        .map((effect) => effect.charges ?? 1);
      const aggregation = tracking.aggregation ?? "max";
      const next = values.length === 0
        ? 0
        : aggregation === "sum"
          ? values.reduce((total, value) => total + value, 0)
          : aggregation === "min"
            ? Math.min(...values)
            : Math.max(...values);
      const previous = this.getCounter(definition.id);
      if (next === previous) continue;
      this.counters.set(definition.id, next);
      changes.push({ kind: "counterChanged", counterId: definition.id, previousCounterValue: previous, counterValue: next });
    }
    return changes;
  }

  #bossHpConditionMatches(condition: Record<string, unknown>): boolean {
    const npcId = condition.npc_id === undefined ? null : String(condition.npc_id);
    const entries = npcId === null
      ? [...this.#bossHpByNpcId].filter(([id]) => this.#definition?.bossNpcIds.includes(id) ?? false)
      : [[npcId, this.#bossHpByNpcId.get(npcId)] as const];
    return entries.some(([, percent]) => percent !== undefined
      && (condition.min_hp === undefined || percent >= Number(condition.min_hp))
      && (condition.max_hp === undefined || percent <= Number(condition.max_hp)));
  }
}