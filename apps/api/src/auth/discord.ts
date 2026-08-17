import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface DiscordIdentity {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordGuildMember {
  roles: string[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  guildId: string;
  officerRoleIds: string[];
  moderatorRoleIds: string[];
  memberRoleIds: string[];
}

export type Fetcher = typeof fetch;

const DISCORD_API = "https://discord.com/api/v10";
/** `identify` names the user; `guilds.members.read` reads their roles in one guild. */
const SCOPES = ["identify", "guilds.members.read"];

export function buildAuthorizeUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Creates a signed CSRF state value.
 *
 * The nonce is carried in the URL and the signature proves this server issued
 * it, so a callback replayed from another site fails verification.
 */
export function createState(secret: string): string {
  const nonce = randomBytes(16).toString("base64url");
  return `${nonce}.${sign(nonce, secret)}`;
}

export function verifyState(state: string, secret: string): boolean {
  const separator = state.lastIndexOf(".");
  if (separator <= 0) return false;

  const nonce = state.slice(0, separator);
  const provided = Buffer.from(state.slice(separator + 1));
  const expected = Buffer.from(sign(nonce, secret));
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export async function exchangeCode(
  config: OAuthConfig,
  code: string,
  fetchImpl: Fetcher = fetch,
): Promise<string> {
  const response = await fetchImpl(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) throw new Error(`Discord token exchange failed (${response.status})`);
  const body = (await response.json()) as { access_token?: string };
  if (typeof body.access_token !== "string") throw new Error("Discord returned no access token");
  return body.access_token;
}

export async function fetchIdentity(
  accessToken: string,
  fetchImpl: Fetcher = fetch,
): Promise<DiscordIdentity> {
  const response = await fetchImpl(`${DISCORD_API}/users/@me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Discord identity failed (${response.status})`);
  return (await response.json()) as DiscordIdentity;
}

/** Returns null when the user is not in the guild at all. */
export async function fetchGuildMember(
  accessToken: string,
  guildId: string,
  fetchImpl: Fetcher = fetch,
): Promise<DiscordGuildMember | null> {
  const response = await fetchImpl(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Discord member lookup failed (${response.status})`);
  return (await response.json()) as DiscordGuildMember;
}

export interface Membership {
  isMember: boolean;
  isModerator: boolean;
  roles: string[];
}

const explicitRoleConfig = (config: Pick<OAuthConfig, "officerRoleIds" | "moderatorRoleIds">) =>
  (config.officerRoleIds ?? []).length > 0 || (config.moderatorRoleIds ?? []).length > 0;

/**
 * Maps Discord roles onto portal permissions.
 *
 * Membership defaults to true when no member roles are configured, so a small
 * guild need not set anything up; moderator never defaults on, because that
 * would silently expose the moderation views.
 */
export function resolveMembership(
  member: DiscordGuildMember | null,
  config: Pick<OAuthConfig, "officerRoleIds" | "moderatorRoleIds" | "memberRoleIds">,
): Membership {
  if (member === null) return { isMember: false, isModerator: false, roles: [] };

  const roles = member.roles ?? [];
  const officerRoleIds = (config.officerRoleIds ?? []).length > 0
    ? (config.officerRoleIds ?? [])
    : (config.moderatorRoleIds ?? []);
  const memberRoleIds = config.memberRoleIds ?? [];
  const isMember = memberRoleIds.length === 0 || roles.some((r) => memberRoleIds.includes(r));
  const isModerator = explicitRoleConfig(config)
    ? roles.some((r) => officerRoleIds.includes(r))
    : isMember;

  return { isMember, isModerator, roles };
}
