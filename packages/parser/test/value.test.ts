import { describe, expect, it } from "vitest";
import { parseValueGroup } from "@swtor/parser";

describe("parseValueGroup", () => {
  it("reads a bare resource amount", () => {
    expect(parseValueGroup("3.0")).toEqual({
      kind: "magnitude",
      amount: 3,
      effective: null,
      critical: false,
      damageType: null,
      mitigation: null,
      absorbed: null,
      reflected: false,
    });
  });

  it("reads a stack count as charges", () => {
    expect(parseValueGroup("4 charges {836045448953667}")).toEqual({ kind: "charges", charges: 4 });
  });

  it("reads a critical hit with an effective amount and damage type", () => {
    const value = parseValueGroup("11363* ~11360 energy {836045448940874}");
    expect(value).toMatchObject({
      amount: 11363,
      effective: 11360,
      critical: true,
      damageType: "energy",
    });
  });

  it("reads a fully overhealed heal", () => {
    expect(parseValueGroup("4890 ~0")).toMatchObject({ amount: 4890, effective: 0 });
  });

  it("reads shield mitigation together with the absorbed amount", () => {
    expect(
      parseValueGroup(
        "1144 kinetic {836045448940873} -shield {836045448945505} (900 absorbed {836045448945511})",
      ),
    ).toMatchObject({
      amount: 1144,
      damageType: "kinetic",
      mitigation: "shield",
      absorbed: 900,
    });
  });

  it("reads absorption with no damage type and doubled spacing", () => {
    expect(parseValueGroup("878 ~0  (878 absorbed {836045448945511})")).toMatchObject({
      amount: 878,
      effective: 0,
      absorbed: 878,
      damageType: null,
    });
  });

  it("reads a reflected hit with no space before the group", () => {
    expect(
      parseValueGroup("1865 kinetic {836045448940873}(reflected {836045448953649})"),
    ).toMatchObject({
      amount: 1865,
      damageType: "kinetic",
      reflected: true,
    });
  });

  it.each([
    ["0 -parry {836045448945507}", "parry"],
    ["0 -miss {836045448945502}", "miss"],
    ["0 -dodge {836045448945505}", "dodge"],
    ["0 -deflect {836045448945508}", "deflect"],
    ["0 -immune {836045448945509}", "immune"],
    ["0 -resist {836045448945510}", "resist"],
  ])("reads avoidance %s", (input, expected) => {
    expect(parseValueGroup(input)).toMatchObject({ amount: 0, mitigation: expected });
  });

  it("falls back to unknown when the client omits the avoidance reason", () => {
    expect(parseValueGroup("0 -")).toMatchObject({ amount: 0, mitigation: "unknown" });
  });

  it("returns null for a non-numeric group such as the client tag", () => {
    expect(parseValueGroup("he3000")).toBeNull();
    expect(parseValueGroup(null)).toBeNull();
  });
});
