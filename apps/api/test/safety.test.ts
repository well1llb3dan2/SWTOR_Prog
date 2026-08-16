import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { auditProductionSafety, describeProblems } from "../src/safety.js";

const production = (overrides: Record<string, string> = {}) =>
  loadConfig({
    NODE_ENV: "production",
    INGEST_TOKEN: "a-genuinely-long-random-ingest-token",
    FEED_TOKEN: "a-different-genuinely-long-feed-token",
    CORS_ORIGINS: "https://infamous.gg",
    COOKIE_SECURE: "true",
    MONGODB_URI: "mongodb+srv://example",
    ...overrides,
  });

const settingsIn = (overrides: Record<string, string> = {}) =>
  auditProductionSafety(production(overrides)).map((p) => p.setting);

describe("auditProductionSafety", () => {
  it("passes a correctly configured production deployment", () => {
    expect(auditProductionSafety(production())).toEqual([]);
  });

  it("falls back to the default port when PORT is blank", () => {
    expect(loadConfig({ ...production(), PORT: "", INGEST_TOKEN: "a-genuinely-long-random-ingest-token" }).port).toBe(3001);
  });

  it("ignores development entirely so local runs stay frictionless", () => {
    const dev = loadConfig({ INGEST_TOKEN: "test-token-that-is-long-enough" });
    expect(auditProductionSafety(dev)).toEqual([]);
  });

  it("rejects the tokens shipped in the example env files", () => {
    expect(settingsIn({ INGEST_TOKEN: "change-me-to-a-long-random-string" })).toContain(
      "INGEST_TOKEN",
    );
  });

  it("rejects a short ingest token", () => {
    expect(settingsIn({ INGEST_TOKEN: "sixteen-chars-ok" })).toContain("INGEST_TOKEN");
  });

  // A leaked bot credential must not also be able to inject combat data.
  it("requires the feed token to differ from the ingest token", () => {
    const shared = "the-same-long-token-used-for-both-things";
    expect(settingsIn({ INGEST_TOKEN: shared, FEED_TOKEN: shared })).toContain("FEED_TOKEN");
  });

  it("requires cookies to be HTTPS only", () => {
    expect(settingsIn({ COOKIE_SECURE: "false" })).toContain("COOKIE_SECURE");
  });

  it("rejects wildcard or plaintext CORS origins", () => {
    expect(settingsIn({ CORS_ORIGINS: "*" })).toContain("CORS_ORIGINS");
    expect(settingsIn({ CORS_ORIGINS: "http://infamous.gg" })).toContain("CORS_ORIGINS");
  });

  it("requires a database so reports survive a restart", () => {
    const config = production();
    const withoutMongo = { ...config, mongoUri: null };
    expect(auditProductionSafety(withoutMongo).map((p) => p.setting)).toContain("MONGODB_URI");
  });

  it("requires an https redirect once Discord sign-in is enabled", () => {
    const settings = settingsIn({
      SESSION_SECRET: "a-session-secret-that-is-definitely-long-enough",
      DISCORD_CLIENT_ID: "id",
      DISCORD_CLIENT_SECRET: "secret",
      DISCORD_GUILD_ID: "guild",
      PUBLIC_API_URL: "http://api.infamous.gg",
    });
    expect(settings).toContain("PUBLIC_API_URL");
  });

  it("accepts a fully configured sign-in setup", () => {
    expect(
      settingsIn({
        SESSION_SECRET: "a-session-secret-that-is-definitely-long-enough",
        DISCORD_CLIENT_ID: "id",
        DISCORD_CLIENT_SECRET: "secret",
        DISCORD_GUILD_ID: "guild",
        PUBLIC_API_URL: "https://api.infamous.gg",
      }),
    ).toEqual([]);
  });

  it("reports every problem at once rather than one per restart", () => {
    const problems = auditProductionSafety(
      production({
        INGEST_TOKEN: "change-me-to-a-long-random-string",
        COOKIE_SECURE: "false",
        CORS_ORIGINS: "*",
      }),
    );
    expect(problems.length).toBeGreaterThanOrEqual(3);
    expect(describeProblems(problems)).toContain("Refusing to start");
  });
});
