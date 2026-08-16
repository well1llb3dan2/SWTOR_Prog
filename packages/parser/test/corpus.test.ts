import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LogParser } from "@swtor/parser";
import type { CombatEvent, CombatEventType } from "@swtor/shared";

const SAMPLE_DIR = fileURLToPath(new URL("../../../samples/combat-logs", import.meta.url));

const sampleFiles = readdirSync(SAMPLE_DIR).filter((f) => f.endsWith(".txt"));

// The corpus is ~150k lines per file; parse each one once and share it.
const cache = new Map<string, CombatEvent[]>();

function parseSample(fileName: string): CombatEvent[] {
  const cached = cache.get(fileName);
  if (cached !== undefined) return cached;

  const text = readFileSync(join(SAMPLE_DIR, fileName), "utf8").replace(/^\uFEFF/, "");
  const events = new LogParser({ fileName }).pushAll(text.split(/\r?\n/));
  cache.set(fileName, events);
  return events;
}

describe("sample corpus", () => {
  it("has sample logs committed to parse against", () => {
    expect(sampleFiles.length).toBeGreaterThan(0);
  });

  it.each(sampleFiles)("parses every line of %s with no unknown events", (fileName) => {
    const events = parseSample(fileName);
    const unknown = events.filter((e) => e.type === "unknown");

    // Report the first few offenders rather than a bare count, so a regression
    // points straight at the line variant that broke.
    expect(unknown.slice(0, 5).map((e) => (e.type === "unknown" ? e.raw : ""))).toEqual([]);
    expect(events.length).toBeGreaterThan(100);
  });

  it("recognises the operation, roster and boss in the Ravagers sample", () => {
    const fileName = sampleFiles.find((f) => f.includes("2026-08-15_22_48"));
    expect(fileName).toBeDefined();
    const events = parseSample(fileName!);

    const opEntry = events.find((e) => e.type === "areaEntered" && e.difficulty !== null);
    expect(opEntry).toMatchObject({
      zone: { name: "Darvannis" },
      groupSize: 8,
      difficulty: "Veteran",
    });

    const roster = new Set(
      events
        .filter((e) => e.type === "disciplineChanged")
        .map((e) => (e.source?.kind === "player" ? e.source.playerId : ""))
        .filter((id) => id !== ""),
    );
    expect(roster.size).toBe(8);

    const roles = new Set(
      events.flatMap((e) => (e.type === "disciplineChanged" && e.role !== null ? [e.role] : [])),
    );
    expect(roles).toEqual(new Set(["tank", "healer", "dps"]));

    const bossDeath = events.find(
      (e) => e.type === "death" && e.target?.kind === "npc" && e.target.name === "Dash'Roode",
    );
    expect(bossDeath).toBeDefined();
  });

  it("preserves non-ASCII character names", () => {
    const fileName = sampleFiles.find((f) => f.includes("2026-08-15_22_48"))!;
    const names = new Set(
      parseSample(fileName).flatMap((e) => (e.source?.kind === "player" ? [e.source.name] : [])),
    );
    expect([...names].some((n) => /[^\x20-\x7E]/.test(n))).toBe(true);
  });

  it("classifies every category the corpus contains", () => {
    const seen = new Set<CombatEventType>();
    for (const fileName of sampleFiles) {
      for (const event of parseSample(fileName)) seen.add(event.type);
    }

    for (const expected of [
      "damage",
      "heal",
      "applyEffect",
      "removeEffect",
      "modifyCharges",
      "resource",
      "ability",
      "combatState",
      "death",
      "revived",
      "target",
      "taunt",
      "threat",
      "areaEntered",
      "disciplineChanged",
    ] satisfies CombatEventType[]) {
      expect(seen, `missing ${expected}`).toContain(expected);
    }
  });
});
