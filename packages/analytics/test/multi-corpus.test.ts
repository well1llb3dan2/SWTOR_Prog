import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeEvents, groupBossFightsByOperation } from "@swtor/analytics";
import { LogParser } from "@swtor/parser";

const LOGS = [
  {
    file: "combat_2026-08-13_00_27_55_882410.txt",
    minimumPulls: 20,
    bossNames: ["Dash'Roode", "Operations Chief", "Olok the Shadow", "Cartel Warlords", "Dread Master Styrak", "Zorn & Toth", "Firebrand & Stormcaller", "Colonel Vorgath", "Warlord Kephess"],
    minimumWipes: 0,
  },
  {
    file: "combat_2026-08-15_20_21_10_493955.txt",
    minimumPulls: 15,
    bossNames: ["Bonethrasher", "Jarg & Sorno", "Foreman Crusher", "G4-B3 Heavy Fabricator", "Karagga the Unyielding", "Annihilation Droid XRR-3", "Gharj", "Soa"],
    minimumWipes: 1,
  },
  {
    file: "combat_2026-08-15_22_48_11_971003.txt",
    minimumPulls: 15,
    bossNames: ["Dash'Roode", "Titan 6", "Thrasher", "Operations Chief", "Olok the Shadow", "Cartel Warlords", "Dread Master Styrak"],
    minimumWipes: 1,
  },
] as const;

function readLog(file: string) {
  const path = fileURLToPath(new URL(`../../../samples/combat-logs/${file}`, import.meta.url));
  const lines = readFileSync(path, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  return new LogParser({ fileName: file }).pushAll(lines);
}

const CORPUS = LOGS.map((fixture) => ({ ...fixture, pulls: analyzeEvents(readLog(fixture.file)) }));

describe("real combat-log corpus", () => {
  for (const fixture of CORPUS) {
    it(`keeps ${fixture.file} boss-centric and catalogued`, () => {
      const pulls = fixture.pulls;
      const bossFights = pulls.filter((pull) => pull.bossFight !== null);
      const names = bossFights.map((pull) => pull.bossFight!.encounter.encounterName);

      expect(pulls.length).toBeGreaterThanOrEqual(fixture.minimumPulls);
      expect(bossFights.length).toBeGreaterThanOrEqual(fixture.bossNames.length);
      expect(new Set(names)).toEqual(new Set(fixture.bossNames));
      expect(bossFights.every((pull) => pull.bossFight!.bossEntities.length > 0)).toBe(true);
      expect(bossFights.every((pull) => pull.bossFight!.terminalEvidence !== null)).toBe(true);
      expect(pulls.filter((pull) => pull.outcome === "wipe").length).toBeGreaterThanOrEqual(fixture.minimumWipes);
    });
  }

  it("groups the combined real corpus by operation without admitting trash", () => {
    const pulls = CORPUS.flatMap((fixture) => fixture.pulls);
    const operations = groupBossFightsByOperation(pulls);

    expect(operations.map((operation) => operation.operationName)).toEqual([
      "Scum and Villainy",
      "Explosive Conflict",
      "Karagga's Palace",
      "The Eternity Vault",
    ]);
    expect(operations.every((operation) => operation.fights.every((fight) => fight.bossEntities.length > 0))).toBe(true);
  });
});