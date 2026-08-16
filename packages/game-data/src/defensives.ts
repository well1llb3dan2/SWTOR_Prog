export type DefensiveCategory = "self" | "reflect" | "absorb" | "external" | "threat";

export interface DefensiveAbility {
  name: string;
  /** Effect id observed in real logs; null where only the name is known. */
  id: string | null;
  category: DefensiveCategory;
}

/**
 * Abilities worth surfacing in a death audit.
 *
 * Every entry with an id was observed being applied in `samples/combat-logs/`,
 * so the id is a fact rather than a guess. The id-less entries are Imperial
 * mirrors of verified Republic abilities that the corpus happens not to cover;
 * they match on name until a log proves an id.
 */
const VERIFIED: DefensiveAbility[] = [
  { name: "Saber Ward", id: "807793154064384", category: "self" },
  { name: "Force Barrier", id: "3120895035965440", category: "self" },
  { name: "Warding Call", id: "812483258351616", category: "self" },
  { name: "Enure", id: "2211126473392128", category: "self" },
  { name: "Blade Turning", id: "2312058204848128", category: "self" },
  { name: "Deflection", id: "812719481552896", category: "self" },
  { name: "Resilience", id: "812822560768000", category: "self" },
  { name: "Reactive Shield", id: "801329228284194", category: "self" },
  { name: "Energy Shield", id: "3067551542149120", category: "self" },
  { name: "Shield Probe", id: "3144233888252165", category: "absorb" },
  { name: "Evasion", id: "2816081206968320", category: "self" },
  { name: "Endure Pain", id: "2211074933784576", category: "self" },
  { name: "Guarded by the Force", id: "2528571801206784", category: "self" },
  { name: "Rebuke", id: "2480816059842560", category: "self" },
  { name: "Saber Reflect", id: "3126160665870336", category: "reflect" },
  { name: "Sonic Rebounder", id: "801354998088314", category: "reflect" },
  { name: "Force Camouflage", id: "3488183459250176", category: "self" },
  { name: "Diversion", id: "801273393709056", category: "self" },
  { name: "Blade Blitz", id: "3618351033090048", category: "self" },
  { name: "Mad Dash", id: "3602532668538880", category: "self" },
  { name: "Phase Walk", id: "3200416355450880", category: "self" },
  { name: "Adrenaline Rush", id: "801251918872576", category: "self" },
  { name: "Battle Readiness", id: "979849543942144", category: "self" },
  { name: "Focused Defense", id: "2793700132388864", category: "self" },
  { name: "Blazing Ward", id: "3466347845517312", category: "absorb" },
  { name: "Warding Shield", id: "4661839107457304", category: "absorb" },
  { name: "Guard", id: "1775934617157632", category: "external" },
  { name: "Taunt", id: "801316343382296", category: "threat" },
];

/** Imperial mirrors of the above; name-matched until a log supplies an id. */
const MIRRORS: DefensiveAbility[] = [
  { name: "Force Shroud", id: null, category: "self" },
  { name: "Undying Rage", id: null, category: "self" },
  { name: "Cloak of Pain", id: null, category: "self" },
  { name: "Invincible", id: null, category: "self" },
  { name: "Entrench", id: null, category: "self" },
  { name: "Hunker Down", id: null, category: "self" },
  { name: "Kolto Overload", id: null, category: "self" },
  { name: "Overcharge Saber", id: null, category: "self" },
];

export const DEFENSIVE_ABILITIES: readonly DefensiveAbility[] = [...VERIFIED, ...MIRRORS];

const BY_ID = new Map(DEFENSIVE_ABILITIES.filter((a) => a.id !== null).map((a) => [a.id!, a]));
const BY_NAME = new Map(DEFENSIVE_ABILITIES.map((a) => [a.name.toLowerCase(), a]));

/** Matches on id first, since names are localised. */
export function findDefensive(id: string | null, name: string | null): DefensiveAbility | null {
  if (id !== null) {
    const byId = BY_ID.get(id);
    if (byId !== undefined) return byId;
  }
  if (name !== null) return BY_NAME.get(name.trim().toLowerCase()) ?? null;
  return null;
}

export function isDefensive(id: string | null, name: string | null): boolean {
  return findDefensive(id, name) !== null;
}
