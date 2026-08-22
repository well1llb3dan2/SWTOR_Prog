import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BossFightSummary, TrashEncounterSummary } from "@swtor/analytics";
import type { CombatEvent } from "@swtor/shared";

export type PullOutboxItem =
  | {
      eventId: string;
      kind: "boss";
      fight: BossFightSummary;
      characterName: string;
      serverId: string | null;
      logFileName: string | null;
      events?: CombatEvent[];
      attempts: number;
      nextAttemptAt: number;
      lastError?: string;
    }
  | {
      eventId: string;
      kind: "trash";
      fight: TrashEncounterSummary;
      characterName: string;
      serverId: string | null;
      logFileName: string | null;
      events?: CombatEvent[];
      attempts: number;
      nextAttemptAt: number;
      lastError?: string;
    };

interface PullOutboxFile {
  version: 1;
  items: PullOutboxItem[];
}

export function derivePullEventId(kind: PullOutboxItem["kind"], fight: BossFightSummary | TrashEncounterSummary, logFileName: string | null): string {
  return createHash("sha256")
    .update(JSON.stringify({ kind, id: fight.id, startedAt: fight.startedAt, endedAt: fight.endedAt, logFileName }))
    .digest("hex");
}

export class PullOutbox {
  readonly #path: string;
  #items: PullOutboxItem[] = [];
  #loaded = false;
  #draining = false;

  constructor(path: string) {
    this.#path = path;
  }

  get size(): number {
    return this.#items.length;
  }

  async load(): Promise<void> {
    if (this.#loaded) return;
    this.#loaded = true;
    try {
      const raw = JSON.parse(await readFile(this.#path, "utf8")) as PullOutboxFile;
      if (raw.version === 1 && Array.isArray(raw.items)) this.#items = raw.items;
    } catch {
      this.#items = [];
    }
  }

  async enqueue(item: Omit<PullOutboxItem, "eventId" | "attempts" | "nextAttemptAt"> & { eventId?: string }): Promise<string> {
    await this.load();
    const eventId = item.eventId ?? derivePullEventId(item.kind, item.fight, item.logFileName);
    if (!this.#items.some((queued) => queued.eventId === eventId)) {
      this.#items.push({ ...item, eventId, attempts: 0, nextAttemptAt: 0 } as PullOutboxItem);
      await this.#persist();
    }
    return eventId;
  }

  async drain(sender: (item: PullOutboxItem) => Promise<void>, now = Date.now()): Promise<void> {
    await this.load();
    if (this.#draining) return;
    this.#draining = true;
    try {
      for (const item of [...this.#items]) {
        if (item.nextAttemptAt > now) continue;
        try {
          await sender(item);
          this.#items = this.#items.filter((queued) => queued.eventId !== item.eventId);
          await this.#persist();
        } catch (error) {
          const attempts = item.attempts + 1;
          item.attempts = attempts;
          item.lastError = error instanceof Error ? error.message : String(error);
          item.nextAttemptAt = now + Math.min(15 * 60_000, 1_000 * 2 ** Math.min(attempts, 10));
          await this.#persist();
        }
      }
    } finally {
      this.#draining = false;
    }
  }

  async #persist(): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true });
    const temporaryPath = `${this.#path}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({ version: 1, items: this.#items } satisfies PullOutboxFile), "utf8");
    await rename(temporaryPath, this.#path);
  }
}
