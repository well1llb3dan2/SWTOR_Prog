import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENCOUNTERS_BY_ID, OBSERVED_NPCS, encounterIdForNpcId } from "@swtor/game-data";
import { LogParser } from "@swtor/parser";

const DIR = fileURLToPath(new URL("../../../samples/combat-logs", import.meta.url));

/** Highest max health seen for each NPC id across the whole sample corpus. */
const observedHealth = new Map<string, { name: string; maxHp: number }>();

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".txt"))) {
  const events = new LogParser({ fileName: file }).pushAll(
    readFileSync(join(DIR, file), "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/),
  );

  for (const event of events) {
    for (const actor of [event.source, event.target]) {
      if (actor?.kind !== "npc" || actor.maxHp === null || actor.maxHp <= 0) continue;
      const previous = observedHealth.get(actor.npcId);
      if (previous === undefined || actor.maxHp > previous.maxHp) {
        observedHealth.set(actor.npcId, { name: actor.name, maxHp: actor.maxHp });
      }
    }
  }
}

describe("observed NPC table", () => {
  it("references only encounters that exist", () => {
    for (const entry of OBSERVED_NPCS) {
      expect(ENCOUNTERS_BY_ID.has(entry.encounterId), entry.encounterId).toBe(true);
    }
  });

  it("holds no duplicate NPC ids", () => {
    const ids = OBSERVED_NPCS.map((e) => e.npcId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Guards against the table drifting away from the logs it was extracted
  // from, which is exactly how the original briefing's figures went stale.
  it.each(OBSERVED_NPCS)("matches the logs for $name ($npcId)", (entry) => {
    const actual = observedHealth.get(entry.npcId);
    expect(actual, `${entry.npcId} is absent from the sample corpus`).toBeDefined();
    expect(actual!.name).toBe(entry.name);
    expect(actual!.maxHp).toBe(entry.maxHp);
  });

  it("names an encounter for a known id and nothing for an unknown one", () => {
    expect(encounterIdForNpcId("3153558262251520")).toBe("snv_dashroode");
    expect(encounterIdForNpcId("2857785339412480")).toBeNull();
  });
});
