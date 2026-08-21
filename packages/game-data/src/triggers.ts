import type { MitigationKind, Position } from "@swtor/shared";

export type TriggerSelector =
  | { id: string; name?: string }
  | { id?: never; name: string };

export interface TriggerEntity {
  kind: "player" | "npc";
  id: string;
  npcId: string | null;
  name: string;
  position: Position | null;
}

export type EntityFilter =
  | { kind: "any" }
  | { kind: "player" }
  | { kind: "otherPlayer" }
  | { kind: "notLocal" }
  | { kind: "localPlayer" }
  | { kind: "npc" }
  | { kind: "boss" }
  | { kind: "add" }
  | { kind: "currentTarget" }
  | { kind: "selector"; selectors: TriggerSelector[] };

export interface PositionConstraint {
  entity: "source" | "target";
  axis: "x" | "y" | "z";
  operator: "lt" | "lte" | "eq" | "gte" | "gt";
  value: number;
}

interface FilteredTrigger {
  source?: EntityFilter;
  target?: EntityFilter;
  position?: PositionConstraint[];
}

export type EncounterTrigger =
  | { kind: "combatStart" }
  | { kind: "combatEnd" }
  | ({ kind: "abilityCast"; abilities: TriggerSelector[] } & FilteredTrigger)
  | ({ kind: "effectApplied" | "effectRemoved"; effects: TriggerSelector[] } & FilteredTrigger)
  | ({ kind: "damageTaken" | "damageDealt"; abilities: TriggerSelector[]; mitigation?: MitigationKind[] } & FilteredTrigger)
  | ({ kind: "healingTaken" | "healingDealt"; abilities: TriggerSelector[] } & FilteredTrigger)
  | { kind: "chargesChanged"; effects: TriggerSelector[]; direction?: "increase" | "decrease" }
  | { kind: "selfChargesChanged"; direction?: "increase" | "decrease" }
  | ({ kind: "threatModified"; abilities: TriggerSelector[]; threat?: number } & FilteredTrigger)
  | { kind: "bossHpBelow" | "bossHpAbove"; percent: number; selector?: TriggerSelector[] }
  | { kind: "npcAppears" | "entityDeath"; selector: TriggerSelector[]; position?: PositionConstraint[] }
  | { kind: "targetSet"; selector: TriggerSelector[]; target?: EntityFilter }
  | { kind: "phaseEntered" | "phaseEnded"; phaseId: string }
  | { kind: "anyPhaseChange" }
  | { kind: "counterReaches"; counterId: string; value: number }
  | { kind: "counterChanges"; counterId: string }
  | { kind: "timerExpires" | "timerStarted" | "timerCanceled"; timerId: string }
  | { kind: "timeElapsed"; seconds: number }
  | { kind: "manual" | "never" }
  | { kind: "anyOf"; conditions: EncounterTrigger[] };

export interface TriggerSignal {
  kind:
    | "combatStart"
    | "combatEnd"
    | "abilityCast"
    | "effectApplied"
    | "effectRemoved"
    | "damage"
    | "healing"
    | "chargesChanged"
    | "threatModified"
    | "bossHp"
    | "npcAppears"
    | "entityDeath"
    | "targetSet"
    | "phaseEntered"
    | "phaseEnded"
    | "counterChanged"
    | "timerExpires"
    | "timerStarted"
    | "timerCanceled"
    | "timeElapsed"
    | "manual";
  source?: TriggerEntity | null;
  target?: TriggerEntity | null;
  entity?: TriggerEntity | null;
  ability?: { id: string; name: string } | null;
  effect?: { id: string; name: string } | null;
  previousCharges?: number | null;
  charges?: number | null;
  mitigation?: MitigationKind | null;
  threat?: number | null;
  bossHpPercent?: number | null;
  phaseId?: string | null;
  counterId?: string | null;
  previousCounterValue?: number | null;
  counterValue?: number | null;
  timerId?: string | null;
  previousElapsedMs?: number;
  elapsedMs?: number;
  localPlayerId?: string | null;
  currentTargetId?: string | null;
  isBossNpcId?: (npcId: string) => boolean;
}

const normalise = (value: string): string => value.trim().toLowerCase();

function selectorMatches(selector: TriggerSelector, id: string | null, name: string): boolean {
  if (selector.id !== undefined) return id === selector.id;
  return normalise(name) === normalise(selector.name);
}

function selectorsMatch(selectors: TriggerSelector[], id: string | null, name: string): boolean {
  return selectors.length === 0 || selectors.some((selector) => selectorMatches(selector, id, name));
}

function entityMatches(filter: EntityFilter | undefined, entity: TriggerEntity | null | undefined, signal: TriggerSignal): boolean {
  if (filter === undefined || filter.kind === "any") return true;
  if (entity === null || entity === undefined) return false;
  switch (filter.kind) {
    case "player":
      return entity.kind === "player";
    case "otherPlayer":
      return entity.kind === "player" && entity.id !== signal.localPlayerId;
    case "notLocal":
      return entity.id !== signal.localPlayerId;
    case "localPlayer":
      return entity.kind === "player" && entity.id === signal.localPlayerId;
    case "npc":
      return entity.kind === "npc";
    case "boss":
      return entity.npcId !== null && (signal.isBossNpcId?.(entity.npcId) ?? false);
    case "add":
      return entity.npcId !== null && !(signal.isBossNpcId?.(entity.npcId) ?? false);
    case "currentTarget":
      return entity.id === signal.currentTargetId;
    case "selector":
      return selectorsMatch(filter.selectors, entity.npcId, entity.name);
  }
}

