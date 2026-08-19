import type { CombatEvent, MagnitudeValue } from "@swtor/shared";
import { describe, expect, it, vi } from "vitest";
import { IngestSession, SessionManager } from "../src/session.js";

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

const PLAYER = {
  kind: "player",
  name: "Local",
  playerId: "1",
  position: null,
  hp: 100,
  maxHp: 100,
} as const;

const BOSS = {
  kind: "npc",
  name: "Dash'Roode",
  npcId: "boss",
  instanceId: "1",
  position: null,
  hp: 500,
  maxHp: 1_000,
} as const;

const TRASH = {
  kind: "npc",
  name: "Trash Mob",
  npcId: "trash",
  instanceId: "2",
  position: null,
  hp: 100,
  maxHp: 100,
} as const;

const base = (timestamp: number) => ({
  timestamp,
  lineNumber: 0,
  source: null,
  target: null,
  ability: null,
  threat: null,
});

const areaEntered = (t: number): CombatEvent => ({
  ...base(t),
  type: "areaEntered",
  source: PLAYER,
  zone: { name: "Darvannis", id: "137438993037" },
  serverId: "he3000",
  groupSize: 8,
  difficulty: "Veteran",
  logVersion: "v7.0.0b",
});

const damage = (t: number, target = BOSS): CombatEvent => ({
  ...base(t),
  type: "damage",
  source: PLAYER,
  target,
  value: magnitude(1_000),
});

function makeSession(onPullEnd = vi.fn()) {
  return {
    onPullEnd,
    session: new IngestSession({
      sessionId: "s1",
      guildId: "infamous",
      reportCode: "ABC123",
      logFileName: "combat.txt",
      idleTimeoutMs: 8_000,
      onPullEnd,
    }),
  };
}

describe("IngestSession", () => {
  it("has no snapshot before combat starts", () => {
    const { session } = makeSession();
    session.push([areaEntered(1_000)]);
    expect(session.snapshot(Date.now())).toBeNull();
  });

  it("reports live metrics once a pull is open", () => {
    const { session } = makeSession();
    session.push([areaEntered(1_000), damage(2_000), damage(6_000)]);

    const snapshot = session.snapshot(Date.now())!;
    expect(snapshot).toMatchObject({ sessionId: "s1", zone: "Darvannis", inCombat: true });
    expect(snapshot.actors[0]).toMatchObject({ name: "Local", totalDamage: 2_000 });
  });

  /**
   * Historical logs carry timestamps far from wall-clock time; measuring idle
   * on the log's own clock is what lets a replayed file behave like a live one.
   */
  it("measures pull idle time on the log clock, not the wall clock", () => {
    const { session, onPullEnd } = makeSession();
    const logTime = Date.parse("2020-01-01T00:00:00Z");

    session.push([areaEntered(logTime), damage(logTime + 1_000), damage(logTime + 5_000)]);
    expect(session.snapshot(Date.now())).not.toBeNull();

    session.flush(Date.now() + 1_000);
    expect(onPullEnd).not.toHaveBeenCalled();

    session.flush(Date.now() + 9_000);
    expect(onPullEnd).toHaveBeenCalledOnce();
  });

  it("hands the pull's raw events to the persistence callback", () => {
    const { session, onPullEnd } = makeSession();
    const logTime = Date.parse("2020-01-01T00:00:00Z");

    session.push([areaEntered(logTime), damage(logTime + 1_000), damage(logTime + 5_000)]);
    session.flush(Date.now() + 9_000);

    const [, events] = onPullEnd.mock.calls[0] as [unknown, CombatEvent[]];
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.type === "damage")).toBe(true);
  });

  it("drops trash pulls from live snapshots and persistence callbacks", () => {
    const { session, onPullEnd } = makeSession();
    const logTime = Date.parse("2020-01-01T00:00:00Z");

    session.push([areaEntered(logTime), damage(logTime + 1_000, TRASH)]);
    expect(session.snapshot(Date.now())).toBeNull();

    session.flush(Date.now() + 9_000);
    expect(onPullEnd).not.toHaveBeenCalled();
  });

  it("counts every event it accepts", () => {
    const { session } = makeSession();
    session.push([areaEntered(1_000), damage(2_000)]);
    session.push([damage(3_000)]);
    expect(session.eventsReceived).toBe(3);
  });
});

describe("SessionManager", () => {
  it("refuses sessions beyond the configured ceiling", () => {
    const manager = new SessionManager({ maxSessions: 1 });
    manager.add(makeSession().session);

    expect(() =>
      manager.add(
        new IngestSession({
          sessionId: "s2",
          guildId: "infamous",
          reportCode: "DEF456",
          logFileName: "combat.txt",
          onPullEnd: vi.fn(),
        }),
      ),
    ).toThrow(/Session limit/);
  });

  it("emits a snapshot per live pull on tick", () => {
    const manager = new SessionManager({ maxSessions: 10 });
    const { session } = makeSession();
    manager.add(session);
    session.push([areaEntered(Date.now()), damage(Date.now() + 100)]);

    expect(manager.tick(Date.now() + 200)).toHaveLength(1);
  });

  it("reaps sessions that have gone silent", () => {
    const manager = new SessionManager({ maxSessions: 10, idleTimeoutMs: 1_000 });
    manager.add(makeSession().session);

    expect(manager.reapIdle(Date.now())).toEqual([]);
    expect(manager.reapIdle(Date.now() + 2_000)).toEqual(["s1"]);
    expect(manager.size).toBe(0);
  });
});
