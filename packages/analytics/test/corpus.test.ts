import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeEvents, groupBossFightsByOperation } from "@swtor/analytics";
import { LogParser } from "@swtor/parser";

const FILE = "combat_2026-08-15_22_48_11_971003.txt";
const path = fileURLToPath(new URL(`../../../samples/combat-logs/${FILE}`, import.meta.url));

const events = new LogParser({ fileName: FILE }).pushAll(
  readFileSync(path, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/),
);
const pulls = analyzeEvents(events);
const bossPulls = pulls.filter((p) => p.boss?.isLikelyBoss === true);

describe("Scum and Villainy sample", () => {
  it("attributes every pull to the operation", () => {
    expect(pulls.length).toBeGreaterThan(10);
    expect(new Set(pulls.map((p) => p.zone))).toEqual(new Set(["Darvannis"]));
    expect(new Set(pulls.map((p) => p.difficulty))).toEqual(new Set(["Veteran"]));
    expect(new Set(pulls.map((p) => p.groupSize))).toEqual(new Set([8]));
  });

  it("finds the operation's bosses in encounter order", () => {
    expect(bossPulls.map((p) => p.boss!.name)).toEqual([
      "Dash'Roode",
      "Titan 6",
      "Thrasher",
      "Operations Chief",
      "Olok the Shadow",
      "Sunder",
      "Sunder",
      "Kell Dragon",
    ]);
  });

  it("does not mistake heavy trash for a boss", () => {
    const trash = pulls.filter((p) => p.boss?.isLikelyBoss === false).map((p) => p.boss!.name);
    expect(trash).toContain("Dustclaw Alpha");
    expect(trash).toContain("Underworld Arms Trader");
    expect(bossPulls.every((p) => p.boss!.maxHp > 5_000_000)).toBe(true);
  });

  it("matches every boss pull to a catalogued encounter", () => {
    expect(bossPulls.map((p) => p.encounter?.encounterId)).toEqual([
      "snv_dashroode",
      "snv_titan_6",
      "snv_thrasher",
      "snv_operations_chief",
      "snv_olok_the_shadow",
      "snv_cartel_warlords",
      "snv_cartel_warlords",
      "snv_dread_master_styrak",
    ]);
    expect(new Set(bossPulls.map((p) => p.encounter!.operationName))).toEqual(
      new Set(["Scum and Villainy"]),
    );
  });

  it("groups boss fights in canonical operation order and excludes trash", () => {
    const operations = groupBossFightsByOperation(pulls);
    expect(operations).toHaveLength(1);
    expect(operations[0]!.operationName).toBe("Scum and Villainy");
    expect(operations[0]!.fights.map((fight) => fight.encounter.encounterId)).toEqual([
      "snv_dashroode",
      "snv_titan_6",
      "snv_thrasher",
      "snv_operations_chief",
      "snv_olok_the_shadow",
      "snv_cartel_warlords",
      "snv_cartel_warlords",
      "snv_dread_master_styrak",
    ]);
    expect(operations[0]!.fights.every((fight) => fight.bossEntities.length > 0)).toBe(true);
  });

  it("leaves trash pulls unmatched", () => {
    const trashPulls = pulls.filter((p) => p.boss?.isLikelyBoss === false);
    expect(trashPulls.every((p) => p.encounter === null)).toBe(true);
  });

  it("carries the encounter's phases and victory condition onto the pull", () => {
    const titan = bossPulls[1]!.encounter!;
    expect(titan.encounterName).toBe("Titan 6");
    expect(titan.phases.map((p) => p.name)).toEqual([
      "Titan 6",
      "Burn",
    ]);
    expect(titan.victoryEvent).toBe("Boss defeated");
  });

  it("keeps the opening boss as a single pull despite the logging player leaving combat", () => {
    const dashRoode = bossPulls[0]!;
    expect(dashRoode.outcome).toBe("kill");
    expect(dashRoode.durationMs).toBeGreaterThan(120_000);
    expect(dashRoode.durationMs).toBeLessThan(400_000);
  });

  it("captures the full eight-player roster with all three roles", () => {
    const dashRoode = bossPulls[0]!;
    expect(dashRoode.roster).toHaveLength(8);
    expect(new Set(dashRoode.roster.map((r) => r.role))).toEqual(
      new Set(["tank", "healer", "dps"]),
    );
    expect(dashRoode.roster.map((r) => r.discipline)).toContain("Seer");
  });

  it("credits damage, healing and deaths to named players", () => {
    const titan = bossPulls[1]!;
    const damagers = titan.actors.filter((a) => a.damage > 0);
    const healers = titan.actors.filter((a) => a.healing > 0);

    expect(damagers.length).toBeGreaterThanOrEqual(6);
    expect(healers.length).toBeGreaterThanOrEqual(2);
    expect(damagers[0]!.dps).toBeGreaterThan(1_000);
    expect(titan.deaths.length).toBeGreaterThan(0);
    expect(titan.deaths.every((d) => d.name.length > 0)).toBe(true);
  });

  it("records a wipe where the raid died without felling the target", () => {
    expect(pulls.some((p) => p.outcome === "wipe")).toBe(true);
  });

  it("buckets each pull into a ten-second time series starting at zero", () => {
    for (const pull of bossPulls) {
      expect(pull.buckets[0]!.index).toBe(0);
      expect(pull.buckets.at(-1)!.index).toBeLessThanOrEqual(Math.floor(pull.durationMs / 10_000));
    }
  });
});
