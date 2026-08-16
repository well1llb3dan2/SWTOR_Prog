import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { LogParser } from "@swtor/parser";
import type { CombatEvent } from "@swtor/shared";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryAccountStore } from "../src/accountStore.js";
import { loadConfig } from "../src/config.js";
import { MemoryOperationStore } from "../src/operationStore.js";
import { buildServer, type BuiltServer } from "../src/server.js";
import { MemoryReportStore } from "../src/store.js";

const TOKEN = "test-token-that-is-long-enough";
const FILE = "combat_2026-08-15_22_48_11_971003.txt";
const CONCURRENT_RAIDS = 5;

const config = loadConfig({
  INGEST_TOKEN: TOKEN,
  LOG_LEVEL: "silent",
  SNAPSHOT_INTERVAL_MS: "50",
  PULL_IDLE_TIMEOUT_MS: "500",
});

let server: BuiltServer;
let store: MemoryReportStore;
let baseUrl: string;
let events: CombatEvent[];

const emit = <T>(socket: Socket, event: string, payload: unknown): Promise<T> =>
  new Promise((resolve) => socket.emit(event, payload, resolve));

const waitFor = (socket: Socket, event: string, timeoutMs = 20_000): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: unknown) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

/** One boss pull, reused by every simulated raid. */
function bossPull(): CombatEvent[] {
  const path = fileURLToPath(new URL(`../../../samples/combat-logs/${FILE}`, import.meta.url));
  const parser = new LogParser({ fileName: FILE });
  const collected: CombatEvent[] = [];

  for (const line of readFileSync(path, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)) {
    const event = parser.push(line);
    if (event === null) continue;
    collected.push(event);
    if (
      event.type === "death" &&
      event.target?.kind === "npc" &&
      event.target.name === "Dash'Roode"
    ) {
      break;
    }
  }
  return collected;
}

beforeAll(async () => {
  events = bossPull();
  store = new MemoryReportStore();
  server = await buildServer({
    config,
    store,
    accounts: new MemoryAccountStore(),
    operations: new MemoryOperationStore(),
  });
  await server.app.listen({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${(server.app.server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await server.close();
});

/** Streams the pull as one raid would, returning once its report is stored. */
async function simulateRaid(): Promise<{ reportCode: string; elapsedMs: number }> {
  const sessionId = randomUUID();
  const started = Date.now();

  const socket = connect(`${baseUrl}/ingest`, {
    transports: ["websocket"],
    auth: { token: TOKEN },
  });
  await waitFor(socket, "connect");

  const hello = await emit<{ ok: boolean; reportCode: string }>(socket, "hello", {
    clientVersion: "loadtest",
    sessionId,
    logFileName: FILE,
    logStartedAt: events[0]!.timestamp,
  });

  for (let i = 0; i < events.length; i += 400) {
    const ack = await emit<{ ok: boolean }>(socket, "batch", {
      sessionId,
      sequence: i / 400,
      events: events.slice(i, i + 400),
    });
    if (!ack.ok) throw new Error("batch rejected under load");
  }

  // Wait for the pull to close and its report to be written.
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const report = await store.getReport(config.defaultGuildId, hello.reportCode);
    if (report !== null && report.fights.length > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  socket.close();
  return { reportCode: hello.reportCode, elapsedMs: Date.now() - started };
}

describe("load", () => {
  it(`handles ${CONCURRENT_RAIDS} concurrent raids without dropping data`, async () => {
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_RAIDS }, () => simulateRaid()),
    );

    expect(new Set(results.map((r) => r.reportCode)).size).toBe(CONCURRENT_RAIDS);

    for (const { reportCode } of results) {
      const report = await store.getReport(config.defaultGuildId, reportCode);
      expect(report, `report ${reportCode} was not stored`).not.toBeNull();
      expect(report!.fights).toHaveLength(1);

      const fight = report!.fights[0]!;
      expect(fight.encounter?.encounterId).toBe("snv_dashroode");
      expect(fight.outcome).toBe("kill");

      // Every raid must persist its own events, not share another's.
      const stored = await store.getFightEvents(config.defaultGuildId, reportCode, 1);
      expect(stored!.length).toBeGreaterThan(1_000);
    }

    expect(server.sessions.size).toBeLessThanOrEqual(CONCURRENT_RAIDS);
  }, 120_000);

  it("still answers health checks promptly after the load", async () => {
    const started = Date.now();
    const response = await server.app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
