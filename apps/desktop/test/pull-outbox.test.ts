import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PullOutbox } from "../src/core/pull-outbox.js";

const fight = {
  id: "pull-1",
  startedAt: 1000,
  endedAt: 2000,
} as never;

describe("PullOutbox", () => {
  it("persists before delivery and retries failed items", async () => {
    const directory = await mkdtemp(join(tmpdir(), "swtor-outbox-"));
    const path = join(directory, "pulls.json");
    const outbox = new PullOutbox(path);
    await outbox.enqueue({ kind: "boss", fight, characterName: "Kheir", serverId: "server", logFileName: "combat.txt" });

    const sender = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    await outbox.drain(sender, 0);
    expect(outbox.size).toBe(1);
    expect(JSON.parse(await readFile(path, "utf8")).items[0].attempts).toBe(1);

    await outbox.drain(sender, 3000);
    expect(outbox.size).toBe(0);
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it("deduplicates the same event across enqueue and reload", async () => {
    const directory = await mkdtemp(join(tmpdir(), "swtor-outbox-"));
    const path = join(directory, "pulls.json");
    const first = new PullOutbox(path);
    const eventId = await first.enqueue({ kind: "boss", fight, characterName: "Kheir", serverId: null, logFileName: "combat.txt" });
    await first.enqueue({ kind: "boss", fight, characterName: "Kheir", serverId: null, logFileName: "combat.txt", eventId });

    const reloaded = new PullOutbox(path);
    await reloaded.load();
    expect(reloaded.size).toBe(1);
  });
});
