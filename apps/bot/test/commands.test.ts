import { describe, expect, it } from "vitest";
import { registerSlashCommands } from "../src/bot.js";

describe("registerSlashCommands", () => {
  it("registers guild-scoped commands when a guild id is provided", async () => {
    const calls: Array<{ commands: unknown[]; guildId?: string }> = [];
    const client = {
      application: {
        commands: {
          set: async (commands: unknown[], guildId?: string) => {
            calls.push({ commands, guildId });
            return commands;
          },
        },
      },
    } as never;

    await registerSlashCommands(client, "guild-123");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.guildId).toBe("guild-123");
    expect(calls[0]?.commands).toHaveLength(1);
    expect(calls[0]?.commands[0]).toMatchObject({ name: "link" });
  });
});
