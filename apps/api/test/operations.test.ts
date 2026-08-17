import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryAccountStore } from "../src/accountStore.js";
import { loadConfig } from "../src/config.js";
import { MemoryOperationStore } from "../src/operationStore.js";
import { buildServer, type BuiltServer } from "../src/server.js";
import { MemoryReportStore } from "../src/store.js";

const SESSION_SECRET = "a-session-secret-that-is-definitely-long-enough";

const config = loadConfig({
  INGEST_TOKEN: "test-token-that-is-long-enough",
  LOG_LEVEL: "silent",
  SESSION_SECRET,
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_CLIENT_SECRET: "client-secret",
  DISCORD_GUILD_ID: "guild-1",
  DISCORD_MODERATOR_ROLE_IDS: "mod-role",
});

let server: BuiltServer;
let accounts: MemoryAccountStore;

/** Signs a value the same way the auth routes do, so tests can forge sessions. */
function sessionCookie(discordId: string): string {
  const signed = server.app.signCookie(discordId);
  return `swtor_session=${signed}`;
}

beforeAll(async () => {
  accounts = new MemoryAccountStore();
  server = await buildServer({
    config,
    store: new MemoryReportStore(),
    accounts,
    operations: new MemoryOperationStore(),
    realtime: false,
  });

  await accounts.upsertUser({
    guildId: config.defaultGuildId,
    discordId: "mod-1",
    username: "raidlead",
    globalName: "Raid Lead",
    avatar: null,
    roles: ["mod-role"],
    isMember: true,
    isModerator: true,
  });
  await accounts.upsertUser({
    guildId: config.defaultGuildId,
    discordId: "member-1",
    username: "raider",
    globalName: "Raider",
    avatar: null,
    roles: [],
    isMember: true,
    isModerator: false,
  });
});

afterAll(async () => {
  await server.close();
});

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

async function createOperation(overrides: Record<string, unknown> = {}) {
  const response = await server.app.inject({
    method: "POST",
    url: "/api/operations",
    headers: { cookie: sessionCookie("mod-1") },
    payload: {
      title: "Scum and Villainy — Veteran",
      scheduledFor: tomorrow(),
      difficulty: "Veteran",
      groupSize: 8,
      ...overrides,
    },
  });
  return response;
}

describe("scheduling", () => {
  it("refuses to create an operation when signed out", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/api/operations",
      payload: { title: "x", scheduledFor: tomorrow() },
    });
    expect(response.statusCode).toBe(401);
  });

  // Members sign up; only moderators put events on the calendar.
  it("refuses to create an operation for a non-moderator", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/api/operations",
      headers: { cookie: sessionCookie("member-1") },
      payload: { title: "x", scheduledFor: tomorrow() },
    });
    expect(response.statusCode).toBe(403);
  });

  it("creates an operation with the standard composition", async () => {
    const response = await createOperation();
    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.limits).toEqual({ tanks: 2, healers: 2, dps: 4 });
    expect(body.status).toBe("Needs 2 tank, 2 heal, 4 dps");
  });

  it("scales the composition for a sixteen-player run", async () => {
    const response = await createOperation({ groupSize: 16 });
    expect(response.json().limits).toEqual({ tanks: 4, healers: 4, dps: 8 });
  });

  it("derives defaults from the operation catalog when a known operation is selected", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/api/operations",
      headers: { cookie: sessionCookie("mod-1") },
      payload: {
        operationId: "snv",
        encounterId: "snv_dashroode",
        scheduledFor: tomorrow(),
        groupSize: 8,
        difficulty: "Veteran",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().operationId).toBe("snv");
    expect(response.json().encounterId).toBe("snv_dashroode");
    expect(response.json().title).toContain("Scum and Villainy");
  });

  it("rejects a time in the past", async () => {
    const response = await createOperation({
      scheduledFor: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    expect(response.statusCode).toBe(400);
  });

  it("lists upcoming operations without a session", async () => {
    await createOperation();
    const response = await server.app.inject({ method: "GET", url: "/api/operations" });

    expect(response.statusCode).toBe(200);
    expect(response.json().length).toBeGreaterThan(0);
  });

  it("cancels rather than deletes, so Discord can be updated", async () => {
    const { code } = (await createOperation()).json();

    const cancelled = await server.app.inject({
      method: "DELETE",
      url: `/api/operations/${code}`,
      headers: { cookie: sessionCookie("mod-1") },
    });
    expect(cancelled.statusCode).toBe(200);

    const fetched = await server.app.inject({ method: "GET", url: `/api/operations/${code}` });
    expect(fetched.json().cancelledAt).not.toBeNull();

    const upcoming = await server.app.inject({ method: "GET", url: "/api/operations" });
    expect(upcoming.json().some((e: { code: string }) => e.code === code)).toBe(false);
  });

  it("404s an unknown operation", async () => {
    const response = await server.app.inject({ method: "GET", url: "/api/operations/NOPE1234" });
    expect(response.statusCode).toBe(404);
  });
});

