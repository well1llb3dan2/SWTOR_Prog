import { toPublicUser, type LinkedCharacter } from "@swtor/db";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AccountStore, SeenCharacter } from "../accountStore.js";
import type { ApiConfig } from "../config.js";
import type { SessionManager } from "../session.js";
import {
  buildAuthorizeUrl,
  createState,
  exchangeCode,
  fetchGuildMember,
  fetchIdentity,
  resolveMembership,
  verifyState,
  type Fetcher,
} from "../auth/discord.js";

const SESSION_COOKIE = "swtor_session";
const STATE_COOKIE = "swtor_oauth_state";
const LINK_CODE_COOKIE = "swtor_link_code";
const DESKTOP_REDIRECT_COOKIE = "swtor_desktop_redirect";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export interface AuthRouteDeps {
  config: ApiConfig;
  accounts: AccountStore;
  sessions: SessionManager;
  /** Injected so the OAuth exchange can be tested without Discord. */
  fetchImpl?: Fetcher;
}

function readSignedCookie(request: FastifyRequest, name: string): string | null {
  const raw = request.cookies[name];
  if (raw === undefined) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value !== null ? unsigned.value : null;
}

function readSession(request: FastifyRequest): string | null {
  return readSignedCookie(request, SESSION_COOKIE);
}

export function currentDiscordId(request: FastifyRequest): string | null {
  return readSession(request);
}

function dedupeCharacters(characters: SeenCharacter[]): SeenCharacter[] {
  const seen = new Map<string, SeenCharacter>();
  for (const character of characters) {
    seen.set(character.playerId, character);
  }
  return [...seen.values()];
}

