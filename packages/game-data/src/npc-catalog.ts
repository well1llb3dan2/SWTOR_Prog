import { BARAS_NPC_CATALOG, BARAS_NPC_CATALOG_BY_ID, BARAS_NPC_CATALOG_SOURCE, BARAS_NPC_CATALOG_VERSION } from "./generated/baras-npc-catalog.js";

export const NPC_CATALOG_SOURCE = BARAS_NPC_CATALOG_SOURCE;
export const NPC_CATALOG_VERSION = BARAS_NPC_CATALOG_VERSION;

export const NPC_CATALOG_BY_ID = BARAS_NPC_CATALOG_BY_ID;
export { BARAS_NPC_CATALOG };

/** Returns the canonical catalog name for an NPC id, when this build knows it. */
export function canonicalNpcName(npcId: string, fallbackName: string): { name: string; source: "catalog" | "log" } {
  const entry = NPC_CATALOG_BY_ID.get(npcId);
  return entry === undefined ? { name: fallbackName, source: "log" } : { name: entry.name, source: "catalog" };
}