import { DamageTypeId, DefenseTypeId, EffectId, type DamageType, type MitigationKind, type ParsedValue } from "@swtor/shared";

const DAMAGE_TYPE_BY_ID = new Map<string, DamageType>(
  Object.entries(DamageTypeId).map(([name, id]) => [id, name as DamageType]),
);
const DEFENSE_TYPE_BY_ID = new Map<string, MitigationKind>(
  Object.entries(DefenseTypeId).map(([name, id]) => [id, name as MitigationKind]),
);

const DAMAGE_TYPES = new Set<string>(["kinetic", "energy", "internal", "elemental"]);

const MITIGATION_KINDS = new Set<string>([
  "miss",
  "dodge",
  "parry",
  "deflect",
  "immune",
  "resist",
  "shield",
]);

const AMOUNT = /^(-?\d+(?:\.\d+)?)(\*)?/;
const EFFECTIVE = /^\s*~\s*(-?\d+(?:\.\d+)?)/;
/** `(<label> {id})`, label locale-dependent; classify by id, not text. */
const REFLECTED = /^\s*\([^{}]*\{(\d+)\}\)/;
/** `(<amount> <label> {id})`, label locale-dependent; classify by id. */
const ABSORBED = /^\s*\((-?\d+(?:\.\d+)?)\s*[^{}]*\{(\d+)\}\)/;
const MITIGATION = /^\s*-\s*([^{}\s][^{}]*)?\s*(?:\{(\d+)\})?/;
const TYPE_TOKEN = /^\s*([^\s{}-][^\s{}]*)\s*\{(\d+)\}/;

/**
 * Parses the parenthesised value group.
 *
 * Observed shapes, all handled by the same cursor:
 *   `3.0`                                        bare resource / falling damage
 *   `4 charges {…}`                              stack count
 *   `4890 ~0`                                    heal, fully overhealed
 *   `11363* ~11360 energy {…}`                   critical hit
 *   `1234 kinetic {…} -shield {…} (878 absorbed {…})`
 *   `1865 kinetic {…}(reflected {…})`
 *   `0 -`                                        avoided, reason omitted
 *
 * `amount` is the rolled magnitude; `effective` is the `~` token, which is the
 * health actually applied to the target. Where both exist the `~` value is the
 * one that reconciles against observed health deltas.
 */
export function parseValueGroup(group: string | null): ParsedValue | null {
  if (group === null) return null;
  let rest = group.trim();
  if (rest.length === 0) return null;

  const amountMatch = AMOUNT.exec(rest);
  if (amountMatch === null) return null;
  const amount = Number.parseFloat(amountMatch[1]!);
  const critical = amountMatch[2] === "*";
  rest = rest.slice(amountMatch[0].length);

  let effective: number | null = null;
  const effectiveMatch = EFFECTIVE.exec(rest);
  if (effectiveMatch !== null) {
    effective = Number.parseFloat(effectiveMatch[1]!);
    rest = rest.slice(effectiveMatch[0].length);
  }

  let damageType: DamageType | null = null;
  let mitigation: MitigationKind | null = null;
  let absorbed: number | null = null;
  let reflected = false;
  let charges = false;

  while (rest.trim().length > 0) {
    // Ids are stable across locales; only fall back to the label when an id
    // is missing or not yet catalogued (never trust the label alone).
    const reflectedMatch = REFLECTED.exec(rest);
    if (reflectedMatch !== null && reflectedMatch[1] === EffectId.Reflected) {
      reflected = true;
      rest = rest.slice(reflectedMatch[0].length);
      continue;
    }

    const absorbedMatch = ABSORBED.exec(rest);
    if (absorbedMatch !== null && absorbedMatch[2] === EffectId.Absorbed) {
      absorbed = Number.parseFloat(absorbedMatch[1]!);
      rest = rest.slice(absorbedMatch[0].length);
      continue;
    }

    const typeMatch = TYPE_TOKEN.exec(rest);
    if (typeMatch !== null) {
      const token = typeMatch[1]!.toLowerCase();
      if (token === "charges") charges = true;
      else damageType = DAMAGE_TYPE_BY_ID.get(typeMatch[2]!) ?? (DAMAGE_TYPES.has(token) ? (token as DamageType) : damageType);
      rest = rest.slice(typeMatch[0].length);
      continue;
    }

    const mitigationMatch = MITIGATION.exec(rest);
    if (mitigationMatch !== null && mitigationMatch[0].trim().length > 0) {
      const token = (mitigationMatch[1] ?? "").trim().toLowerCase();
      const byId = mitigationMatch[2] !== undefined ? DEFENSE_TYPE_BY_ID.get(mitigationMatch[2]) : undefined;
      mitigation = byId ?? (MITIGATION_KINDS.has(token) ? (token as MitigationKind) : "unknown");
      rest = rest.slice(mitigationMatch[0].length);
      continue;
    }

    // Unrecognised trailing token: stop rather than loop forever.
    break;
  }

  if (charges) return { kind: "charges", charges: amount };
  return {
    kind: "magnitude",
    amount,
    effective,
    critical,
    damageType,
    mitigation,
    absorbed,
    reflected,
  };
}
