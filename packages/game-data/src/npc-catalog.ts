import { OBSERVED_NPCS } from "./observed.js";

export const NPC_CATALOG_SOURCE = "baras-derived" as const;
export const NPC_CATALOG_VERSION = "baras-derived-2026-08-20" as const;

const NAMES_BY_ID = new Map(OBSERVED_NPCS.map((entry) => [entry.npcId, entry.name]));

/** Returns the canonical catalog name for an NPC id, when this build knows it. */
export function canonicalNpcName(npcId: string, fallbackName: string): { name: string; source: "catalog" | "log" } {
  const name = NAMES_BY_ID.get(npcId);
  return name === undefined ? { name: fallbackName, source: "log" } : { name, source: "catalog" };
}