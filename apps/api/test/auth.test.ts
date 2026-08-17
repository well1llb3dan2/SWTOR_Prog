import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryAccountStore } from "../src/accountStore.js";
import { MemoryOperationStore } from "../src/operationStore.js";
import { resolveMembership, createState, verifyState } from "../src/auth/discord.js";
import { loadConfig } from "../src/config.js";
import { buildServer, type BuiltServer } from "../src/server.js";
import { MemoryReportStore } from "../src/store.js";
import { IngestSession } from "../src/session.js";

const SESSION_SECRET = "a-session-secret-that-is-definitely-long-enough";

const config = loadConfig({
  INGEST_TOKEN: "test-token-that-is-long-enough",
  LOG_LEVEL: "silent",
  SESSION_SECRET,
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_CLIENT_SECRET: "client-secret",
  DISCORD_GUILD_ID: "guild-1",
  DISCORD_MODERATOR_ROLE_IDS: "mod-role",
  DISCORD_MEMBER_ROLE_IDS: "member-role",
  WEB_URL: "http://localhost:3000",
});

const secureConfig = loadConfig({
  INGEST_TOKEN: "test-token-that-is-long-enough",
  LOG_LEVEL: "silent",
  SESSION_SECRET,
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_CLIENT_SECRET: "client-secret",
  DISCORD_GUILD_ID: "guild-1",
  DISCORD_MODERATOR_ROLE_IDS: "mod-role",
  DISCORD_MEMBER_ROLE_IDS: "member-role",
  WEB_URL: "https://swtor-web.onrender.com",
  COOKIE_SECURE: "true",
});

const DISCORD_USER = {
  id: "424242",
  username: "twistle",
  global_name: "Twistle",
  avatar: null,
};

/** Stands in for Discord so the OAuth flow is exercised without the network. */
const fakeFetch = (async (input: string | URL | Request) => {
  const url = typeof input === "string" ? input : input.toString();

  if (url.endsWith("/oauth2/token")) {
    return new Response(JSON.stringify({ access_token: "access-token" }), {
      headers: { "content-type": "application/json" },
    });
  }
  if (url.endsWith("/users/@me")) {
    return new Response(JSON.stringify(DISCORD_USER), {
      headers: { "content-type": "application/json" },
    });
  }
  if (url.includes("/guilds/guild-1/member")) {
    return new Response(JSON.stringify({ roles: ["member-role", "mod-role"] }), {
      headers: { "content-type": "application/json" },
    });
  }
  return new Response("not found", { status: 404 });
}) as typeof fetch;

let server: BuiltServer;
let accounts: MemoryAccountStore;

beforeAll(async () => {
  accounts = new MemoryAccountStore();
  server = await buildServer({
    config,
    store: new MemoryReportStore(),
    accounts,
    operations: new MemoryOperationStore(),
    realtime: false,
    fetchImpl: fakeFetch,
  });
});

afterAll(async () => {
  await server.close();
});

/** Completes a sign-in and returns the session cookie header. */
async function signIn(): Promise<string> {
  const start = await server.app.inject({ method: "GET", url: "/auth/discord" });
  const stateCookie = start.cookies.find((c) => c.name === "swtor_oauth_state")!;
  const location = new URL(start.headers.location as string);
  const state = location.searchParams.get("state")!;

  const callback = await server.app.inject({
    method: "GET",
    url: `/auth/discord/callback?code=abc&state=${encodeURIComponent(state)}`,
    cookies: { swtor_oauth_state: stateCookie.value },
  });

  const session = callback.cookies.find((c) => c.name === "swtor_session")!;
  return `swtor_session=${session.value}`;
}

