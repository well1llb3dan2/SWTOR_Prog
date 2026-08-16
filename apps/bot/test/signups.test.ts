import { describe, expect, it } from "vitest";
import { summariseRoster, defaultLimits, type Signup } from "@swtor/shared";
import {
  buildSignupComponents,
  buildSignupEmbed,
  parseSignupCustomId,
  signupCustomId,
  type OperationView,
} from "../src/signups.js";

const signup = (id: string, status: Signup["status"], at: number): Signup => ({
  discordUserId: id,
  displayName: id,
  characterName: `${id}-char`,
  status,
  respondedAt: at,
});

function view(signups: Signup[] = [], overrides: Partial<OperationView> = {}): OperationView {
  const roster = summariseRoster(signups, defaultLimits(8));
  return {
    code: "OP123456",
    title: "Scum and Villainy — Veteran",
    description: "Bring stims.",
    scheduledFor: "2026-08-20T23:00:00.000Z",
    difficulty: "Veteran",
    groupSize: 8,
    cancelledAt: null,
    roster,
    status: "Needs 2 tank, 2 heal, 4 dps",
    ...overrides,
  };
}

describe("signup custom ids", () => {
  it("round-trips", () => {
    const id = signupCustomId("OP123456", "healer");
    expect(parseSignupCustomId(id)).toEqual({ code: "OP123456", status: "healer" });
  });

  // Buttons outlive bot restarts, so a malformed id must not crash a handler.
  it("rejects anything it did not create", () => {
    expect(parseSignupCustomId("something-else")).toBeNull();
    expect(parseSignupCustomId("signup:OP123456:wizard")).toBeNull();
    expect(parseSignupCustomId("signup:OP123456")).toBeNull();
    expect(parseSignupCustomId("")).toBeNull();
  });
});

describe("buildSignupEmbed", () => {
  it("shows each role with its slot count", () => {
    const embed = buildSignupEmbed(view([signup("a", "tank", 1), signup("b", "dps", 2)]));
    const names = embed.fields.map((f) => f.name);

    expect(names).toContain("Tanks 1/2");
    expect(names).toContain("Healers 0/2");
    expect(names).toContain("DPS 1/4");
  });

  // Discord renders these per viewer, which removes "is that server time?".
  it("uses a Discord timestamp instead of a fixed string", () => {
    const embed = buildSignupEmbed(view());
    const unix = Math.floor(Date.parse("2026-08-20T23:00:00.000Z") / 1000);

    expect(embed.description).toContain(`<t:${unix}:F>`);
    expect(embed.description).toContain(`<t:${unix}:R>`);
  });

  it("names signups with their character", () => {
    const embed = buildSignupEmbed(view([signup("a", "tank", 1)]));
    const tanks = embed.fields.find((f) => f.name.startsWith("Tanks"))!;
    expect(tanks.value).toBe("a (a-char)");
  });

  it("shows a dash for an empty role", () => {
    const embed = buildSignupEmbed(view());
    expect(embed.fields.every((f) => f.value === "—")).toBe(true);
  });

  it("adds a waitlist section only when someone is waiting", () => {
    const none = buildSignupEmbed(view([signup("a", "tank", 1)]));
    expect(none.fields.some((f) => f.name === "Waitlist")).toBe(false);

    const over = buildSignupEmbed(
      view([signup("a", "tank", 1), signup("b", "tank", 2), signup("c", "tank", 3)]),
    );
    const waitlist = over.fields.find((f) => f.name === "Waitlist")!;
    expect(waitlist.value).toBe("c (c-char)");
  });

  it("summarises what the raid still needs in the footer", () => {
    const embed = buildSignupEmbed(view([signup("a", "tank", 1)]));
    expect(embed.footer?.text).toBe("Needs 1 tank, 2 heal, 4 dps");
  });

  it("turns green once the raid is full", () => {
    const full = [
      ...[1, 2].map((i) => signup(`t${i}`, "tank", i)),
      ...[1, 2].map((i) => signup(`h${i}`, "healer", 10 + i)),
      ...[1, 2, 3, 4].map((i) => signup(`d${i}`, "dps", 20 + i)),
    ];
    const embed = buildSignupEmbed(view(full));

    expect(embed.color).toBe(0x4ade80);
    expect(embed.footer?.text).toBe("Full");
  });

  it("marks a cancelled operation clearly", () => {
    const embed = buildSignupEmbed(view([], { cancelledAt: "2026-08-19T00:00:00.000Z" }));
    expect(embed.description).toContain("**Cancelled**");
    expect(embed.footer?.text).toBe("Cancelled");
  });
});

describe("buildSignupComponents", () => {
  it("offers every response across two rows", () => {
    const rows = buildSignupComponents(view());
    const labels = rows.flatMap((row) => row.components.map((c) => c.label));

    expect(rows).toHaveLength(2);
    expect(rows[0]!.components).toHaveLength(3);
    expect(labels).toEqual(["Tank", "Healer", "DPS", "Bench", "Can't make it"]);
  });

  it("carries the operation code on every button", () => {
    const rows = buildSignupComponents(view());
    for (const row of rows) {
      for (const button of row.components) {
        expect(parseSignupCustomId(button.custom_id)?.code).toBe("OP123456");
      }
    }
  });

  it("disables the buttons once cancelled", () => {
    const rows = buildSignupComponents(view([], { cancelledAt: "2026-08-19T00:00:00.000Z" }));
    expect(rows.flatMap((r) => r.components).every((c) => c.disabled === true)).toBe(true);
  });
});
