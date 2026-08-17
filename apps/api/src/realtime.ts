import { timingSafeEqual } from "node:crypto";
import {
  MAX_EVENTS_PER_BATCH,
  ingestBatchSchema,
  ingestHelloSchema,
  type MeterSnapshot,
} from "@swtor/shared";
import type { Server, Socket } from "socket.io";
import type { AccountStore } from "./accountStore.js";
import type { ApiConfig } from "./config.js";
import { IngestSession, type SessionManager } from "./session.js";
import type { ReportStore } from "./store.js";

/** Compares in constant time so a token cannot be recovered by timing. */
function tokensMatch(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Token bucket over inbound batches.
 *
 * A steady client sends one batch a second, but a client returning from a
 * dropped connection flushes its offline queue all at once. A fixed window
 * would reject that legitimate backlog, so the burst capacity is sized to
 * absorb it while the refill rate still caps sustained throughput. The
 * per-batch event ceiling bounds how much a full burst can cost.
 */
class TokenBucket {
  #tokens: number;
  #lastRefill = Date.now();

  constructor(
    private readonly ratePerSecond: number,
    private readonly capacity: number,
  ) {
    this.#tokens = capacity;
  }

  allow(now: number): boolean {
    this.#tokens = Math.min(
      this.capacity,
      this.#tokens + ((now - this.#lastRefill) / 1000) * this.ratePerSecond,
    );
    this.#lastRefill = now;

    if (this.#tokens < 1) return false;
    this.#tokens -= 1;
    return true;
  }
}

export interface RealtimeDeps {
  io: Server;
  config: ApiConfig;
  sessions: SessionManager;
  store: ReportStore;
  accounts: AccountStore;
  log: { info: (o: unknown, m?: string) => void; warn: (o: unknown, m?: string) => void };
}

export interface RealtimeHandle {
  stop: () => void;
}

export function registerRealtime(deps: RealtimeDeps): RealtimeHandle {
  const { io, config, sessions, store, accounts, log } = deps;

  const ingest = io.of("/ingest");
  const live = io.of("/live");
  // Service-to-service: the Discord bot listens here for completed pulls.
  const feed = io.of("/feed");

  feed.use((socket, next) => {
    if (!tokensMatch(socket.handshake.auth?.token, config.feedToken)) {
      next(new Error("unauthorised"));
      return;
    }
    next();
  });

  ingest.use((socket, next) => {
    const provided = socket.handshake.auth?.token;
    if (tokensMatch(provided, config.ingestToken)) {
      // Shared token: unattributed, kept for local runs and replay.
      socket.data.ownerUserId = null;
      next();
      return;
    }

    if (typeof provided !== "string" || provided.length === 0) {
      next(new Error("unauthorised"));
      return;
    }

    void accounts
      .findUserByToken(provided)
      .then((user) => {
        if (user === null) {
          next(new Error("unauthorised"));
          return;
        }
        socket.data.ownerUserId = user.discordId;
        next();
      })
      .catch(() => next(new Error("unauthorised")));
  });

  ingest.on("connection", (socket: Socket) => {
    const limiter = new TokenBucket(config.ingestBatchRate, config.ingestBatchBurst);
    let session: IngestSession | null = null;

    socket.on("hello", async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = ingestHelloSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: "invalid hello" });
        socket.disconnect(true);
        return;
      }

      try {
        // A reconnecting client keeps its session id, so resume rather than
        // opening a second report halfway through a raid night.
        const existing = sessions.get(parsed.data.sessionId);
        if (existing !== undefined) {
          session = existing;
          await socket.join(parsed.data.sessionId);
          ack?.({ ok: true, reportCode: existing.reportCode, resumed: true });
          log.info({ sessionId: existing.sessionId }, "ingest session resumed");
          return;
        }

        const report = await store.createReport({
          guildId: config.defaultGuildId,
          ownerUserId: (socket.data.ownerUserId as string | null) ?? null,
          logFileName: parsed.data.logFileName,
          startedAt: new Date(parsed.data.logStartedAt),
        });

        session = new IngestSession({
          sessionId: parsed.data.sessionId,
          guildId: config.defaultGuildId,
          reportCode: report.code,
          logFileName: parsed.data.logFileName,
          ownerUserId: (socket.data.ownerUserId as string | null) ?? null,
          idleTimeoutMs: config.pullIdleTimeoutMs,
          exitGraceMs: config.pullExitGraceMs,
          onPullEnd: (pull, events) => {
            void store
              .appendFight(report.code, config.defaultGuildId, pull, events)
              .then((fightId) => {
                live.to(parsed.data.sessionId).emit("pull:complete", {
                  reportCode: report.code,
                  fightId,
                  encounter: pull.encounter,
                  outcome: pull.outcome,
                  durationMs: pull.durationMs,
                });
                feed.emit("pull:complete", {
                  guildId: config.defaultGuildId,
                  reportCode: report.code,
                  fightId,
                  pull,
                });
              })
              .catch((error: unknown) => log.warn({ error }, "failed to persist fight"));
          },
        });

        sessions.add(session);
        await socket.join(parsed.data.sessionId);
        ack?.({ ok: true, reportCode: report.code });
        log.info({ sessionId: session.sessionId, reportCode: report.code }, "ingest session open");
      } catch (error: unknown) {
        log.warn({ error }, "failed to open ingest session");
        ack?.({ ok: false, error: "session rejected" });
        socket.disconnect(true);
      }
    });

    socket.on("batch", (payload: unknown, ack?: (result: unknown) => void) => {
      if (session === null) {
        ack?.({ ok: false, error: "hello required" });
        return;
      }
      if (!limiter.allow(Date.now())) {
        ack?.({ ok: false, error: "rate limited" });
        return;
      }

      const parsed = ingestBatchSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: "invalid batch" });
        return;
      }
      if (parsed.data.sessionId !== session.sessionId) {
        ack?.({ ok: false, error: "session mismatch" });
        return;
      }

      session.push(parsed.data.events);
      ack?.({ ok: true, sequence: parsed.data.sequence });
    });

    socket.on("disconnect", () => {
      // Deliberately not removed: a dropped connection is usually temporary and
      // the client will resume with the same id. The idle reaper closes the
      // session, and its final pull, if it never comes back.
    });
  });

  live.on("connection", (socket: Socket) => {
    socket.on("subscribe", async (payload: unknown, ack?: (result: unknown) => void) => {
      const sessionId = typeof payload === "string" ? payload : null;
      if (sessionId === null || sessionId.length > 64) {
        ack?.({ ok: false });
        return;
      }
      await socket.join(sessionId);
      ack?.({ ok: true });
    });
  });

  const timer = setInterval(() => {
    const now = Date.now();
    for (const snapshot of sessions.tick(now)) {
      live.to(snapshot.sessionId).emit("snapshot", snapshot satisfies MeterSnapshot);
    }
    for (const id of sessions.reapIdle(now)) log.info({ sessionId: id }, "reaped idle session");
  }, config.snapshotIntervalMs);
  timer.unref();

  return { stop: () => clearInterval(timer) };
}

export { MAX_EVENTS_PER_BATCH };
