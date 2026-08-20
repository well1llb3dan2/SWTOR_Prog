import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CombatEvent, MagnitudeValue } from "@swtor/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBatcher } from "../src/core/batcher.js";
import { OfflineQueue } from "../src/core/offlineQueue.js";
import { ReplaySource } from "../src/core/replay.js";
import { LogStreamer, readInitialLogIdentity } from "../src/core/streamer.js";
import { defaultSettings, redactSettings } from "../src/core/settings.js";

const temporaryDirs: string[] = [];

const magnitude = (amount: number): MagnitudeValue => ({
  kind: "magnitude",
  amount,
  effective: amount,
  critical: false,
  damageType: "energy",
  mitigation: null,
  absorbed: null,
  reflected: false,
});

const event = (n: number): CombatEvent => ({
  timestamp: n,
  lineNumber: n,
  source: null,
  target: null,
  ability: null,
  threat: null,
  type: "damage",
  value: magnitude(1),
});

afterEach(async () => {
  vi.useRealTimers();
  for (const dir of temporaryDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("EventBatcher", () => {
  it("flushes as soon as the size threshold is reached", () => {
    const onFlush = vi.fn();
    const batcher = new EventBatcher({ maxEvents: 3, onFlush });

    batcher.add([event(1), event(2)]);
    expect(onFlush).not.toHaveBeenCalled();

    batcher.add([event(3)]);
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush.mock.calls[0]![0]).toHaveLength(3);
    expect(batcher.pendingCount).toBe(0);
  });

  it("flushes a partial batch once the delay elapses", () => {
    vi.useFakeTimers();
    const onFlush = vi.fn();
    const batcher = new EventBatcher({ maxEvents: 50, maxDelayMs: 1_000, onFlush });

    batcher.add([event(1)]);
    vi.advanceTimersByTime(999);
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it("never emits an empty batch", () => {
    const onFlush = vi.fn();
    const batcher = new EventBatcher({ onFlush });
    batcher.flush();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("drops pending events when stopped", () => {
    const onFlush = vi.fn();
    const batcher = new EventBatcher({ maxEvents: 50, onFlush });
    batcher.add([event(1)]);
    batcher.stop();
    expect(batcher.pendingCount).toBe(0);
    expect(onFlush).not.toHaveBeenCalled();
  });
});

describe("OfflineQueue", () => {
  it("preserves order", () => {
    const queue = new OfflineQueue();
    queue.push({ sequence: 0, events: [event(1)] });
    queue.push({ sequence: 1, events: [event(2)] });

    expect(queue.shift()?.sequence).toBe(0);
    expect(queue.shift()?.sequence).toBe(1);
  });

  // A long outage during a raid must not grow memory without bound.
  it("drops the oldest batches once the event ceiling is passed", () => {
    const queue = new OfflineQueue(5);
    queue.push({ sequence: 0, events: [event(1), event(2), event(3)] });
    queue.push({ sequence: 1, events: [event(4), event(5), event(6)] });

    expect(queue.size).toBe(1);
    expect(queue.peek()?.sequence).toBe(1);
    expect(queue.droppedEvents).toBe(3);
  });

  it("keeps the newest batch even when it alone exceeds the ceiling", () => {
    const queue = new OfflineQueue(2);
    queue.push({ sequence: 0, events: [event(1), event(2), event(3), event(4)] });

    expect(queue.size).toBe(1);
    expect(queue.peek()?.sequence).toBe(0);
  });

  it("tracks the pending event count", () => {
    const queue = new OfflineQueue();
    queue.push({ sequence: 0, events: [event(1), event(2)] });
    expect(queue.eventCount).toBe(2);
    queue.shift();
    expect(queue.eventCount).toBe(0);
  });
});

describe("settings", () => {
  it("never exposes the ingest token to the renderer", () => {
    const redacted = redactSettings({ ...defaultSettings(), token: "super-secret" });
    expect(redacted).not.toHaveProperty("token");
    expect(redacted.hasToken).toBe(true);
    expect(JSON.stringify(redacted)).not.toContain("super-secret");
  });

  it("reports when no token has been configured", () => {
    expect(redactSettings(defaultSettings()).hasToken).toBe(false);
  });
});

describe("local character attribution", () => {
  const identities = [
    {
      file: "combat_2026-08-13_00_27_55_882410.txt",
      characterName: "Mérlín",
      playerId: "688098112822271",
      discipline: "Telekinetics",
      zone: "Republic Fleet",
    },
    {
      file: "combat_2026-08-15_20_21_10_493955.txt",
      characterName: "Twistle",
      playerId: "688363584125440",
      discipline: "Watchman",
      zone: "Defender",
    },
    {
      file: "combat_2026-08-15_22_48_11_971003.txt",
      characterName: "Mérlín",
      playerId: "688098112822271",
      discipline: "Rage",
      zone: "Republic Fleet",
    },
  ] as const;

  for (const expected of identities) {
    it(`detects ${expected.characterName} from ${expected.file}`, async () => {
      const identity = await readInitialLogIdentity(
        fileURLToPath(new URL(`../../../samples/combat-logs/${expected.file}`, import.meta.url)),
      );
      expect(identity).toMatchObject({
        characterName: expected.characterName,
        playerId: expected.playerId,
        discipline: expected.discipline,
        zone: expected.zone,
      });
    });
  }

  it("does not infer the logger from an unrelated player's activity", async () => {
    const dir = await mkdtemp(join(tmpdir(), "swtor-identity-"));
    const filePath = join(dir, "identity-order.txt");
    temporaryDirs.push(dir);
    await writeFile(filePath, [
      "[21:12:57.087] [@PartyMember#222|(-1.45,11.15,16.77,148.81)|(432142/432142)] [=] [Force Leap {812105301229568}] [Event {836045448945472}: AbilityActivate {836045448945479}]",
      "[21:12:58.000] [@Logger#111|(-9.86,26.23,16.52,135.16)|(1/416618)] [] [] [AreaEntered {836045448953664}: Defender {137438988838}] (he3000) <v7.0.0b>",
      "[21:12:58.000] [@Logger#111|(-9.86,26.23,16.52,135.16)|(1/416618)] [] [] [DisciplineChanged {836045448953665}: Sentinel {16141154905109553504}/Watchman {2031339142381614}]",
    ].join("\n"), "utf8");

    await expect(readInitialLogIdentity(filePath)).resolves.toMatchObject({
      characterName: "Logger",
      playerId: "111",
      discipline: "Watchman",
      zone: "Defender",
    });
  });
});

describe("ReplaySource", () => {
  const realLog = fileURLToPath(
    new URL("../../../samples/combat-logs/combat_2026-08-15_22_48_11_971003.txt", import.meta.url),
  );

  /** Small synthetic log so the clock tests do not re-parse 150k lines. */
  async function tinyLog(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "swtor-replay-"));
    const name = "combat_2026-08-15_21_00_00_000000.txt";
    const lines = Array.from(
      { length: 60 },
      (_, i) =>
        `[21:00:${String(i).padStart(2, "0")}.000] [@A#1|(0,0,0,0)|(1/1)] [] [] ` +
        `[Event {836045448945472}: AbilityActivate {836045448945479}]`,
    );
    const path = join(dir, name);
    await writeFile(path, `${lines.join("\n")}\n`, "utf8");
    temporaryDirs.push(dir);
    return path;
  }

  // Parses ~150k real log lines, so it needs more than the default budget.
  it("loads a real operation log", async () => {
    const replay = new ReplaySource({ filePath: realLog, onEvents: vi.fn() });
    const total = await replay.load();

    expect(total).toBeGreaterThan(100_000);
    expect(replay.fileName).toBe("combat_2026-08-15_22_48_11_971003.txt");
  }, 30_000);

  // Releasing events on the log's own clock is what makes replay exercise pull
  // detection the same way a live raid does.
  it("releases events on the log clock rather than all at once", async () => {
    const emitted: number[] = [];
    const replay = new ReplaySource({
      filePath: await tinyLog(),
      speed: 1,
      tickMs: 1_000,
      onEvents: (events) => emitted.push(events.length),
    });
    await replay.load();

    replay.tick();
    replay.tick();

    const total = emitted.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(replay.totalEvents);
  });

  it("emits proportionally more at higher speed", async () => {
    const path = await tinyLog();
    const count = async (speed: number) => {
      let emitted = 0;
      const replay = new ReplaySource({
        filePath: path,
        speed,
        tickMs: 1_000,
        onEvents: (events) => (emitted += events.length),
      });
      await replay.load();
      replay.tick();
      return emitted;
    };

    expect(await count(10)).toBeGreaterThan(await count(1));
  });

  it("signals completion once the log is exhausted", async () => {
    const onDone = vi.fn();
    const replay = new ReplaySource({
      filePath: await tinyLog(),
      speed: 100,
      tickMs: 1_000,
      onEvents: vi.fn(),
      onDone,
    });
    await replay.load();

    for (let i = 0; i < 50 && onDone.mock.calls.length === 0; i += 1) replay.tick();
    expect(onDone).toHaveBeenCalled();
  });
});

describe("LogStreamer local player isolation", () => {
  it("only reports the local player from AreaEntered and ignores other group members in the stream", async () => {
    const dir = await mkdtemp(join(tmpdir(), "swtor-streamer-"));
    temporaryDirs.push(dir);
    const fileName = "combat_2026-08-18_20_00_00_000000.txt";
    const logPath = join(dir, fileName);

    const detected: Array<{ characterName: string }> = [];
    const streamer = new LogStreamer({
      directory: dir,
      client: null,
      onCharacterDetected: (char) => detected.push(char),
      tailer: { pollIntervalMs: 10, startAtEnd: false },
    });

    const lines = [
      // Line 1: Local player zones in
      `[20:00:00.000] [@ValeRook#111111111111111|(0,0,0,0)|(1/1)] [] [] [AreaEntered {836045448953664}: Republic Fleet {137438989514}] (he3000)`,
      // Line 2: Discipline of local player
      `[20:00:00.000] [@ValeRook#111111111111111|(0,0,0,0)|(1/1)] [] [] [DisciplineChanged {836045448953665}: Guardian {16141180228828243745}/Vigilance {2031339142381578}]`,
      // Line 3: Group leader / member casts buff on local player
      `[20:00:05.000] [@GroupLeader#999999999999999|(0,0,0,0)|(1/1)] [@ValeRook#111111111111111|(0,0,0,0)|(1/1)] [Force Valor {4503101411164160}] [ApplyEffect {836045448945477}: Force Might {4503101411164466}]`,
      // Line 4: Another party member acts
      `[20:00:10.000] [@PartyMember#888888888888888|(0,0,0,0)|(1/1)] [=] [Sprint {810670782152704}] [ApplyEffect {836045448945477}: Sprint {810670782152704}]`,
    ];

    await writeFile(logPath, lines.join("\n") + "\n", "utf8");

    streamer.start();

    // Wait for tailer polling
    await new Promise((r) => setTimeout(r, 60));
    streamer.stop();

    expect(detected).toHaveLength(1);
    expect(detected[0]!.characterName).toBe("ValeRook");
  });

  it("reads the start of the file on attach even when startAtEnd is true", async () => {
    const dir = await mkdtemp(join(tmpdir(), "swtor-streamer-startatend-"));
    temporaryDirs.push(dir);
    const fileName = "combat_2026-08-18_21_00_00_000000.txt";
    const logPath = join(dir, fileName);

    const lines = [
      // Line 1 & 2: Local player log header
      `[21:00:00.000] [@CommanderTwistle#777777777777777|(0,0,0,0)|(1/1)] [] [] [AreaEntered {836045448953664}: Onderon {137438989514}] (he3000)`,
      `[21:00:00.000] [@CommanderTwistle#777777777777777|(0,0,0,0)|(1/1)] [] [] [DisciplineChanged {836045448953665}: Sentinel {16141154905109553504}/Watchman {2031339142381614}]`,
      // Subsequent lines: party activity
      `[21:05:00.000] [@OtherPlayer#222222222222222|(0,0,0,0)|(1/1)] [=] [Sprint {810670782152704}] [ApplyEffect {836045448945477}: Sprint {810670782152704}]`,
    ];

    await writeFile(logPath, lines.join("\n") + "\n", "utf8");

    const detected: Array<{ characterName: string; discipline?: string | null }> = [];
    const streamer = new LogStreamer({
      directory: dir,
      client: null,
      onCharacterDetected: (char) => detected.push(char),
      tailer: { pollIntervalMs: 10, startAtEnd: true },
    });

    streamer.start();

    // Wait for tailer polling
    await new Promise((r) => setTimeout(r, 60));
    streamer.stop();

    expect(detected).toHaveLength(1);
    expect(detected[0]!.characterName).toBe("CommanderTwistle");
    expect(detected[0]!.discipline).toBe("Watchman");
  });
});
