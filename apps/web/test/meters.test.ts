import { describe, expect, it } from "vitest";
import { formatCompact, formatDuration, formatPercent } from "../src/lib/format.js";
import { buildRows, raidTotal, roleAccent, type MeterActor } from "../src/lib/meters.js";

const actor = (over: Partial<MeterActor>): MeterActor => ({
  actorId: "1",
  name: "Player",
  role: "dps",
  discipline: "Watchman",
  dps: 0,
  hps: 0,
  dtps: 0,
  totalDamage: 0,
  totalHealing: 0,
  totalDamageTaken: 0,
  overhealPercent: 0,
  deaths: 0,
  ...over,
});

describe("formatCompact", () => {
  it.each([
    [0, "0"],
    [942, "942"],
    [1_234, "1.23k"],
    [12_345, "12.3k"],
    [1_500_000, "1.50m"],
    [21_829_804, "21.83m"],
  ])("formats %i as %s", (input, expected) => {
    expect(formatCompact(input)).toBe(expected);
  });

  it("keeps negative magnitudes readable", () => {
    expect(formatCompact(-12_345)).toBe("-12.3k");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [9_000, "0:09"],
    [65_000, "1:05"],
    [226_000, "3:46"],
  ])("formats %ims as %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it("never renders a negative clock", () => {
    expect(formatDuration(-5_000)).toBe("0:00");
  });
});

describe("formatPercent", () => {
  it("renders a dash when health is unknown", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("rounds to the requested precision", () => {
    expect(formatPercent(42.567)).toBe("42.6%");
    expect(formatPercent(42.567, 0)).toBe("43%");
  });
});

describe("buildRows", () => {
  const actors = [
    actor({ actorId: "1", name: "Ahsoka", dps: 9_000, totalDamage: 900_000 }),
    actor({ actorId: "2", name: "Valzler", dps: 12_000, totalDamage: 1_200_000 }),
    actor({ actorId: "3", name: "Zephyr", role: "healer", dps: 0, hps: 5_000 }),
  ];

  it("ranks by the selected metric", () => {
    expect(buildRows(actors, "dps").map((r) => r.name)).toEqual(["Valzler", "Ahsoka"]);
  });

  // A healing meter padded with every damage dealer at zero is unreadable.
  it("omits actors with no contribution to the metric", () => {
    expect(buildRows(actors, "hps").map((r) => r.name)).toEqual(["Zephyr"]);
  });

  it("scales bar width against the leader", () => {
    const rows = buildRows(actors, "dps");
    expect(rows[0]!.share).toBe(1);
    expect(rows[1]!.share).toBeCloseTo(0.75, 5);
  });

  it("carries the matching total for the metric", () => {
    expect(buildRows(actors, "dps")[0]!.total).toBe(1_200_000);
  });

  it("breaks ties by name so the order is stable between snapshots", () => {
    const tied = [
      actor({ actorId: "b", name: "Bravo", dps: 100 }),
      actor({ actorId: "a", name: "Alpha", dps: 100 }),
    ];
    expect(buildRows(tied, "dps").map((r) => r.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("returns nothing when the raid has done nothing yet", () => {
    expect(buildRows([actor({ dps: 0 })], "dps")).toEqual([]);
  });

  it("sums the raid rate", () => {
    expect(raidTotal(buildRows(actors, "dps"))).toBe(21_000);
  });
});

describe("roleAccent", () => {
  it("gives each role its own accent", () => {
    const accents = new Set(["tank", "healer", "dps"].map((r) => roleAccent(r as "tank")));
    expect(accents.size).toBe(3);
  });

  it("falls back for an unknown discipline", () => {
    expect(roleAccent(null)).toBe("var(--accent-unknown)");
  });
});
