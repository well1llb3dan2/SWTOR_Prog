import { describe, expect, it } from "vitest";
import { defaultLimits, describeOpenSlots, summariseRoster, type Signup } from "@swtor/shared";

const signup = (discordUserId: string, status: Signup["status"], respondedAt: number): Signup => ({
  discordUserId,
  displayName: discordUserId,
  characterName: `${discordUserId}-char`,
  status,
  respondedAt,
});

const EIGHT = defaultLimits(8);

describe("defaultLimits", () => {
  it.each([
    [8, { tanks: 2, healers: 2, dps: 4 }],
    [16, { tanks: 4, healers: 4, dps: 8 }],
    [4, { tanks: 1, healers: 1, dps: 2 }],
  ] as const)("uses the standard composition for %i players", (size, expected) => {
    expect(defaultLimits(size)).toEqual(expected);
  });

  it("falls back to eight-player when the size is unknown", () => {
    expect(defaultLimits(null)).toEqual({ tanks: 2, healers: 2, dps: 4 });
  });
});

describe("summariseRoster", () => {
  it("sorts everyone into their role", () => {
    const summary = summariseRoster(
      [
        signup("tank-1", "tank", 1),
        signup("heal-1", "healer", 2),
        signup("dps-1", "dps", 3),
        signup("bench-1", "bench", 4),
        signup("out-1", "declined", 5),
      ],
      EIGHT,
    );

    expect(summary.tanks.confirmed.map((s) => s.discordUserId)).toEqual(["tank-1"]);
    expect(summary.healers.confirmed).toHaveLength(1);
    expect(summary.dps.confirmed).toHaveLength(1);
    expect(summary.bench).toHaveLength(1);
    expect(summary.declined).toHaveLength(1);
    expect(summary.confirmedCount).toBe(3);
  });

  // Silently bumping someone who signed up first is how signup tools lose trust.
  it("keeps the earliest responders and waitlists the overflow", () => {
    const summary = summariseRoster(
      [signup("late", "tank", 300), signup("first", "tank", 100), signup("second", "tank", 200)],
      EIGHT,
    );

    expect(summary.tanks.confirmed.map((s) => s.discordUserId)).toEqual(["first", "second"]);
    expect(summary.tanks.waitlisted.map((s) => s.discordUserId)).toEqual(["late"]);
  });

  it("does not count waitlisted players as confirmed", () => {
    const summary = summariseRoster(
      [1, 2, 3, 4, 5, 6].map((i) => signup(`dps-${i}`, "dps", i)),
      EIGHT,
    );

    expect(summary.dps.confirmed).toHaveLength(4);
    expect(summary.dps.waitlisted).toHaveLength(2);
    expect(summary.confirmedCount).toBe(4);
    expect(summary.isFull).toBe(false);
  });

  it("reports the raid full only when every slot is taken", () => {
    const full = [
      ...[1, 2].map((i) => signup(`t${i}`, "tank", i)),
      ...[1, 2].map((i) => signup(`h${i}`, "healer", 10 + i)),
      ...[1, 2, 3, 4].map((i) => signup(`d${i}`, "dps", 20 + i)),
    ];
    const summary = summariseRoster(full, EIGHT);

    expect(summary.confirmedCount).toBe(8);
    expect(summary.totalSlots).toBe(8);
    expect(summary.isFull).toBe(true);
    expect(summary.openSlots).toEqual({ tanks: 0, healers: 0, dps: 0 });
  });

  it("counts remaining slots per role", () => {
    const summary = summariseRoster([signup("t1", "tank", 1), signup("d1", "dps", 2)], EIGHT);
    expect(summary.openSlots).toEqual({ tanks: 1, healers: 2, dps: 3 });
  });

  it("handles an empty signup list", () => {
    const summary = summariseRoster([], EIGHT);
    expect(summary.confirmedCount).toBe(0);
    expect(summary.isFull).toBe(false);
  });

  it("ignores benched and declined players when filling slots", () => {
    const summary = summariseRoster([signup("a", "bench", 1), signup("b", "declined", 2)], EIGHT);
    expect(summary.confirmedCount).toBe(0);
    expect(summary.openSlots).toEqual(EIGHT);
  });
});

describe("describeOpenSlots", () => {
  it("names only the roles that are short", () => {
    const summary = summariseRoster(
      [signup("t1", "tank", 1), signup("t2", "tank", 2), signup("h1", "healer", 3)],
      EIGHT,
    );
    expect(describeOpenSlots(summary)).toBe("Needs 1 heal, 4 dps");
  });

  it("says full when the raid is complete", () => {
    const full = [
      ...[1, 2].map((i) => signup(`t${i}`, "tank", i)),
      ...[1, 2].map((i) => signup(`h${i}`, "healer", 10 + i)),
      ...[1, 2, 3, 4].map((i) => signup(`d${i}`, "dps", 20 + i)),
    ];
    expect(describeOpenSlots(summariseRoster(full, EIGHT))).toBe("Full");
  });
});
