import type { ApiConfig } from "./config.js";

/** Secrets that ship in the example env files and must never reach production. */
const PLACEHOLDER_SECRETS = [
  "change-me-to-a-long-random-string",
  "change-me-to-a-different-long-random-string",
  "test-token-that-is-long-enough",
];

export interface SafetyProblem {
  setting: string;
  problem: string;
}

/**
 * Audits configuration for anything unsafe to run in production.
 *
 * Deliberately fails startup rather than logging a warning: a service that
 * boots with a placeholder token or cookies that work over plain HTTP looks
 * healthy while being wide open, and nobody reads warnings from a green deploy.
 */
export function auditProductionSafety(config: ApiConfig): SafetyProblem[] {
  if (config.nodeEnv !== "production") return [];

  const problems: SafetyProblem[] = [];

  if (PLACEHOLDER_SECRETS.includes(config.ingestToken)) {
    problems.push({ setting: "INGEST_TOKEN", problem: "still set to an example value" });
  }
  if (config.ingestToken.length < 32) {
    problems.push({ setting: "INGEST_TOKEN", problem: "must be at least 32 characters" });
  }
  if (PLACEHOLDER_SECRETS.includes(config.feedToken)) {
    problems.push({ setting: "FEED_TOKEN", problem: "still set to an example value" });
  }
  if (config.feedToken === config.ingestToken) {
    problems.push({
      setting: "FEED_TOKEN",
      // Otherwise a leaked bot credential can also inject combat data.
      problem: "must differ from INGEST_TOKEN so the two cannot be substituted",
    });
  }
  if (!config.cookieSecure) {
    problems.push({ setting: "COOKIE_SECURE", problem: "must be true so cookies require HTTPS" });
  }
  if (config.corsOrigins.length === 0 || config.corsOrigins.includes("*")) {
    problems.push({ setting: "CORS_ORIGINS", problem: "must list explicit origins" });
  }
  if (config.corsOrigins.some((origin) => origin.startsWith("http://"))) {
    problems.push({ setting: "CORS_ORIGINS", problem: "must use https origins" });
  }
  if (config.mongoUri === null) {
    problems.push({
      setting: "MONGODB_URI",
      problem: "is required; without it every report is lost on restart",
    });
  }
  if (config.discord !== null && config.sessionSecret !== null) {
    if (config.sessionSecret.length < 32) {
      problems.push({ setting: "SESSION_SECRET", problem: "must be at least 32 characters" });
    }
    if (!config.discord.redirectUri.startsWith("https://")) {
      problems.push({ setting: "PUBLIC_API_URL", problem: "must be an https origin" });
    }
  }

  return problems;
}

export function describeProblems(problems: readonly SafetyProblem[]): string {
  return [
    "Refusing to start: unsafe production configuration.",
    ...problems.map((p) => `  - ${p.setting} ${p.problem}`),
  ].join("\n");
}
