import { describe, expect, it } from "vitest";
import { LogParser, parseLogFileName, TimelineClock } from "@swtor/parser";

const FILE = "combat_2026-08-15_22_48_11_971003.txt";

function parseOne(line: string) {
  return new LogParser({ fileName: FILE }).push(line);
}

describe("parseLogFileName", () => {
  it("extracts the calendar date the log lines omit", () => {
    expect(parseLogFileName(FILE)).toMatchObject({ year: 2026, month: 8, day: 15 });
  });

  it("accepts a full path", () => {
    expect(parseLogFileName(`C:\\Users\\x\\CombatLogs\\${FILE}`)).toMatchObject({ day: 15 });
  });

  it("rejects unrelated filenames", () => {
    expect(parseLogFileName("notes.txt")).toBeNull();
  });
});

describe("TimelineClock", () => {
  it("rolls the date forward when a raid runs past midnight", () => {
    const clock = new TimelineClock({ year: 2026, month: 8, day: 15 });
    const late = clock.resolve("23:59:59.000")!;
    const early = clock.resolve("00:00:01.000")!;

    expect(early - late).toBe(2000);
    expect(new Date(early).getDate()).toBe(16);
  });

  it("does not roll for small backwards jitter", () => {
    const clock = new TimelineClock({ year: 2026, month: 8, day: 15 });
    const a = clock.resolve("12:00:00.500")!;
    const b = clock.resolve("12:00:00.400")!;
    expect(b - a).toBe(-100);
  });
});

describe("parseLine", () => {
  it("classifies a damage event and resolves both actors", () => {
    const event = parseOne(
      "[21:12:57.698] [@Twistle#688363584125440|(-9.31,25.49,16.52,151.27)|(432142/432142)] " +
        "[Operations Training Dummy {2857785339412480}:24154033560915|(-10.27,27.24,16.50,-45.00)|(130828704/130828704)] " +
        "[Force Leap {812105301229568}] [ApplyEffect {836045448945477}: Damage {836045448945501}] " +
        "(11363* ~11360 energy {836045448940874}) <11363.0>",
    );

    expect(event).toMatchObject({
      type: "damage",
      threat: 11363,
      ability: { name: "Force Leap", id: "812105301229568" },
      source: { kind: "player", name: "Twistle", playerId: "688363584125440", hp: 432142 },
      target: { kind: "npc", name: "Operations Training Dummy", instanceId: "24154033560915" },
      value: { amount: 11363, effective: 11360, critical: true, damageType: "energy" },
    });
  });

  it("resolves a `=` target back to the source actor", () => {
    const event = parseOne(
      "[21:13:00.739] [@Twistle#688363584125440|(-9.31,25.49,16.52,151.27)|(432142/432142)] [=] " +
        "[Healing Resonance {4626693390073856}] [ApplyEffect {836045448945477}: Heal {836045448945500}] (4890 ~0)",
    );

    expect(event).toMatchObject({ type: "heal", value: { amount: 4890, effective: 0 } });
    expect(event!.target).toEqual(event!.source);
  });

  it("reads zone, group size and difficulty from an operation entry", () => {
    const event = parseOne(
      "[22:51:09.532] [@M#1|(670.70,537.35,-19.95,122.25)|(417495/433063)] [] [] " +
        "[AreaEntered {836045448953664}: Darvannis {137438993037} 8 Player Veteran {836045448953652}] " +
        "(he3000) <v7.0.0b>",
    );

    expect(event).toMatchObject({
      type: "areaEntered",
      zone: { name: "Darvannis", id: "137438993037" },
      serverId: "he3000",
      groupSize: 8,
      difficulty: "Veteran",
      logVersion: "v7.0.0b",
      threat: null,
    });
  });

  it("reads an open-world zone entry that carries no difficulty", () => {
    const event = parseOne(
      "[22:48:25.555] [@M#1|(0,0,0,0)|(1/1)] [] [] " +
        "[AreaEntered {836045448953664}: Republic Fleet {137438989514}] (he3000) <v7.0.0b>",
    );

    expect(event).toMatchObject({
      type: "areaEntered",
      zone: { name: "Republic Fleet" },
      groupSize: null,
      difficulty: null,
    });
  });

  it("maps a discipline change onto a raid role", () => {
    const event = parseOne(
      "[22:57:47.095] [@Ananias Dex#690124023741513|(0,0,0,0)|(1/1)] [] [] " +
        "[DisciplineChanged {836045448953665}: Guardian {16140975849784542883}/Defense {2031339142381609}]",
    );

    expect(event).toMatchObject({
      type: "disciplineChanged",
      advancedClass: { name: "Guardian" },
      discipline: { name: "Defense" },
      role: "tank",
    });
  });

  it.each([
    ["EnterCombat {836045448945489}", { type: "combatState", state: "enter" }],
    ["ExitCombat {836045448945490}", { type: "combatState", state: "exit" }],
    ["Death {836045448945493}", { type: "death" }],
    ["Revived {836045448945494}", { type: "revived" }],
    ["AbilityActivate {836045448945479}", { type: "ability", phase: "activate" }],
    ["AbilityInterrupt {836045448945482}", { type: "ability", phase: "interrupt" }],
    ["TargetSet {836045448953668}", { type: "target", state: "set" }],
    ["Taunt {836045448945488}", { type: "taunt" }],
    ["ModifyThreat {836045448945483}", { type: "threat" }],
  ])("classifies the %s event", (subtype, expected) => {
    const event = parseOne(
      `[21:12:57.062] [@A#1|(0,0,0,0)|(1/1)] [] [] [Event {836045448945472}: ${subtype}]`,
    );
    expect(event).toMatchObject(expected);
  });

  it("reads falling damage as a plain amount", () => {
    const event = parseOne(
      "[01:27:09.200] [@Drangiz#689210719068217|(0,0,0,0)|(1/1)] [] [] " +
        "[Event {836045448945472}: FallingDamage {836045448945484}] (8042.0)",
    );
    expect(event).toMatchObject({ type: "fallingDamage", amount: 8042 });
  });

  it("keeps an empty source slot as null for environmental damage", () => {
    const event = parseOne(
      "[01:23:53.783] [] [@Pey#688487204552730|(548.18,423.00,-18.25,32.85)|(401461/401461)] " +
        "[Howling Sandstorm {3061684616822784}] [ApplyEffect {836045448945477}: Damage {836045448945501}] " +
        "(878 ~0  (878 absorbed {836045448945511}))",
    );

    expect(event).toMatchObject({
      type: "damage",
      source: null,
      value: { amount: 878, effective: 0, absorbed: 878 },
    });
  });

  it("surfaces an unparseable line instead of throwing", () => {
    const event = parseOne("[21:12:57.062] this is not a log line");
    expect(event).toMatchObject({ type: "unknown" });
  });

  it("numbers lines so events trace back to the source file", () => {
    const parser = new LogParser({ fileName: FILE });
    parser.push(
      "[21:12:57.062] [@A#1|(0,0,0,0)|(1/1)] [] [] [Event {836045448945472}: EnterCombat {836045448945489}]",
    );
    const second = parser.push(
      "[21:12:57.063] [@A#1|(0,0,0,0)|(1/1)] [] [] [Event {836045448945472}: ExitCombat {836045448945490}]",
    );
    expect(second!.lineNumber).toBe(2);
  });
});
