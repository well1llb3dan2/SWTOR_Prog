import {
  EffectCategoryId,
  EffectId,
  EventTypeId,
  roleForDiscipline,
  type CombatEvent,
  type Difficulty,
  type EventContext,
  type GroupSize,
  type MagnitudeValue,
  type NamedEntity,
} from "@swtor/shared";
import { parseActor, parseNamedEntity, SELF } from "./actor.js";
import { scanLine, type ScannedLine } from "./scanner.js";
import { parseValueGroup } from "./value.js";

/** `Category {id}: Remainder` */
const EFFECT_SLOT = /^(.*?)\s*\{(\d+)\}:\s*(.*)$/;
/** `Zone {id}` optionally followed by `8 Player Veteran {id}`. */
const AREA = /^(.*?)\s*\{(\d+)\}(?:\s+(\d+)\s+Player\s+([A-Za-z]+)\s*\{(\d+)\})?$/;
const NUMERIC = /^-?\d+(?:\.\d+)?$/;

const EMPTY_MAGNITUDE: MagnitudeValue = {
  kind: "magnitude",
  amount: 0,
  effective: null,
  critical: false,
  damageType: null,
  mitigation: null,
  absorbed: null,
  reflected: false,
};

function unknown(context: EventContext, raw: string, reason: string): CombatEvent {
  return { ...context, type: "unknown", raw, reason };
}

function asMagnitude(value: ReturnType<typeof parseValueGroup>): MagnitudeValue {
  return value !== null && value.kind === "magnitude" ? value : EMPTY_MAGNITUDE;
}

function toGroupSize(raw: string | undefined): GroupSize | null {
  const n = Number(raw);
  return n === 4 || n === 8 || n === 16 ? n : null;
}

function toDifficulty(raw: string | undefined): Difficulty | null {
  if (raw === "Story" || raw === "Veteran" || raw === "Master") return raw;
  return null;
}

/**
 * Converts one scanned line into a typed event.
 *
 * Any line that cannot be classified becomes an `UnknownEvent` carrying the
 * original text. Parsing never throws, because a single unrecognised line in a
 * live raid must not take down the stream.
 */
