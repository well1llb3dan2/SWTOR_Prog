import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { buildFightDeathAudits, DEFAULT_AUDIT_WINDOW_MS } from "@swtor/analytics";
import { ENCOUNTERS, OPERATIONS } from "@swtor/game-data";
import Fastify, { type FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { z } from "zod";
import type { ApiConfig } from "./config.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerOperationRoutes } from "./routes/operations.js";
import type { Fetcher } from "./auth/discord.js";
import type { AccountStore } from "./accountStore.js";
import type { OperationStore } from "./operationStore.js";
import { registerRealtime, type RealtimeHandle } from "./realtime.js";
import { SessionManager } from "./session.js";
import type { ReportStore } from "./store.js";

const codeParams = z.object({ code: z.string().min(4).max(32) });
const fightParams = codeParams.extend({ fightId: z.coerce.number().int().positive() });
const listQuery = z.object({ limit: z.coerce.number().int().positive().max(200).default(50) });
const auditQuery = z.object({
  windowMs: z.coerce.number().int().positive().max(120_000).default(DEFAULT_AUDIT_WINDOW_MS),
});

export interface BuildServerOptions {
  config: ApiConfig;
  store: ReportStore;
  accounts: AccountStore;
  operations: OperationStore;
  /** Skip Socket.IO when only the HTTP surface is under test. */
  realtime?: boolean;
  /** Injected so the Discord exchange can be tested without the network. */
  fetchImpl?: Fetcher;
}

export interface BuiltServer {
  app: FastifyInstance;
  sessions: SessionManager;
  io: Server | null;
  close: () => Promise<void>;
}

export async function buildServer(options: BuildServerOptions): Promise<BuiltServer> {
  const { config, store } = options;
  const app = Fastify({
    logger: { level: config.logLevel },
    // Bounded so a single request cannot exhaust memory before validation runs.
    bodyLimit: 1_048_576,
  });

  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  // This API serves JSON only, so the CSP can be maximally restrictive.
  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "same-site" },
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  // Falls back to the ingest token so cookies are still signed in development.
  await app.register(cookie, { secret: config.sessionSecret ?? config.ingestToken });
  const sessions = new SessionManager({ maxSessions: config.maxSessions });
  await registerAuthRoutes(app, {
    config,
    accounts: options.accounts,
    sessions,
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
  });
  registerOperationRoutes(app, {
    config,
    accounts: options.accounts,
    operations: options.operations,
  });

  app.get("/health", async () => ({
    status: "ok",
    sessions: sessions.size,
    uptimeSeconds: Math.round(process.uptime()),
  }));

  app.get("/api/encounters", async () => ({
    operations: OPERATIONS,
    encounters: ENCOUNTERS,
  }));

  app.get("/api/reports", async (request) => {
    const { limit } = listQuery.parse(request.query);
    const reports = await store.listReports(config.defaultGuildId, limit);
    // The fight array can be large; the list view only needs headline numbers.
    return reports.map((report) => ({
      code: report.code,
      logFileName: report.logFileName,
      startedAt: report.startedAt,
      endedAt: report.endedAt,
      zone: report.zone,
      difficulty: report.difficulty,
      groupSize: report.groupSize,
      fightCount: report.fights.length,
      killCount: report.fights.filter((f) => f.outcome === "kill").length,
    }));
  });

  app.get("/api/reports/:code", async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    const report = await store.getReport(config.defaultGuildId, code);
    if (report === null) return reply.code(404).send({ error: "report not found" });
    return report;
  });

  app.get("/api/reports/:code/fights/:fightId/events", async (request, reply) => {
    const { code, fightId } = fightParams.parse(request.params);
    const events = await store.getFightEvents(config.defaultGuildId, code, fightId);
    if (events === null) {
      return reply.code(404).send({ error: "events unavailable or expired" });
    }
    return { code, fightId, eventCount: events.length, events };
  });

  app.get("/api/progression", async () => store.progression(config.defaultGuildId));
  app.get("/api/reports/:code/fights/:fightId/deaths", async (request, reply) => {
    const { code, fightId } = fightParams.parse(request.params);
    const { windowMs } = auditQuery.parse(request.query);

    const events = await store.getFightEvents(config.defaultGuildId, code, fightId);
    if (events === null) {
      return reply.code(404).send({ error: "events unavailable or expired" });
    }
    return { code, fightId, windowMs, deaths: buildFightDeathAudits(events, windowMs) };
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: "invalid request" });
    }
    app.log.error({ err: error }, "unhandled error");
    // Never surface internal messages to clients.
    return reply.code(500).send({ error: "internal error" });
  });

  let io: Server | null = null;
  let realtime: RealtimeHandle | null = null;

  if (options.realtime !== false) {
    await app.ready();
    io = new Server(app.server, {
      cors: { origin: config.corsOrigins, credentials: true },
      maxHttpBufferSize: 2_000_000,
    });
    realtime = registerRealtime({
      io,
      config,
      sessions,
      store,
      accounts: options.accounts,
      log: app.log,
    });
  }

  return {
    app,
    sessions,
    io,
    close: async () => {
      realtime?.stop();
      sessions.clear();
      if (io !== null) await io.close();
      await app.close();
      await store.close();
    },
  };
}
