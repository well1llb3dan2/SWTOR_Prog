import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN: z.string().min(20),
  PROGRESSION_CHANNEL_ID: z.string().min(5),
  /** Channel signup posts go to; defaults to the progression channel. */
  SIGNUP_CHANNEL_ID: z.string().min(5).optional(),
  /** How often to look for newly scheduled operations. */
  CALENDAR_POLL_MS: z.coerce.number().int().positive().default(60_000),
  API_URL: z.string().default("http://localhost:3001"),
  FEED_TOKEN: z.string().min(16),
  WEB_URL: z.string().default("http://localhost:3000"),
  /**
   * Wipes are only announced when the boss ends below this health.
   * Announcing every wipe turns the channel into noise during progression.
   */
  CLOSE_WIPE_PERCENT: z.coerce.number().positive().max(100).default(15),
  /** Suppress announcements for anything that is not a catalogued boss. */
  BOSSES_ONLY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export interface BotConfig {
  discordToken: string;
  progressionChannelId: string;
  signupChannelId: string;
  calendarPollMs: number;
  apiUrl: string;
  feedToken: string;
  webUrl: string;
  closeWipePercent: number;
  bossesOnly: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const parsed = schema.parse(env);
  return {
    discordToken: parsed.DISCORD_TOKEN,
    progressionChannelId: parsed.PROGRESSION_CHANNEL_ID,
    signupChannelId: parsed.SIGNUP_CHANNEL_ID ?? parsed.PROGRESSION_CHANNEL_ID,
    calendarPollMs: parsed.CALENDAR_POLL_MS,
    apiUrl: parsed.API_URL,
    feedToken: parsed.FEED_TOKEN,
    webUrl: parsed.WEB_URL,
    closeWipePercent: parsed.CLOSE_WIPE_PERCENT,
    bossesOnly: parsed.BOSSES_ONLY,
  };
}