function classify(scan: ScannedLine, context: EventContext, raw: string): CombatEvent {
  const effectMatch = EFFECT_SLOT.exec(scan.effect.trim());
  if (effectMatch === null) {
    return unknown(context, raw, "effect slot did not match `Category {id}: …`");
  }

  const category: NamedEntity = { name: effectMatch[1]!.trim(), id: effectMatch[2]! };
  const remainder = effectMatch[3]!.trim();

  switch (category.id) {
    case EffectCategoryId.AreaEntered: {
      const area = AREA.exec(remainder);
      if (area === null) return unknown(context, raw, "unparseable AreaEntered payload");
      return {
        ...context,
        type: "areaEntered",
        zone: { name: area[1]!.trim(), id: area[2]! },
        serverId: scan.value ?? null,
        groupSize: toGroupSize(area[3]),
        difficulty: toDifficulty(area[4]),
        logVersion: scan.trailing,
      };
    }

    case EffectCategoryId.DisciplineChanged: {
      const slash = remainder.indexOf("}/");
      if (slash === -1) return unknown(context, raw, "unparseable DisciplineChanged payload");
      const advancedClass = parseNamedEntity(remainder.slice(0, slash + 1));
      const discipline = parseNamedEntity(remainder.slice(slash + 2));
      if (advancedClass === null || discipline === null) {
        return unknown(context, raw, "unparseable DisciplineChanged payload");
      }
      return {
        ...context,
        type: "disciplineChanged",
        advancedClass,
        discipline,
        role: roleForDiscipline(discipline.name),
      };
    }

    case EffectCategoryId.Spend:
    case EffectCategoryId.Restore: {
      const resource = parseNamedEntity(remainder);
      const value = parseValueGroup(scan.value);
      if (resource === null) return unknown(context, raw, "resource event without a resource");
      return {
        ...context,
        type: "resource",
        direction: category.id === EffectCategoryId.Spend ? "spend" : "restore",
        resource,
        amount: value !== null && value.kind === "magnitude" ? value.amount : 0,
      };
    }

    case EffectCategoryId.ModifyCharges: {
      const effect = parseNamedEntity(remainder);
      const value = parseValueGroup(scan.value);
      if (effect === null) return unknown(context, raw, "ModifyCharges without an effect");
      return {
        ...context,
        type: "modifyCharges",
        effect,
        charges: value !== null && value.kind === "charges" ? value.charges : null,
      };
    }

    case EffectCategoryId.RemoveEffect: {
      const effect = parseNamedEntity(remainder);
      if (effect === null) return unknown(context, raw, "RemoveEffect without an effect");
      return { ...context, type: "removeEffect", effect };
    }

    case EffectCategoryId.ApplyEffect: {
      const effect = parseNamedEntity(remainder);
      if (effect === null) return unknown(context, raw, "ApplyEffect without an effect");
      const value = parseValueGroup(scan.value);
      if (effect.id === EffectId.Damage) {
        return { ...context, type: "damage", value: asMagnitude(value) };
      }
      if (effect.id === EffectId.Heal) {
        return { ...context, type: "heal", value: asMagnitude(value) };
      }
      return { ...context, type: "applyEffect", effect, value };
    }

    case EffectCategoryId.Event: {
      const effect = parseNamedEntity(remainder);
      if (effect === null) return unknown(context, raw, "Event without a subtype");
      switch (effect.id) {
        case EventTypeId.AbilityActivate:
          return { ...context, type: "ability", phase: "activate" };
        case EventTypeId.AbilityDeactivate:
          return { ...context, type: "ability", phase: "deactivate" };
        case EventTypeId.AbilityCancel:
          return { ...context, type: "ability", phase: "cancel" };
        case EventTypeId.AbilityInterrupt:
          return { ...context, type: "ability", phase: "interrupt" };
        case EventTypeId.EnterCombat:
          return { ...context, type: "combatState", state: "enter" };
        case EventTypeId.ExitCombat:
          return { ...context, type: "combatState", state: "exit" };
        case EventTypeId.Death:
          return { ...context, type: "death", revived: false };
        case EventTypeId.Revived:
          return { ...context, type: "revived", revived: true };
        case EventTypeId.TargetSet:
          return { ...context, type: "target", state: "set" };
        case EventTypeId.TargetCleared:
          return { ...context, type: "target", state: "cleared" };
        case EventTypeId.Taunt:
          return { ...context, type: "taunt" };
        case EventTypeId.ModifyThreat:
          return { ...context, type: "threat" };
        case EventTypeId.FallingDamage: {
          const value = parseValueGroup(scan.value);
          return {
            ...context,
            type: "fallingDamage",
            amount: value !== null && value.kind === "magnitude" ? value.amount : 0,
          };
        }
        default:
          return {
            ...context,
            type: "other",
            category,
            effect,
            value: parseValueGroup(scan.value),
          };
      }
    }

    default:
      return {
        ...context,
        type: "other",
        category,
        effect: parseNamedEntity(remainder),
        value: parseValueGroup(scan.value),
      };
  }
}

export interface ParseLineOptions {
  /** Epoch ms for this line, already resolved by the timeline clock. */
  timestamp: number;
  lineNumber: number;
}

export function parseLine(raw: string, options: ParseLineOptions): CombatEvent | null {
  const scan = scanLine(raw);
  const base: EventContext = {
    timestamp: options.timestamp,
    lineNumber: options.lineNumber,
    source: null,
    target: null,
    ability: null,
    threat: null,
  };

  if (scan === null) {
    return raw.trim().length === 0 ? null : unknown(base, raw, "line has no bracket slots");
  }

  const source = parseActor(scan.source);
  const rawTarget = parseActor(scan.target);
  const resolvedSource = source === SELF ? null : source;
  const target = rawTarget === SELF ? resolvedSource : rawTarget;

  const context: EventContext = {
    ...base,
    source: resolvedSource,
    target,
    ability: parseNamedEntity(scan.ability),
    threat: scan.trailing !== null && NUMERIC.test(scan.trailing) ? Number(scan.trailing) : null,
  };

  return classify(scan, context, raw);
}
