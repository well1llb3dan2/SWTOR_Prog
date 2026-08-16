import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { LogParser } from "@swtor/parser";
import type { CombatEvent, MeterSnapshot } from "@swtor/shared";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryAccountStore } from "../src/accountStore.js";
import { MemoryOperationStore } from "../src/operationStore.js";
import { loadConfig } from "../src/config.js";
import { buildServer, type BuiltServer } from "../src/server.js";
import { MemoryReportStore } from "../src/store.js";

const TOKEN = "test-token-that-is-long-enough";
const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const FILE = "combat_2026-08-15_22_48_11_971003.txt";

const config = loadConfig({
  INGEST_TOKEN: TOKEN,
  LOG_LEVEL: "silent",
  SNAPSHOT_INTERVAL_MS: "40",
  PULL_IDLE_TIMEOUT_MS: "500",
});

/** Events covering the opening Dash'Roode pull of the sample operation. */
function dashRoodeEvents(): CombatEvent[] {
  const path = fileURLToPath(new URL(`../../../samples/combat-logs/${FILE}`, import.meta.url));
  const parser = new LogParser({ fileName: FILE });
  const events: CombatEvent[] = [];

  for (const line of readFileSync(path, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)) {
    const event = parser.push(line);
    if (event === null) continue;
    events.push(event);
    // Stop shortly after the boss dies so the pull closes on idle.
    if (
      event.type === "death" &&
      event.target?.kind === "npc" &&
      event.target.name === "Dash'Roode"
    ) {
      break;
    }
  }
  return events;
}

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

const emit = <T>(socket: Socket, event: string, payload: unknown): Promise<T> =>
  new Promise((resolve) => socket.emit(event, payload, resolve));