describe("signups", () => {
  it("requires a session to sign up from the portal", async () => {
    const { code } = (await createOperation()).json();
    const response = await server.app.inject({
      method: "POST",
      url: `/api/operations/${code}/signup`,
      payload: { status: "dps" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("records a signup and recomputes the roster", async () => {
    const { code } = (await createOperation()).json();

    const response = await server.app.inject({
      method: "POST",
      url: `/api/operations/${code}/signup`,
      headers: { cookie: sessionCookie("member-1") },
      payload: { status: "healer" },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.roster.healers.confirmed).toHaveLength(1);
    expect(body.roster.healers.confirmed[0].displayName).toBe("Raider");
    expect(body.status).toBe("Needs 2 tank, 1 heal, 4 dps");
  });

  it("replaces a previous answer rather than duplicating it", async () => {
    const { code } = (await createOperation()).json();
    const cookie = sessionCookie("member-1");

    await server.app.inject({
      method: "POST",
      url: `/api/operations/${code}/signup`,
      headers: { cookie },
      payload: { status: "dps" },
    });
    const second = await server.app.inject({
      method: "POST",
      url: `/api/operations/${code}/signup`,
      headers: { cookie },
      payload: { status: "bench" },
    });

    expect(second.json().signups).toHaveLength(1);
    expect(second.json().roster.dps.confirmed).toHaveLength(0);
    expect(second.json().roster.bench).toHaveLength(1);
  });

  it("refuses signups to a cancelled operation", async () => {
    const { code } = (await createOperation()).json();
    await server.app.inject({
      method: "DELETE",
      url: `/api/operations/${code}`,
      headers: { cookie: sessionCookie("mod-1") },
    });

    const response = await server.app.inject({
      method: "POST",
      url: `/api/operations/${code}/signup`,
      headers: { cookie: sessionCookie("member-1") },
      payload: { status: "dps" },
    });
    expect(response.statusCode).toBe(409);
  });
});

describe("bot bridge", () => {
  const authorised = { authorization: `Bearer ${config.feedToken}` };

  it("refuses a signup without the service token", async () => {
    const { code } = (await createOperation()).json();
    const response = await server.app.inject({
      method: "POST",
      url: `/api/bot/operations/${code}/signup`,
      payload: { discordUserId: "1", displayName: "x", status: "dps" },
    });
    expect(response.statusCode).toBe(401);
  });

  // A button press in Discord and a click on the portal must land identically.
  it("records a button press the same way as a portal signup", async () => {
    const { code } = (await createOperation()).json();

    const response = await server.app.inject({
      method: "POST",
      url: `/api/bot/operations/${code}/signup`,
      headers: authorised,
      payload: { discordUserId: "member-1", displayName: "Raider", status: "tank" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().roster.tanks.confirmed[0].discordUserId).toBe("member-1");
  });

  it("stores the Discord message so button presses can find the event", async () => {
    const { code } = (await createOperation()).json();

    const linked = await server.app.inject({
      method: "POST",
      url: `/api/bot/operations/${code}/message`,
      headers: authorised,
      payload: { channelId: "channel-1", messageId: "message-1" },
    });
    expect(linked.statusCode).toBe(200);

    const fetched = await server.app.inject({ method: "GET", url: `/api/operations/${code}` });
    expect(fetched.json().discordMessageId).toBe("message-1");
  });
});
