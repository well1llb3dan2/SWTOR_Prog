import { describe, expect, it } from "vitest";
import { detectSingleInstanceReset } from "@swtor/analytics";

describe("detectSingleInstanceReset", () => {
  it("flags a reset when a new instance of the same NPC appears while the old one is alive", () => {
    const existing = [{ npcId: "boss-1", instanceId: "a", diedAt: null }];
    const isReset = detectSingleInstanceReset(
      existing,
      { npcId: "boss-1", instanceId: "b", name: "Dread Master Styrak" },
      ["Dread Master Styrak"],
    );
    expect(isReset).toBe(true);
  });

  it("does not flag a reset once the prior instance has died", () => {
    const existing = [{ npcId: "boss-1", instanceId: "a", diedAt: 5_000 }];
    const isReset = detectSingleInstanceReset(
      existing,
      { npcId: "boss-1", instanceId: "b", name: "Dread Master Styrak" },
      ["Dread Master Styrak"],
    );
    expect(isReset).toBe(false);
  });

  it("does not flag entities that are not catalogued as single-instance", () => {
    const existing = [{ npcId: "boss-1", instanceId: "a", diedAt: null }];
    const isReset = detectSingleInstanceReset(
      existing,
      { npcId: "boss-1", instanceId: "b", name: "Dread Master Styrak" },
      [],
    );
    expect(isReset).toBe(false);
  });

  it("is case-insensitive on the boss name", () => {
    const existing = [{ npcId: "boss-1", instanceId: "a", diedAt: null }];
    const isReset = detectSingleInstanceReset(
      existing,
      { npcId: "boss-1", instanceId: "b", name: "dread master styrak" },
      ["Dread Master Styrak"],
    );
    expect(isReset).toBe(true);
  });
});