const waitFor = <T>(socket: Socket, event: string, timeoutMs = 8_000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

let server: BuiltServer;
let store: MemoryReportStore;
let baseUrl: string;

beforeAll(async () => {
  store = new MemoryReportStore();
  server = await buildServer({
    config,
    store,
    accounts: new MemoryAccountStore(),
    operations: new MemoryOperationStore(),
  });
  await server.app.listen({ port: 0, host: "127.0.0.1" });
  const address = server.app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await server.close();
});

describe("ingest namespace", () => {
  it("refuses a connection without the shared token", async () => {
    const socket = connect(`${baseUrl}/ingest`, {
      transports: ["websocket"],
      auth: { token: "wrong" },
    });

    const error = await waitFor<Error>(socket, "connect_error");
    expect(error.message).toBe("unauthorised");
    socket.close();
  });

  it("requires a hello before accepting batches", async () => {
    const socket = connect(`${baseUrl}/ingest`, {
      transports: ["websocket"],
      auth: { token: TOKEN },
    });
    await waitFor(socket, "connect");

    const result = await emit<{ ok: boolean; error: string }>(socket, "batch", {
      sessionId: SESSION_ID,
      sequence: 0,
      events: [],
    });

    expect(result).toEqual({ ok: false, error: "hello required" });
    socket.close();
  });

  it("rejects a batch that fails schema validation", async () => {
    const socket = connect(`${baseUrl}/ingest`, {
      transports: ["websocket"],
      auth: { token: TOKEN },
    });
    await waitFor(socket, "connect");
    await emit(socket, "hello", {
      clientVersion: "0.1.0",
      sessionId: SESSION_ID,
      logFileName: FILE,
      logStartedAt: Date.now(),
    });

    const result = await emit<{ ok: boolean; error: string }>(socket, "batch", {
      sessionId: SESSION_ID,
      sequence: -1,
      events: [{ type: "not-a-real-event" }],
    });

    expect(result).toEqual({ ok: false, error: "invalid batch" });
    socket.close();
  });

  it("refuses a feed connection without the shared token", async () => {
    const socket = connect(`${baseUrl}/feed`, {
      transports: ["websocket"],
      auth: { token: "wrong" },
    });

    const error = await waitFor<Error>(socket, "connect_error");
    expect(error.message).toBe("unauthorised");
    socket.close();
  });
});

describe("end-to-end pipeline", () => {
  it("streams a real boss pull through to live meters and a stored report", async () => {
    const events = dashRoodeEvents();
    expect(events.length).toBeGreaterThan(1_000);

    const viewer = connect(`${baseUrl}/live`, { transports: ["websocket"] });
    await waitFor(viewer, "connect");
    await emit(viewer, "subscribe", SESSION_ID);

    // The Discord bot consumes this namespace.
    const feed = connect(`${baseUrl}/feed`, {
      transports: ["websocket"],
      auth: { token: TOKEN },
    });
    await waitFor(feed, "connect");
    const feedPull = waitFor<{ reportCode: string; fightId: number; pull: { outcome: string } }>(
      feed,
      "pull:complete",
    );

    const ingest = connect(`${baseUrl}/ingest`, {
      transports: ["websocket"],
      auth: { token: TOKEN },
    });
    await waitFor(ingest, "connect");

    const hello = await emit<{ ok: boolean; reportCode: string }>(ingest, "hello", {
      clientVersion: "0.1.0",
      sessionId: SESSION_ID,
      logFileName: FILE,
      logStartedAt: events[0]!.timestamp,
    });
    expect(hello.ok).toBe(true);

    const snapshots: MeterSnapshot[] = [];
    viewer.on("snapshot", (snapshot: MeterSnapshot) => snapshots.push(snapshot));
    const completed = waitFor<{
      fightId: number;
      outcome: string;
      encounter: { encounterId: string };
    }>(viewer, "pull:complete");

    let sequence = 0;
    for (const batch of chunk(events, 400)) {
      const ack = await emit<{ ok: boolean }>(ingest, "batch", {
        sessionId: SESSION_ID,
        sequence: sequence++,
        events: batch,
      });
      expect(ack).toMatchObject({ ok: true });
    }

    const result = await completed;

    expect(result.outcome).toBe("kill");
    expect(result.encounter.encounterId).toBe("snv_dashroode");

    const live = snapshots.at(-1);
    expect(live, "expected at least one live snapshot").toBeDefined();
    expect(live!.zone).toBe("Darvannis");
    expect(live!.difficulty).toBe("Veteran");
    expect(live!.encounter?.encounterName).toBe("Dash'Roode");
    expect(live!.boss?.hpPercent).not.toBeNull();
    expect(live!.actors.filter((a) => a.totalDamage > 0).length).toBeGreaterThanOrEqual(5);
    expect(live!.actors[0]!.dps).toBeGreaterThan(1_000);

    const report = await store.getReport(config.defaultGuildId, hello.reportCode);
    expect(report!.fights).toHaveLength(1);
    expect(report!.roster).toHaveLength(8);
    expect(report!.zone).toBe("Darvannis");

    const stored = await store.getFightEvents(config.defaultGuildId, hello.reportCode, 1);
    expect(stored!.length).toBeGreaterThan(1_000);

    // The death audit is derived from the events that were just persisted.
    const audit = await server.app.inject({
      method: "GET",
      url: `/api/reports/${hello.reportCode}/fights/1/deaths`,
    });
    const body = audit.json();

    expect(audit.statusCode).toBe(200);
    expect(body.deaths.length).toBeGreaterThan(0);
    expect(body.deaths[0].name.length).toBeGreaterThan(0);
    expect(body.deaths[0].damageTaken).toBeGreaterThan(0);
    expect(body.deaths[0].entries.at(-1).kind).toBe("death");

    const broadcast = await feedPull;
    expect(broadcast.reportCode).toBe(hello.reportCode);
    expect(broadcast.fightId).toBe(1);
    expect(broadcast.pull.outcome).toBe("kill");

    feed.close();
    ingest.close();
    viewer.close();
  }, 30_000);
});
