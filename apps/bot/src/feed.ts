import type { BossFightSummary } from "@swtor/analytics";
import { io, type Socket } from "socket.io-client";

export interface FeedEvent {
  guildId: string;
  reportCode: string;
  fightId: number;
  bossFight: BossFightSummary;
}

export interface FeedClientOptions {
  apiUrl: string;
  token: string;
  onPull: (event: FeedEvent) => void;
  onState?: (state: "connected" | "disconnected" | "error", detail?: string) => void;
}

/** Subscribes to completed pulls published by the API. */
export class FeedClient {
  readonly #options: FeedClientOptions;
  #socket: Socket | null = null;

  constructor(options: FeedClientOptions) {
    this.#options = options;
  }

  connect(): void {
    const socket = io(`${this.#options.apiUrl}/feed`, {
      transports: ["websocket"],
      auth: { token: this.#options.token },
      reconnection: true,
      reconnectionDelayMax: 30_000,
    });

    socket.on("connect", () => this.#options.onState?.("connected"));
    socket.on("disconnect", () => this.#options.onState?.("disconnected"));
    socket.on("connect_error", (error: Error) => this.#options.onState?.("error", error.message));
    socket.on("pull:complete", (event: FeedEvent) => this.#options.onPull(event));

    this.#socket = socket;
  }

  disconnect(): void {
    this.#socket?.close();
    this.#socket = null;
  }
}
