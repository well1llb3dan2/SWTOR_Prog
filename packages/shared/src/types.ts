export interface Position {
  x: number;
  y: number;
  z: number;
  facing: number;
}

export interface PlayerActor {
  kind: "player";
  /** Character name, may contain non-ASCII glyphs. */
  name: string;
  /** Stable per-character id from `@Name#12345`. */
  playerId: string;
  position: Position | null;
  hp: number | null;
  maxHp: number | null;
}

export interface NpcActor {
  kind: "npc";
  name: string;
  /** Shared by every spawn of the same NPC type. */
  npcId: string;
  /** Unique per spawn; distinguishes individual adds. */
  instanceId: string | null;
  position: Position | null;
  hp: number | null;
  maxHp: number | null;
}

export type Actor = PlayerActor | NpcActor;

/** A localised name paired with its stable numeric id. */
export interface NamedEntity {
  name: string;
  id: string;
}

export type DamageType = "kinetic" | "energy" | "internal" | "elemental";

/**
 * Why an attack landed for less than its full amount. `shield` still applies
 * partial damage; the rest are full avoidance. `unknown` covers the bare `-`
 * marker the client emits when it omits the reason.
 */
export type MitigationKind =
  "miss" | "dodge" | "parry" | "deflect" | "immune" | "resist" | "shield" | "unknown";

/**
 * The parenthesised value group.
 *
 * `amount` is the raw magnitude the client rolled. `effective` is the `~N`
 * token: the health actually applied to the target after absorption and
 * overheal. Where both are present, `effective` is the figure that reconciles
 * against observed health deltas, so metrics should prefer it and fall back to
 * `amount` only when it is absent.
 */
export interface MagnitudeValue {
  kind: "magnitude";
  amount: number;
  effective: number | null;
  critical: boolean;
  damageType: DamageType | null;
  mitigation: MitigationKind | null;
  absorbed: number | null;
  reflected: boolean;
}

export interface ChargesValue {
  kind: "charges";
  charges: number;
}

export type ParsedValue = MagnitudeValue | ChargesValue;

export type Difficulty = "Story" | "Veteran" | "Master";
export type GroupSize = 4 | 8 | 16;
export type Role = "tank" | "healer" | "dps";

export interface EventContext {
  /** Epoch milliseconds, reconstructed from the log filename date plus line time. */
  timestamp: number;
  /** 1-based position in the source file, for traceability back to the raw log. */
  lineNumber: number;
  source: Actor | null;
  target: Actor | null;
  ability: NamedEntity | null;
  /** Threat delta from the trailing `<N>` token; negative values occur. */
  threat: number | null;
}

interface Base<T extends string> extends EventContext {
  type: T;
}

export interface DamageEvent extends Base<"damage"> {
  value: MagnitudeValue;
}

export interface HealEvent extends Base<"heal"> {
  value: MagnitudeValue;
}

export interface ApplyEffectEvent extends Base<"applyEffect"> {
  effect: NamedEntity;
  value: ParsedValue | null;
}

export interface RemoveEffectEvent extends Base<"removeEffect"> {
  effect: NamedEntity;
}

export interface ModifyChargesEvent extends Base<"modifyCharges"> {
  effect: NamedEntity;
  charges: number | null;
}

export interface ResourceEvent extends Base<"resource"> {
  direction: "spend" | "restore";
  resource: NamedEntity;
  amount: number;
}

export interface AbilityEvent extends Base<"ability"> {
  phase: "activate" | "deactivate" | "cancel" | "interrupt";
}

export interface CombatStateEvent extends Base<"combatState"> {
  state: "enter" | "exit";
}

export interface DeathEvent extends Base<"death"> {
  /** True once the actor is back up; emitted as a separate Revived event. */
  revived: false;
}

export interface RevivedEvent extends Base<"revived"> {
  revived: true;
}

export interface TargetEvent extends Base<"target"> {
  state: "set" | "cleared";
}

export interface TauntEvent extends Base<"taunt"> {
  _tag?: never;
}

export interface ThreatEvent extends Base<"threat"> {
  _tag?: never;
}

export interface FallingDamageEvent extends Base<"fallingDamage"> {
  amount: number;
}

export interface AreaEnteredEvent extends Base<"areaEntered"> {
  zone: NamedEntity;
  groupSize: GroupSize | null;
  difficulty: Difficulty | null;
  logVersion: string | null;
}

export interface DisciplineChangedEvent extends Base<"disciplineChanged"> {
  advancedClass: NamedEntity;
  discipline: NamedEntity;
  role: Role | null;
}

/** Structurally valid but not modelled: LeaveCover, Crouch, FailedEffect, etc. */
export interface OtherEvent extends Base<"other"> {
  category: NamedEntity;
  effect: NamedEntity | null;
  value: ParsedValue | null;
}

/** A line the scanner could not decompose. Never thrown -- always surfaced. */
export interface UnknownEvent extends Base<"unknown"> {
  raw: string;
  reason: string;
}

export type CombatEvent =
  | DamageEvent
  | HealEvent
  | ApplyEffectEvent
  | RemoveEffectEvent
  | ModifyChargesEvent
  | ResourceEvent
  | AbilityEvent
  | CombatStateEvent
  | DeathEvent
  | RevivedEvent
  | TargetEvent
  | TauntEvent
  | ThreatEvent
  | FallingDamageEvent
  | AreaEnteredEvent
  | DisciplineChangedEvent
  | OtherEvent
  | UnknownEvent;

export type CombatEventType = CombatEvent["type"];
