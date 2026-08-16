import { describe, expect, it } from "vitest";
import { scanLine } from "@swtor/parser";

describe("scanLine", () => {
  it("splits a full damage line into its seven slots", () => {
    const scan = scanLine(
      "[21:12:57.698] [@Twistle#688363584125440|(-9.31,25.49,16.52,151.27)|(432142/432142)] " +
        "[Operations Training Dummy {2857785339412480}:24154033560915|(-10.27,27.24,16.50,-45.00)|(130828704/130828704)] " +
        "[Force Leap {812105301229568}] [ApplyEffect {836045448945477}: Damage {836045448945501}] " +
        "(11363* ~11360 energy {836045448940874}) <11363.0>",
    );

    expect(scan).not.toBeNull();
    expect(scan!.time).toBe("21:12:57.698");
    expect(scan!.source).toContain("@Twistle#688363584125440");
    expect(scan!.target).toContain("Operations Training Dummy");
    expect(scan!.ability).toBe("Force Leap {812105301229568}");
    expect(scan!.effect).toBe("ApplyEffect {836045448945477}: Damage {836045448945501}");
    expect(scan!.value).toBe("11363* ~11360 energy {836045448940874}");
    expect(scan!.trailing).toBe("11363.0");
  });

  it("keeps parentheses inside effect names intact", () => {
    const scan = scanLine(
      "[21:13:00.740] [@A#1|(0,0,0,0)|(1/1)] [=] [Burning (Overload Saber) {1261719657644297}] " +
        "[ApplyEffect {836045448945477}: Damage {836045448945501}] (2664 elemental {836045448940875})",
    );

    expect(scan!.ability).toBe("Burning (Overload Saber) {1261719657644297}");
    expect(scan!.value).toBe("2664 elemental {836045448940875}");
  });

  it("captures the nested absorbed group inside the value", () => {
    const scan = scanLine(
      "[01:23:53.783] [] [@Pey#688487204552730|(548.18,423.00,-18.25,32.85)|(401461/401461)] " +
        "[Howling Sandstorm {3061684616822784}] [ApplyEffect {836045448945477}: Damage {836045448945501}] " +
        "(878 ~0  (878 absorbed {836045448945511}))",
    );

    expect(scan!.source).toBe("");
    expect(scan!.value).toBe("878 ~0  (878 absorbed {836045448945511})");
    expect(scan!.trailing).toBeNull();
  });

  it("treats the log version tag as the trailing slot, not threat", () => {
    const scan = scanLine(
      "[22:51:09.532] [@M#1|(0,0,0,0)|(1/1)] [] [] " +
        "[AreaEntered {836045448953664}: Darvannis {137438993037} 8 Player Veteran {836045448953652}] " +
        "(he3000) <v7.0.0b>",
    );

    expect(scan!.value).toBe("he3000");
    expect(scan!.trailing).toBe("v7.0.0b");
  });

  it("returns null for blank and non-log lines", () => {
    expect(scanLine("")).toBeNull();
    expect(scanLine("   ")).toBeNull();
    expect(scanLine("not a combat log line")).toBeNull();
  });
});
