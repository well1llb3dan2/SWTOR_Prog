/**
 * Stable SWTOR internal identifiers observed in 7.0 combat logs.
 *
 * These are the numeric ids inside `{...}` braces. They are stable across
 * clients and locales, which makes them the correct thing to branch on --
 * the human-readable names beside them are localised and must never be used
 * for control flow.
 */

/** Top-level effect categories (slot 5, before the colon). */
export const EffectCategoryId = {
  Event: "836045448945472",
  Spend: "836045448945473",
  Restore: "836045448945476",
  ApplyEffect: "836045448945477",
  RemoveEffect: "836045448945478",
  ModifyCharges: "836045448953666",
  AreaEntered: "836045448953664",
  DisciplineChanged: "836045448953665",
} as const;

/** Subtypes that appear after `Event {836045448945472}:`. */
export const EventTypeId = {
  AbilityActivate: "836045448945479",
  AbilityDeactivate: "836045448945480",
  AbilityCancel: "836045448945481",
  AbilityInterrupt: "836045448945482",
  ModifyThreat: "836045448945483",
  FallingDamage: "836045448945484",
  LeaveCover: "836045448945486",
  Crouch: "836045448945487",
  Taunt: "836045448945488",
  EnterCombat: "836045448945489",
  ExitCombat: "836045448945490",
  Death: "836045448945493",
  Revived: "836045448945494",
  FailedEffect: "836045448945499",
  TargetSet: "836045448953668",
  TargetCleared: "836045448953669",
} as const;

/** Effect names that appear after `ApplyEffect {836045448945477}:`. */
export const EffectId = {
  Damage: "836045448945501",
  Heal: "836045448945500",
  Absorbed: "836045448945511",
  Charges: "836045448953667",
  Reflected: "836045448953649",
} as const;

export const DamageTypeId = {
  kinetic: "836045448940873",
  energy: "836045448940874",
  elemental: "836045448940875",
  internal: "836045448940876",
} as const;

/**
 * Difficulty ids are not stable across group sizes -- `8 Player Veteran` and
 * `4 Player Veteran` carry different ids. Parse the accompanying text instead
 * of matching on these; they are recorded for completeness only.
 */
export const DifficultyId = {
  Story8: "836045448953651",
  Veteran8: "836045448953652",
  Veteran4: "836045448953657",
} as const;

export type EffectCategoryIdValue = (typeof EffectCategoryId)[keyof typeof EffectCategoryId];
export type EventTypeIdValue = (typeof EventTypeId)[keyof typeof EventTypeId];
