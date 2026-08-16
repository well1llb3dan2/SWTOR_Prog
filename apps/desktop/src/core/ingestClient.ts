import { randomUUID } from "node:crypto";
import type { CombatEvent } from "@swtor/shared";
import { io, type Socket } from "socket.io-client";
import { OfflineQueue } from "./offlineQueue.js";

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export interface IngestClientOptions {
  serverUrl: string;
  token: string;
  clientVersion: string;
  maxQueuedEvents?: number;
  onState?: (state: ConnectionState, detail?: string) => void;
  onReport?: (reportCode: string) => void;
}

interface Ack {
  ok: boolean;
  error?: string;
  reportCode?: string;
}

/**
 * Streams batches to the API.
 *
 * Everything is queued rather than sent directly so a dropped connection is
 * invisible to the caller; the queue drains in order once the handshake has
 * been re-established. Batches are only removed after the server acknowledges
 * them, so a disconnect mid-flight resends rather than loses the batch.
 */
export class IngestClient {
  readonly #options: IngestClientOptions;
  readonly #queue: OfflineQueue;

  #socket: Socket | null = null;
  #sessionId = randomUUID();
  #logFileName = "";
  #logStartedAt = Date.now();
  #sequence = 0;
  #ready = false;
  #draining = false;

  constructor(options: IngestClientOptions) {
    this.#options = options;
    this.#queue = new OfflineQueue(options.maxQueuedEvents);
  }

  get sessionId(): string {
    return this.#sessionId;
  }

  get queuedEvents(): number {
    return this.#queue.eventCount;
  }

  get droppedEvents(): number {
    return this.#queue.droppedEvents;
  }

  get connected(): boolean {
    return this.#ready;
  }

  connect(logFileName: string, logStartedAt: number): void {
    this.#logFileName = logFileName;
    this.#logStartedAt = logStartedAt;
    this.#options.onState?.("connecting");

    this.#socket = io(`${this.#options.serverUrl}/ingest`, {
      transports: ["websocket"],
      auth: { token: this.#options.token },
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    });

    this.#socket.on("connect", () => void this.#handshake());
    this.#socket.on("disconnect", () => {
      this.#ready = false;
      this.#options.onState?.("reconnecting");
    });
    this.#socket.on("connect_error", (error: Error) => {
      this.#ready = false;
      this.#options.onState?.("error", error.message);
    });
  }

  /** Starts a fresh server-side session; used when the game rotates its log. */
  restartSession(logFileName: string, logStartedAt: number): void {
    this.#sessionId = randomUUID();
    this.#logFileName = logFileName;
    this.#logStartedAt = logStartedAt;
    this.#sequence = 0;
    this.#queue.clear();
    this.#ready = false;
    if (this.#socket !== null) void this.#handshake();
  }

  send(events: CombatEvent[]): void {
    if (events.length === 0) return;
    this.#queue.push({ sequence: this.#sequence++, events });
    void this.#drain();
  }

  disconnect(): void {
    this.#socket?.close();
    this.#socket = null;
    this.#ready = false;
    this.#options.onState?.("idle");
  }

  async #handshake(): Promise<void> {
    const socket = this.#socket;
    if (socket === null) return;

    const ack = await this.#emit(socket, "hello", {
      clientVersion: this.#options.clientVersion,
      sessionId: this.#sessionId,
      logFileName: this.#logFileName,
      logStartedAt: this.#logStartedAt,
    });

    if (!ack.ok) {
      this.#options.onState?.("error", ack.error ?? "handshake rejected");
      return;
    }

    this.#ready = true;
    this.#options.onState?.("connected");
    if (ack.reportCode !== undefined) this.#options.onReport?.(ack.reportCode);
    void this.#drain();
  }

  async #drain(): Promise<void> {
    if (this.#draining || !this.#ready || this.#socket === null) return;
    this.#draining = true;

    try {
      while (this.#ready && this.#queue.size > 0) {
        const batch = this.#queue.peek()!;
        const ack = await this.#emit(this.#socket, "batch", {
          sessionId: this.#sessionId,
          sequence: batch.sequence,
          events: batch.events,
        });

        if (ack.ok) {
          this.#queue.shift();
          continue;
        }
        if (ack.error === "rate limited") {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }
        // Anything else means the server will never accept this batch;
        // dropping it stops one bad payload blocking the whole queue.
        this.#queue.shift();
        this.#options.onState?.("error", ack.error ?? "batch rejected");
      }
    } finally {
      this.#draining = false;
    }
  }

  #emit(socket: Socket, event: string, payload: unknown): Promise<Ack> {
    return new Promise((resolve) => {
      let settled = false;
      const done = (ack: Ack) => {
        if (settled) return;
        settled = true;
        resolve(ack);
      };
      // A lost connection never acks, so time out rather than stall the queue.
      const timer = setTimeout(() => done({ ok: false, error: "timeout" }), 15_000);
      socket.emit(event, payload, (ack: Ack) => {
        clearTimeout(timer);
        done(ack ?? { ok: false, error: "no ack" });
      });
    });
  }
}
