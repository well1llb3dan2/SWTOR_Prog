import type { DamageType, MitigationKind, ParsedValue } from "@swtor/shared";

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
const REFLECTED = /^\s*\(reflected\s*\{(\d+)\}\)/;
const ABSORBED = /^\s*\((-?\d+(?:\.\d+)?)\s+absorbed\s*\{(\d+)\}\)/;
const MITIGATION = /^\s*-\s*([a-zA-Z]*)\s*(?:\{(\d+)\})?/;
const TYPE_TOKEN = /^\s*([a-zA-Z]+)\s*\{(\d+)\}/;

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
    const reflectedMatch = REFLECTED.exec(rest);
    if (reflectedMatch !== null) {
      reflected = true;
      rest = rest.slice(reflectedMatch[0].length);
      continue;
    }

    const absorbedMatch = ABSORBED.exec(rest);
    if (absorbedMatch !== null) {
      absorbed = Number.parseFloat(absorbedMatch[1]!);
      rest = rest.slice(absorbedMatch[0].length);
      continue;
    }

    const typeMatch = TYPE_TOKEN.exec(rest);
    if (typeMatch !== null) {
      const token = typeMatch[1]!.toLowerCase();
      if (token === "charges") charges = true;
      else if (DAMAGE_TYPES.has(token)) damageType = token as DamageType;
      rest = rest.slice(typeMatch[0].length);
      continue;
    }

    const mitigationMatch = MITIGATION.exec(rest);
    if (mitigationMatch !== null && mitigationMatch[0].trim().length > 0) {
      const token = (mitigationMatch[1] ?? "").toLowerCase();
      mitigation = MITIGATION_KINDS.has(token) ? (token as MitigationKind) : "unknown";
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