describe("OAuth state", () => {
  it("round-trips a signed state", () => {
    const state = createState(SESSION_SECRET);
    expect(verifyState(state, SESSION_SECRET)).toBe(true);
  });

  it("rejects state signed with a different secret", () => {
    expect(verifyState(createState("another-secret-entirely-long"), SESSION_SECRET)).toBe(false);
  });

  it("rejects tampered or malformed state", () => {
    const state = createState(SESSION_SECRET);
    expect(verifyState(`${state}x`, SESSION_SECRET)).toBe(false);
    expect(verifyState("no-separator", SESSION_SECRET)).toBe(false);
    expect(verifyState("", SESSION_SECRET)).toBe(false);
  });
});

describe("resolveMembership", () => {
  it("treats a non-member as having no access", () => {
    expect(resolveMembership(null, { moderatorRoleIds: ["m"], memberRoleIds: ["x"] })).toEqual({
      isMember: false,
      isModerator: false,
      roles: [],
    });
  });

  // Moderation views are gated on this, so it must never default to true.
  it("never grants moderator without an explicit role", () => {
    const membership = resolveMembership(
      { roles: ["anything"] },
      { moderatorRoleIds: [], memberRoleIds: [] },
    );
    expect(membership.isModerator).toBe(false);
    expect(membership.isMember).toBe(true);
  });

  it("grants moderator only to a configured role", () => {
    const config = { moderatorRoleIds: ["mod"], memberRoleIds: ["member"] };
    expect(resolveMembership({ roles: ["member"] }, config).isModerator).toBe(false);
    expect(resolveMembership({ roles: ["member", "mod"] }, config).isModerator).toBe(true);
  });

  it("denies membership when the member role is missing", () => {
    const membership = resolveMembership(
      { roles: ["other"] },
      { moderatorRoleIds: ["mod"], memberRoleIds: ["member"] },
    );
    expect(membership.isMember).toBe(false);
  });
});

