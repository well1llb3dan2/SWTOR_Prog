import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { waitForClientReady } from "../src/bot.js";

class MockClient extends EventEmitter {
  #ready = false;

  isReady(): boolean {
    return this.#ready;
  }

  markReady(): void {
    this.#ready = true;
    this.emit("ready");
  }
}

describe("waitForClientReady", () => {
  it("resolves once the client reports ready", async () => {
    const client = new MockClient();
    const pending = waitForClientReady(client as never);
    client.markReady();
    await expect(pending).resolves.toBeUndefined();
  });

  it("rejects when the client emits an error before ready", async () => {
    const client = new MockClient();
    const pending = waitForClientReady(client as never);
    client.emit("error", new Error("boom"));
    await expect(pending).rejects.toThrow("boom");
  });
});
