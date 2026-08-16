import type { Role } from "./types.js";

/**
 * Discipline -> role for all 48 disciplines (16 advanced classes x 3).
 *
 * Keyed by the discipline's English name because the log's discipline ids are
 * not published anywhere authoritative. Non-English clients will fall through
 * to `null`; when that becomes a real requirement, back-fill the id table from
 * observed logs and switch the lookup to ids.
 */
const TANK_DISCIPLINES = [
  "Defense", // Jedi Guardian
  "Immortal", // Sith Juggernaut
  "Kinetic Combat", // Jedi Shadow
  "Darkness", // Sith Assassin
  "Shield Specialist", // Trooper Vanguard
  "Shield Tech", // Bounty Hunter Powertech
] as const;

const HEALER_DISCIPLINES = [
  "Seer", // Jedi Sage
  "Corruption", // Sith Sorcerer
  "Combat Medic", // Trooper Commando
  "Bodyguard", // Bounty Hunter Mercenary
  "Sawbones", // Smuggler Scoundrel
  "Medicine", // Imperial Agent Operative
] as const;

const DPS_DISCIPLINES = [
  // Jedi Knight / Sith Warrior
  "Vigilance",
  "Focus",
  "Watchman",
  "Combat",
  "Concentration",
  "Vengeance",
  "Rage",
  "Annihilation",
  "Carnage",
  "Fury",
  // Jedi Consular / Sith Inquisitor
  "Telekinetics",
  "Balance",
  "Infiltration",
  "Serenity",
  "Lightning",
  "Madness",
  "Deception",
  "Hatred",
  // Trooper / Bounty Hunter
  "Gunnery",
  "Assault Specialist",
  "Tactics",
  "Plasmatech",
  "Arsenal",
  "Innovative Ordnance",
  "Advanced Prototype",
  "Pyrotech",
  // Smuggler / Imperial Agent
  "Scrapper",
  "Ruffian",
  "Sharpshooter",
  "Saboteur",
  "Dirty Fighting",
  "Concealment",
  "Lethality",
  "Marksmanship",
  "Engineering",
  "Virulence",
] as const;

export const DISCIPLINE_ROLES: ReadonlyMap<string, Role> = new Map<string, Role>([
  ...TANK_DISCIPLINES.map((d) => [d, "tank"] as const),
  ...HEALER_DISCIPLINES.map((d) => [d, "healer"] as const),
  ...DPS_DISCIPLINES.map((d) => [d, "dps"] as const),
]);

export function roleForDiscipline(discipline: string): Role | null {
  return DISCIPLINE_ROLES.get(discipline.trim()) ?? null;
}