describe("sign-in", () => {
  it("uses cross-site cookie settings when secure cookies are enabled", async () => {
    const secureServer = await buildServer({
      config: secureConfig,
      store: new MemoryReportStore(),
      accounts,
      operations: new MemoryOperationStore(),
      realtime: false,
      fetchImpl: fakeFetch,
    });

    try {
      const response = await secureServer.app.inject({ method: "GET", url: "/auth/discord" });
      const setCookie = Array.isArray(response.headers["set-cookie"])
        ? response.headers["set-cookie"].join(";")
        : (response.headers["set-cookie"] ?? "");
      expect(setCookie).toContain("SameSite=None");
      expect(setCookie).toContain("Secure");
    } finally {
      await secureServer.close();
    }
  });

  it("redirects to Discord with a signed state", async () => {
    const response = await server.app.inject({ method: "GET", url: "/auth/discord" });
    const location = new URL(response.headers.location as string);

    expect(response.statusCode).toBe(302);
    expect(location.origin).toBe("https://discord.com");
    expect(location.searchParams.get("client_id")).toBe("client-id");
    expect(verifyState(location.searchParams.get("state")!, SESSION_SECRET)).toBe(true);
  });

  // Without the cookie check a callback could be replayed from another site.
  it("rejects a callback whose state cookie is missing", async () => {
    const response = await server.app.inject({
      method: "GET",
      url: `/auth/discord/callback?code=abc&state=${encodeURIComponent(createState(SESSION_SECRET))}`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a callback whose state was not issued here", async () => {
    const start = await server.app.inject({ method: "GET", url: "/auth/discord" });
    const stateCookie = start.cookies.find((c) => c.name === "swtor_oauth_state")!;

    const response = await server.app.inject({
      method: "GET",
      url: "/auth/discord/callback?code=abc&state=forged.signature",
      cookies: { swtor_oauth_state: stateCookie.value },
    });
    expect(response.statusCode).toBe(400);
  });

  it("creates the account and applies Discord roles", async () => {
    const cookie = await signIn();
    const me = await server.app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
    const body = me.json();

    expect(body.user.discordId).toBe("424242");
    expect(body.user.isModerator).toBe(true);
    expect(body.user.isMember).toBe(true);
  });

  it("redirects desktop OAuth to a local callback with a token", async () => {
    const start = await server.app.inject({
      method: "GET",
      url: "/auth/discord?desktop=1&redirectUri=http%3A%2F%2F127.0.0.1%3A4321%2Fcallback",
    });
    const stateCookie = start.cookies.find((c) => c.name === "swtor_oauth_state")!;
    const redirectCookie = start.cookies.find((c) => c.name === "swtor_desktop_redirect")!;
    const state = new URL(start.headers.location as string).searchParams.get("state")!;

    const callback = await server.app.inject({
      method: "GET",
      url: `/auth/discord/callback?code=abc&state=${encodeURIComponent(state)}`,
      cookies: {
        swtor_oauth_state: stateCookie.value,
        swtor_desktop_redirect: redirectCookie.value,
      },
    });

    expect(callback.statusCode).toBe(302);
    const location = new URL(callback.headers.location as string);
    expect(location.origin).toBe("http://127.0.0.1:4321");
    expect(location.searchParams.get("token")).toBeTruthy();
    expect(location.searchParams.get("discordId")).toBe("424242");
  });

  it("reports nobody when there is no session", async () => {
    const me = await server.app.inject({ method: "GET", url: "/api/me" });
    expect(me.json()).toEqual({ user: null });
  });
});

describe("desktop tokens", () => {
  it("refuses to issue a token without a session", async () => {
    const response = await server.app.inject({ method: "POST", url: "/api/me/tokens" });
    expect(response.statusCode).toBe(401);
  });

  it("returns the raw token exactly once and never again", async () => {
    const cookie = await signIn();
    const issued = await server.app.inject({
      method: "POST",
      url: "/api/me/tokens",
      headers: { cookie },
      payload: { name: "Desktop" },
    });
    const { token, prefix } = issued.json();

    expect(token.length).toBeGreaterThan(32);

    const me = await server.app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
    const serialised = JSON.stringify(me.json());

    expect(serialised).not.toContain(token);
    expect(me.json().user.tokens.some((t: { prefix: string }) => t.prefix === prefix)).toBe(true);
  });

  it("resolves an issued token back to its owner", async () => {
    const cookie = await signIn();
    const issued = await server.app.inject({
      method: "POST",
      url: "/api/me/tokens",
      headers: { cookie },
      payload: {},
    });

    const user = await accounts.findUserByToken(issued.json().token);
    expect(user?.discordId).toBe("424242");
  });

  it("stops resolving a revoked token", async () => {
    const cookie = await signIn();
    const issued = await server.app.inject({
      method: "POST",
      url: "/api/me/tokens",
      headers: { cookie },
      payload: {},
    });
    const { token, prefix } = issued.json();

    await server.app.inject({
      method: "DELETE",
      url: `/api/me/tokens/${prefix}`,
      headers: { cookie },
    });

    expect(await accounts.findUserByToken(token)).toBeNull();
  });
});

describe("character linking", () => {
  const character = {
    playerId: "688363584125440",
    name: "Twistle",
    discipline: "Watchman",
    role: "dps" as const,
  };

  it("lists characters seen in the user's own uploads", async () => {
    const cookie = await signIn();
    accounts.setSeenCharacters("424242", [character]);

    const available = await server.app.inject({
      method: "GET",
      url: "/api/me/characters/available",
      headers: { cookie },
    });
    expect(available.json()).toHaveLength(1);
  });

  it("lists characters seen in active live sessions", async () => {
    const cookie = await signIn();
    accounts.setSeenCharacters("424242", []);

    const session = new IngestSession({
      sessionId: "session-live",
      guildId: config.defaultGuildId,
      reportCode: "live-report",
      logFileName: "live.log",
      ownerUserId: "424242",
      onPullEnd: () => undefined,
    });
    session.push([
      {
        type: "areaEntered",
        timestamp: 0,
        lineNumber: 1,
        source: null,
        target: null,
        ability: null,
        threat: null,
        zone: { name: "Darvannis", id: "137438993037" },
        groupSize: 8,
        difficulty: "Veteran",
        logVersion: "v7.0.0b",
      },
      {
        type: "disciplineChanged",
        timestamp: 1,
        lineNumber: 2,
        source: {
          kind: "player",
          name: "Twistle",
          playerId: "player-1",
          position: null,
          hp: null,
          maxHp: null,
        },
        target: null,
        ability: null,
        threat: null,
        advancedClass: { name: "Guardian", id: "1" },
        discipline: { name: "Watchman", id: "2" },
        role: "dps",
      },
    ] as never);
    server.sessions.add(session);

    const available = await server.app.inject({
      method: "GET",
      url: "/api/me/characters/available",
      headers: { cookie },
    });

    expect(available.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ playerId: "player-1", name: "Twistle" })]),
    );

    server.sessions.remove("session-live");
  });

  // Otherwise anyone could claim the guild's best parser as their own.
  it("refuses a character that never appeared in the user's uploads", async () => {
    const cookie = await signIn();
    accounts.setSeenCharacters("424242", []);

    const response = await server.app.inject({
      method: "POST",
      url: "/api/me/characters",
      headers: { cookie },
      payload: { playerId: "999" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("links a character the user can prove they played", async () => {
    const cookie = await signIn();
    accounts.setSeenCharacters("424242", [character]);

    const response = await server.app.inject({
      method: "POST",
      url: "/api/me/characters",
      headers: { cookie },
      payload: { playerId: character.playerId },
    });
    expect(response.statusCode).toBe(200);

    const me = await server.app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
    expect(me.json().user.characters[0].name).toBe("Twistle");

    const available = await server.app.inject({
      method: "GET",
      url: "/api/me/characters/available",
      headers: { cookie },
    });
    expect(available.json()).toEqual([]);
  });

  it("refuses a character already linked to someone else", async () => {
    const cookie = await signIn();
    await accounts.upsertUser({
      guildId: config.defaultGuildId,
      discordId: "someone-else",
      username: "other",
      globalName: null,
      avatar: null,
      roles: [],
      isMember: true,
      isModerator: false,
    });
    await accounts.linkCharacter("someone-else", { ...character, linkedAt: new Date() });
    accounts.setSeenCharacters("424242", [character]);

    const response = await server.app.inject({
      method: "POST",
      url: "/api/me/characters",
      headers: { cookie },
      payload: { playerId: character.playerId },
    });
    expect(response.statusCode).toBe(409);
  });
});

describe("link codes", () => {
  const authorised = { authorization: `Bearer ${config.feedToken}` };

  it("refuses to mint a code without the service token", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/api/link/code",
      payload: { discordId: "1", username: "x" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("exchanges a code for a desktop token", async () => {
    const created = await server.app.inject({
      method: "POST",
      url: "/api/link/code",
      headers: authorised,
      payload: { discordId: "555", username: "linker" },
    });
    const { code } = created.json();
    expect(code).toHaveLength(6);

    const redeemed = await server.app.inject({
      method: "POST",
      url: "/api/link/redeem",
      payload: { code },
    });

    expect(redeemed.statusCode).toBe(200);
    expect(redeemed.json().discordId).toBe("555");
    expect(await accounts.findUserByToken(redeemed.json().token)).not.toBeNull();
  });

  it("burns the code so it cannot be redeemed twice", async () => {
    const created = await server.app.inject({
      method: "POST",
      url: "/api/link/code",
      headers: authorised,
      payload: { discordId: "556", username: "linker" },
    });
    const { code } = created.json();

    await server.app.inject({ method: "POST", url: "/api/link/redeem", payload: { code } });
    const second = await server.app.inject({
      method: "POST",
      url: "/api/link/redeem",
      payload: { code },
    });

    expect(second.statusCode).toBe(400);
  });

  it("rejects an unknown code", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/api/link/redeem",
      payload: { code: "ZZZZZZ" },
    });
    expect(response.statusCode).toBe(400);
  });
});