function comparePosition(actual: number, operator: PositionConstraint["operator"], expected: number): boolean {
  switch (operator) {
    case "lt": return actual < expected;
    case "lte": return actual <= expected;
    case "eq": return actual === expected;
    case "gte": return actual >= expected;
    case "gt": return actual > expected;
  }
}

function positionsMatch(constraints: PositionConstraint[] | undefined, signal: TriggerSignal): boolean {
  return (constraints ?? []).every((constraint) => {
    const entity = constraint.entity === "source" ? signal.source : signal.target;
    const actual = entity?.position?.[constraint.axis];
    return actual !== undefined && comparePosition(actual, constraint.operator, constraint.value);
  });
}

function filteredTriggerMatches(trigger: FilteredTrigger, signal: TriggerSignal): boolean {
  return entityMatches(trigger.source, signal.source, signal)
    && entityMatches(trigger.target, signal.target, signal)
    && positionsMatch(trigger.position, signal);
}

function abilityMatches(trigger: { abilities: TriggerSelector[] } & FilteredTrigger, signal: TriggerSignal): boolean {
  return signal.ability !== null
    && signal.ability !== undefined
    && selectorsMatch(trigger.abilities, signal.ability.id, signal.ability.name)
    && filteredTriggerMatches(trigger, signal);
}

export function matchesEncounterTrigger(trigger: EncounterTrigger, signal: TriggerSignal): boolean {
  switch (trigger.kind) {
    case "combatStart": return signal.kind === "combatStart";
    case "combatEnd": return signal.kind === "combatEnd";
    case "abilityCast": return signal.kind === "abilityCast" && abilityMatches(trigger, signal);
    case "effectApplied":
    case "effectRemoved":
      return signal.kind === trigger.kind
        && signal.effect !== null
        && signal.effect !== undefined
        && selectorsMatch(trigger.effects, signal.effect.id, signal.effect.name)
        && filteredTriggerMatches(trigger, signal);
    case "damageTaken":
    case "damageDealt":
      return signal.kind === "damage"
        && abilityMatches(trigger, signal)
        && (trigger.mitigation === undefined || trigger.mitigation.length === 0 || (signal.mitigation !== null && signal.mitigation !== undefined && trigger.mitigation.includes(signal.mitigation)));
    case "healingTaken":
    case "healingDealt":
      return signal.kind === "healing" && abilityMatches(trigger, signal);
    case "chargesChanged":
    case "selfChargesChanged": {
      if (signal.kind !== "chargesChanged") return false;
      if (trigger.kind === "chargesChanged" && (signal.effect === null || signal.effect === undefined || !selectorsMatch(trigger.effects, signal.effect.id, signal.effect.name))) return false;
      if (trigger.direction === undefined || signal.previousCharges === null || signal.previousCharges === undefined || signal.charges === null || signal.charges === undefined) return true;
      return trigger.direction === "increase" ? signal.charges > signal.previousCharges : signal.charges < signal.previousCharges;
    }
    case "threatModified":
      return signal.kind === "threatModified"
        && abilityMatches(trigger, signal)
        && (trigger.threat === undefined || signal.threat === trigger.threat);
    case "bossHpBelow":
    case "bossHpAbove": {
      if (signal.kind !== "bossHp" || signal.bossHpPercent === null || signal.bossHpPercent === undefined) return false;
      const entity = signal.entity ?? signal.target;
      if (trigger.selector !== undefined && (entity === null || entity === undefined || !selectorsMatch(trigger.selector, entity.npcId, entity.name))) return false;
      return trigger.kind === "bossHpBelow" ? signal.bossHpPercent <= trigger.percent : signal.bossHpPercent >= trigger.percent;
    }
    case "npcAppears":
    case "entityDeath": {
      if (signal.kind !== trigger.kind) return false;
      const entity = signal.entity ?? signal.target;
      return entity !== null
        && entity !== undefined
        && selectorsMatch(trigger.selector, entity.npcId, entity.name)
        && positionsMatch(trigger.position, { ...signal, source: entity, target: entity });
    }
    case "targetSet": {
      const entity = signal.entity ?? signal.source;
      return signal.kind === "targetSet"
        && entity !== null
        && entity !== undefined
        && selectorsMatch(trigger.selector, entity.npcId, entity.name)
        && entityMatches(trigger.target, signal.target, signal);
    }
    case "phaseEntered": return signal.kind === "phaseEntered" && signal.phaseId === trigger.phaseId;
    case "phaseEnded": return signal.kind === "phaseEnded" && signal.phaseId === trigger.phaseId;
    case "anyPhaseChange": return signal.kind === "phaseEntered" || signal.kind === "phaseEnded";
    case "counterReaches":
      return signal.kind === "counterChanged"
        && signal.counterId === trigger.counterId
        && signal.counterValue === trigger.value
        && signal.previousCounterValue !== trigger.value;
    case "counterChanges": return signal.kind === "counterChanged" && signal.counterId === trigger.counterId;
    case "timerExpires": return signal.kind === "timerExpires" && signal.timerId === trigger.timerId;
    case "timerStarted": return signal.kind === "timerStarted" && signal.timerId === trigger.timerId;
    case "timerCanceled": return signal.kind === "timerCanceled" && signal.timerId === trigger.timerId;
    case "timeElapsed": {
      if (signal.kind !== "timeElapsed" || signal.elapsedMs === undefined) return false;
      const threshold = trigger.seconds * 1000;
      return signal.elapsedMs >= threshold && (signal.previousElapsedMs ?? 0) < threshold;
    }
    case "manual": return signal.kind === "manual";
    case "never": return false;
    case "anyOf": return trigger.conditions.some((condition) => matchesEncounterTrigger(condition, signal));
  }
}