export async function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDeps): Promise<void> {
  const { config, accounts, sessions } = deps;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const cookieOptions = {
    httpOnly: true,
    sameSite: (config.cookieSecure ? "none" : "lax") as "none" | "lax",
    secure: config.cookieSecure,
    path: "/",
    signed: true,
  };

  /** Resolves the signed-in user, or replies 401. */
  async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    const discordId = readSession(request);
    if (discordId === null) {
      await reply.code(401).send({ error: "not signed in" });
      return null;
    }
    const user = await accounts.findUserByDiscordId(discordId);
    if (user === null) {
      await reply.code(401).send({ error: "not signed in" });
      return null;
    }
    return user;
  }

  app.get("/api/me", async (request) => {
    const discordId = currentDiscordId(request);
    if (discordId === null) return { user: null };
    const user = await accounts.findUserByDiscordId(discordId);
    return { user: user === null ? null : toPublicUser(user) };
  });

  if (config.discord === null) {
    // Without credentials the portal simply has no sign-in; everything else works.
    app.get("/auth/discord", async (_request, reply) =>
      reply.code(503).send({ error: "Discord sign-in is not configured" }),
    );
    return;
  }

  const discord = config.discord;
  const secret = config.sessionSecret!;

  app.get("/auth/discord", async (request, reply) => {
    const query = z
      .object({
        linkCode: z.string().min(4).max(16).optional(),
        desktop: z.enum(["0", "1", "true", "false"]).optional(),
        redirectUri: z.string().url().optional(),
      })
      .safeParse(request.query);
    const linkCode = query.success && query.data.linkCode !== undefined ? query.data.linkCode.trim().toUpperCase() : null;
    const desktop = query.success && query.data.desktop !== undefined ? query.data.desktop === "1" || query.data.desktop === "true" : false;
    const redirectUri = query.success && query.data.redirectUri !== undefined ? query.data.redirectUri : null;
    const state = createState(secret);

    return reply
      .setCookie(STATE_COOKIE, state, { ...cookieOptions, maxAge: 600 })
      .setCookie(
        LINK_CODE_COOKIE,
        linkCode ?? "",
        { ...cookieOptions, maxAge: 600, expires: linkCode === null ? new Date(0) : undefined },
      )
      .setCookie(
        DESKTOP_REDIRECT_COOKIE,
        redirectUri ?? "",
        { ...cookieOptions, maxAge: 600, expires: desktop && redirectUri !== null ? undefined : new Date(0) },
      )
      .redirect(buildAuthorizeUrl(discord, state));
  });

  app.get("/auth/discord/callback", async (request, reply) => {
    const query = z
      .object({ code: z.string().min(1), state: z.string().min(1) })
      .safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid callback" });

    const cookie = request.cookies[STATE_COOKIE];
    const unsigned = cookie === undefined ? null : request.unsignCookie(cookie);
    const expected = unsigned?.valid === true ? unsigned.value : null;
    const linkCode = readSignedCookie(request, LINK_CODE_COOKIE);
    const desktopRedirect = readSignedCookie(request, DESKTOP_REDIRECT_COOKIE);

    // Both checks matter: the signature proves we issued the state, and the
    // cookie comparison proves it came back through the same browser.
    if (expected !== query.data.state || !verifyState(query.data.state, secret)) {
      return reply.code(400).send({ error: "invalid state" });
    }

    try {
      const accessToken = await exchangeCode(discord, query.data.code, fetchImpl);
      const identity = await fetchIdentity(accessToken, fetchImpl);
      const member = await fetchGuildMember(accessToken, discord.guildId, fetchImpl);
      const membership = resolveMembership(member, discord);

      await accounts.upsertUser({
        guildId: config.defaultGuildId,
        discordId: identity.id,
        username: identity.username,
        globalName: identity.global_name,
        avatar: identity.avatar,
        ...membership,
      });

      const redirectTarget = new URL("/me", config.webUrl);
      if (linkCode !== null && linkCode.length > 0) {
        redirectTarget.searchParams.set("linkCode", linkCode);
      }

      const issueToken = async () => {
        const issued = await accounts.issueUserToken(identity.id, "Desktop OAuth");
        return issued.token;
      };

      const finalRedirect = desktopRedirect !== null && desktopRedirect.length > 0
        ? new URL(desktopRedirect)
        : redirectTarget;

      if (desktopRedirect !== null && desktopRedirect.length > 0) {
        finalRedirect.searchParams.set("token", await issueToken());
        finalRedirect.searchParams.set("discordId", identity.id);
      }

      return reply
        .clearCookie(STATE_COOKIE, cookieOptions)
        .clearCookie(LINK_CODE_COOKIE, cookieOptions)
        .clearCookie(DESKTOP_REDIRECT_COOKIE, cookieOptions)
        .setCookie(SESSION_COOKIE, identity.id, {
          ...cookieOptions,
          maxAge: SESSION_MAX_AGE_SECONDS,
        })
        .redirect(finalRedirect.toString());
    } catch (error: unknown) {
      app.log.warn({ err: error }, "discord sign-in failed");
      return reply.code(502).send({ error: "Discord sign-in failed" });
    }
  });

  const clearSessionCookie = (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, { ...cookieOptions, expires: new Date(0), maxAge: 0 });
    return { ok: true };
  };

  app.get("/auth/logout", async (request, reply) => clearSessionCookie(request, reply));
  app.post("/auth/logout", async (request, reply) => clearSessionCookie(request, reply));

  app.post("/api/me/tokens", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const body = z
      .object({ name: z.string().min(1).max(48).default("Desktop") })
      .parse(request.body ?? {});
    const issued = await accounts.issueUserToken(user.discordId, body.name);

    // The raw token is returned exactly once and never stored.
    return { token: issued.token, prefix: issued.prefix };
  });

  app.delete("/api/me/tokens/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const { id } = z.object({ id: z.string().min(1).max(64) }).parse(request.params);
    await accounts.revokeUserToken(user.discordId, id);
    return { ok: true };
  });

  app.get("/api/me/characters/available", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const uploaded = await accounts.charactersSeenBy(config.defaultGuildId, user.discordId);
    const live = sessions.list()
      .filter((session) => session.ownerUserId === user.discordId)
      .flatMap((session) => session.characters(Date.now()));
    const available = dedupeCharacters([...uploaded, ...live]);
    const linked = new Set(user.characters.map((c) => c.playerId));
    return available.filter((character) => !linked.has(character.playerId));
  });

  app.get("/api/me/stream/status", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const active = sessions.findByOwnerUserId(user.discordId);
    if (active.length === 0) {
      return { active: false, sessions: [] };
    }

    return {
      active: true,
      sessionId: active[0]?.sessionId ?? null,
      sessions: active.map((session) => ({
        sessionId: session.sessionId,
        reportCode: session.reportCode,
        logFileName: session.logFileName,
        eventsReceived: session.eventsReceived,
        lastSeenAt: session.lastSeenAt,
      })),
      reportCode: active[0]?.reportCode ?? null,
      logFileName: active[0]?.logFileName ?? null,
      eventsReceived: active[0]?.eventsReceived ?? 0,
      lastSeenAt: active[0]?.lastSeenAt ?? null,
    };
  });

  app.post("/api/me/characters", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const body = z.object({ playerId: z.string().min(1).max(32) }).parse(request.body);

    // Ownership proof: the character must have appeared in a log this user
    // uploaded, or in one of their active live sessions. Without that anyone
    // could claim the guild's best parser.
    const uploaded = await accounts.charactersSeenBy(config.defaultGuildId, user.discordId);
    const live = sessions.list()
      .filter((session) => session.ownerUserId === user.discordId)
      .flatMap((session) => session.characters(Date.now()));
    const seen = dedupeCharacters([...uploaded, ...live]);
    const character = seen.find((c) => c.playerId === body.playerId);
    if (character === undefined) {
      return reply.code(403).send({ error: "that character has not appeared in your uploads or live sessions" });
    }

    if (await accounts.isCharacterClaimed(config.defaultGuildId, body.playerId, user.discordId)) {
      return reply.code(409).send({ error: "that character is already linked to someone else" });
    }

    const linked: LinkedCharacter = { ...character, linkedAt: new Date() };
    await accounts.linkCharacter(user.discordId, linked);
    return { ok: true, character: linked };
  });

  app.delete("/api/me/characters/:playerId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const { playerId } = z.object({ playerId: z.string().min(1).max(32) }).parse(request.params);
    await accounts.unlinkCharacter(user.discordId, playerId);
    return { ok: true };
  });

  app.patch("/api/me/preferences", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (user === null) return reply;

    const body = z
      .object({
        preferredRole: z.enum(["tank", "healer", "dps", "bench", "declined"]).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
        availabilityWindow: z.string().max(120).nullable().optional(),
      })
      .parse(request.body ?? {});

    const updated = await accounts.updatePreferences(user.discordId, body);
    return { ok: true, preferences: updated?.signupPreferences ?? user.signupPreferences };
  });

  /** Called by the bot when a member runs `/link`. */
  app.post("/api/link/code", async (request, reply) => {
    const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    if (provided !== config.feedToken) return reply.code(401).send({ error: "unauthorised" });

    const body = z
      .object({
        discordId: z.string().min(1).max(32),
        username: z.string().min(1).max(64),
        globalName: z.string().max(64).nullable().default(null),
      })
      .parse(request.body);

    // Create the account on first use so a member can link before ever
    // visiting the portal; permissions stay off until they sign in.
    if ((await accounts.findUserByDiscordId(body.discordId)) === null) {
      await accounts.upsertUser({
        guildId: config.defaultGuildId,
        discordId: body.discordId,
        username: body.username,
        globalName: body.globalName,
        avatar: null,
        roles: [],
        isMember: true,
        isModerator: false,
      });
    }

    const code = await accounts.createLinkCode(config.defaultGuildId, body.discordId);
    return { code, expiresInSeconds: 600 };
  });

  /** Redeemed by the desktop client so nobody has to copy a long secret. */
  app.post("/api/link/redeem", async (request, reply) => {
    const body = z.object({ code: z.string().min(4).max(16) }).parse(request.body);
    const entry = await accounts.consumeLinkCode(body.code.trim().toUpperCase());
    if (entry === null) return reply.code(400).send({ error: "invalid or expired code" });

    const user = await accounts.findUserByDiscordId(entry.discordId);
    if (user === null) return reply.code(400).send({ error: "invalid or expired code" });

    const issued = await accounts.issueUserToken(entry.discordId, "Desktop (linked)");
    return { token: issued.token, username: user.username, discordId: user.discordId };
  });
}
