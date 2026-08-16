import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  /** Shared secret desktop clients present on the ingest namespace. */
  INGEST_TOKEN: z.string().min(16),
  /** Secret for service consumers of the feed namespace; defaults to the ingest token. */
  FEED_TOKEN: z.string().min(16).optional(),
  /** Comma-separated browser origins allowed to reach the API. */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().default("swtor"),
  /** Days to keep raw combat events; omit to keep them indefinitely. */
  RETENTION_DAYS: z.coerce.number().int().positive().optional(),
  DEFAULT_GUILD_ID: z.string().default("infamous"),
  SNAPSHOT_INTERVAL_MS: z.coerce.number().int().positive().default(1_000),
  MAX_SESSIONS: z.coerce.number().int().positive().default(200),
  LOG_LEVEL: z.string().default("info"),
  /** Sustained batches per second accepted from one desktop client. */
  INGEST_BATCH_RATE: z.coerce.number().positive().default(20),
  /** Burst allowance, sized so a reconnecting client can drain its backlog. */
  INGEST_BATCH_BURST: z.coerce.number().positive().default(200),
  /** Silence, on the log's own clock, that ends a pull. */
  PULL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  /** Shorter grace once the logging player leaves combat. */
  PULL_EXIT_GRACE_MS: z.coerce.number().int().positive().default(2_500),

  /** Signs session cookies and OAuth state. Required once auth is enabled. */
  SESSION_SECRET: z.string().min(32).optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  /** Comma-separated role ids; moderator never defaults on. */
  DISCORD_MODERATOR_ROLE_IDS: z.string().default(""),
  DISCORD_MEMBER_ROLE_IDS: z.string().default(""),
  /** Public origin of this API, used to build the OAuth redirect. */
  PUBLIC_API_URL: z.string().default("http://localhost:3001"),
  WEB_URL: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export interface ApiConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  host: string;
  ingestToken: string;
  feedToken: string;
  corsOrigins: string[];
  mongoUri: string | null;
  mongoDb: string;
  retentionDays: number | null;
  defaultGuildId: string;
  snapshotIntervalMs: number;
  maxSessions: number;
  logLevel: string;
  ingestBatchRate: number;
  ingestBatchBurst: number;
  pullIdleTimeoutMs: number;
  pullExitGraceMs: number;
  sessionSecret: string | null;
  webUrl: string;
  cookieSecure: boolean;
  /** Null when Discord credentials are absent; auth routes stay disabled. */
  discord: {
    clientId: string;
    clientSecret: string;
    guildId: string;
    redirectUri: string;
    moderatorRoleIds: string[];
    memberRoleIds: string[];
  } | null;
}

const ids = (value: string): string[] =>
  value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = schema.parse(env);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    ingestToken: parsed.INGEST_TOKEN,
    feedToken: parsed.FEED_TOKEN ?? parsed.INGEST_TOKEN,
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    mongoUri: parsed.MONGODB_URI ?? null,
    mongoDb: parsed.MONGODB_DB,
    retentionDays: parsed.RETENTION_DAYS ?? null,
    defaultGuildId: parsed.DEFAULT_GUILD_ID,
    snapshotIntervalMs: parsed.SNAPSHOT_INTERVAL_MS,
    maxSessions: parsed.MAX_SESSIONS,
    logLevel: parsed.LOG_LEVEL,
    ingestBatchRate: parsed.INGEST_BATCH_RATE,
    ingestBatchBurst: parsed.INGEST_BATCH_BURST,
    pullIdleTimeoutMs: parsed.PULL_IDLE_TIMEOUT_MS,
    pullExitGraceMs: parsed.PULL_EXIT_GRACE_MS,
    sessionSecret: parsed.SESSION_SECRET ?? null,
    webUrl: parsed.WEB_URL,
    cookieSecure: parsed.COOKIE_SECURE,
    discord:
      parsed.DISCORD_CLIENT_ID === undefined ||
      parsed.DISCORD_CLIENT_SECRET === undefined ||
      parsed.DISCORD_GUILD_ID === undefined ||
      parsed.SESSION_SECRET === undefined
        ? null
        : {
            clientId: parsed.DISCORD_CLIENT_ID,
            clientSecret: parsed.DISCORD_CLIENT_SECRET,
            guildId: parsed.DISCORD_GUILD_ID,
            redirectUri: `${parsed.PUBLIC_API_URL}/auth/discord/callback`,
            moderatorRoleIds: ids(parsed.DISCORD_MODERATOR_ROLE_IDS),
            memberRoleIds: ids(parsed.DISCORD_MEMBER_ROLE_IDS),
          },
  };
}
