import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
  type APIEmbed,
  type TextBasedChannel,
} from "discord.js";
import { AnnouncementPolicy } from "./announce.js";
import type { BotConfig } from "./config.js";
import { buildAnnouncementEmbed } from "./embeds.js";
import { FeedClient } from "./feed.js";
import { buildLinkMessage, requestLinkCode } from "./link.js";
import { fetchUpcoming, recordMessage, recordSignup } from "./calendar.js";
import {
  buildSignupComponents,
  buildSignupEmbed,
  parseSignupCustomId,
  type OperationView,
} from "./signups.js";

interface ProgressionEntry {
  encounterId: string;
  attempts: number;
  kills: number;
  bestWipeHpPercent: number | null;
}

export function waitForClientReady(client: { once: (event: string, handler: () => void) => unknown; on: (event: string, handler: (error: Error) => void) => unknown }): Promise<void> {
  return new Promise((resolve, reject) => {
    const settled = { done: false };
    const finish = (callback: () => void) => {
      if (settled.done) return;
      settled.done = true;
      callback();
    };

    client.once("ready", () => finish(resolve));
    client.once("error", (error: Error) => finish(() => reject(error)));
  });
}

export async function registerSlashCommands(
  client: { application: { commands: { set: (commands: unknown[], guildId?: string) => Promise<unknown> } } | null },
  guildId?: string,
): Promise<void> {
  const commands = [
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Get a one-time code to connect the desktop combat streamer")
      .toJSON(),
  ];

  await client.application?.commands.set(commands, guildId);
}

/**
 * Loads existing progression so a restart does not re-announce a first kill
 * the guild already celebrated.
 */
async function seedFromApi(policy: AnnouncementPolicy, apiUrl: string): Promise<number> {
  const response = await fetch(`${apiUrl}/api/progression`);
  if (!response.ok) throw new Error(`progression returned ${response.status}`);

  const entries = (await response.json()) as ProgressionEntry[];
  for (const entry of entries) {
    policy.seed(entry.encounterId, {
      attempts: entry.attempts,
      kills: entry.kills,
      bestWipeHpPercent: entry.bestWipeHpPercent,
    });
  }
  return entries.length;
}

export async function startBot(config: BotConfig): Promise<() => Promise<void>> {
  // Only the gateway basics: the bot posts, it does not read message content.
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const policy = new AnnouncementPolicy({
    closeWipePercent: config.closeWipePercent,
    bossesOnly: config.bossesOnly,
  });

  await client.login(config.discordToken);
  await waitForClientReady(client);

  const channel = await client.channels.fetch(config.progressionChannelId);
  if (channel === null || !channel.isTextBased() || !("send" in channel)) {
    throw new Error(
      `Channel ${config.progressionChannelId} is not a text channel the bot can post to`,
    );
  }
  const target = channel as TextBasedChannel & {
    send: (options: { embeds: APIEmbed[] }) => unknown;
  };

  const seeded = await seedFromApi(policy, config.apiUrl).catch(() => -1);
  if (seeded < 0) {
    console.warn("Could not load progression history; first kills may be re-announced");
  }

  await registerSlashCommands(client, config.guildId);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "link") return;
    try {
      const { code, expiresInSeconds } = await requestLinkCode(config, {
        id: interaction.user.id,
        username: interaction.user.username,
        globalName: interaction.user.globalName ?? null,
      });

      // Ephemeral: the code is a bearer credential until it is redeemed.
      await interaction.reply({
        content: buildLinkMessage(code, expiresInSeconds, config.webUrl),
        flags: MessageFlags.Ephemeral,
      });
    } catch (error: unknown) {
      console.error("link command failed", error);
      await interaction.reply({
        content: "Could not reach the analytics service. Try again shortly.",
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  const signupChannel = await client.channels.fetch(config.signupChannelId);
  const signupTarget =
    signupChannel !== null && signupChannel.isTextBased() && "send" in signupChannel
      ? (signupChannel as TextBasedChannel & {
          send: (options: unknown) => Promise<{ id: string }>;
        })
      : null;

  const render = (operation: OperationView) => ({
    embeds: [buildSignupEmbed(operation) as APIEmbed],
    components: buildSignupComponents(operation),
  });

  /** Posts signup embeds for operations the bot has not announced yet. */
  async function publishNewOperations(): Promise<void> {
    if (signupTarget === null) return;

    for (const operation of await fetchUpcoming(config)) {
      if (operation.discordMessageId !== null) continue;
      const message = await signupTarget.send(render(operation));
      // Recorded immediately so a crash cannot orphan the post.
      await recordMessage(config, operation.code, config.signupChannelId, message.id);
    }
  }

  const calendarTimer = setInterval(() => {
    void publishNewOperations().catch((error: unknown) =>
      console.error("failed to publish operations", error),
    );
  }, config.calendarPollMs);
  calendarTimer.unref?.();
  void publishNewOperations().catch(() => undefined);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const parsed = parseSignupCustomId(interaction.customId);
    if (parsed === null) return;

    try {
      const updated = await recordSignup(config, parsed.code, {
        discordUserId: interaction.user.id,
        displayName: interaction.user.globalName ?? interaction.user.username,
        status: parsed.status,
      });

      // Editing in place keeps one authoritative post per operation.
      await interaction.update(render(updated));
    } catch (error: unknown) {
      console.error("signup failed", error);
      await interaction.reply({
        content: "Could not record that signup. Try again shortly.",
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  const feed = new FeedClient({
    apiUrl: config.apiUrl,
    token: config.feedToken,
    onState: (state, detail) => console.info(`feed ${state}${detail ? `: ${detail}` : ""}`),
    onPull: ({ pull, reportCode, fightId }) => {
      const announcement = policy.evaluate(pull, { reportCode, fightId });
      if (announcement === null) return;

      const embed = buildAnnouncementEmbed(announcement, { webUrl: config.webUrl });
      Promise.resolve(target.send({ embeds: [embed as APIEmbed] })).catch((error: unknown) =>
        console.error("failed to post announcement", error),
      );
    },
  });

  feed.connect();

  return async () => {
    clearInterval(calendarTimer);
    feed.disconnect();
    await client.destroy();
  };
}
