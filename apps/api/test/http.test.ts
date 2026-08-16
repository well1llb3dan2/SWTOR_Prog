import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { MemoryAccountStore } from "../src/accountStore.js";
import { MemoryOperationStore } from "../src/operationStore.js";
import { loadConfig } from "../src/config.js";
import { buildServer, type BuiltServer } from "../src/server.js";
import { MemoryReportStore } from "../src/store.js";

const config = loadConfig({
  INGEST_TOKEN: "test-token-that-is-long-enough",
  CORS_ORIGINS: "http://localhost:3000",
  LOG_LEVEL: "silent",
});

let server: BuiltServer;
let store: MemoryReportStore;

beforeAll(async () => {
  store = new MemoryReportStore();
  server = await buildServer({
    config,
    store,
    accounts: new MemoryAccountStore(),
    operations: new MemoryOperationStore(),
    realtime: false,
  });
});

afterAll(async () => {
  await server.close();
});

describe("HTTP surface", () => {
  it("reports health", async () => {
    const response = await server.app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", sessions: 0 });
  });

  it("serves the encounter registry for the portal", async () => {
    const response = await server.app.inject({ method: "GET", url: "/api/encounters" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.operations).toHaveLength(13);
    expect(body.encounters.length).toBeGreaterThan(50);
    expect(body.encounters.some((e: { id: string }) => e.id === "snv_dashroode")).toBe(true);
  });

  it("returns an empty report list before anything is uploaded", async () => {
    const response = await server.app.inject({ method: "GET", url: "/api/reports" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("404s an unknown report rather than leaking internals", async () => {
    const response = await server.app.inject({ method: "GET", url: "/api/reports/NOPE99" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "report not found" });
  });

  it("rejects a malformed report code with a 400", async () => {
    const response = await server.app.inject({ method: "GET", url: "/api/reports/x" });
    expect(response.statusCode).toBe(400);
  });

  it("summarises reports without inlining every fight", async () => {
    const report = await store.createReport({
      guildId: config.defaultGuildId,
      ownerUserId: null,
      logFileName: "combat_2026-08-15_22_48_11_971003.txt",
      startedAt: new Date("2026-08-15T22:48:11Z"),
    });

    const response = await server.app.inject({ method: "GET", url: "/api/reports" });
    const body = response.json();

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ code: report.code, fightCount: 0, killCount: 0 });
    expect(body[0]).not.toHaveProperty("fights");
  });

  it("404s fight events that were never stored", async () => {
    const [summary] = (await server.app.inject({ method: "GET", url: "/api/reports" })).json();
    const response = await server.app.inject({
      method: "GET",
      url: `/api/reports/${summary.code}/fights/1/events`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "events unavailable or expired" });
  });

  it("caps the list limit instead of trusting the query string", async () => {
    const response = await server.app.inject({ method: "GET", url: "/api/reports?limit=9999" });
    expect(response.statusCode).toBe(400);
  });
});
