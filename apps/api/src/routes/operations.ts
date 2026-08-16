import type { OperationEventDocument } from "@swtor/db";
import {
  defaultLimits,
  describeOpenSlots,
  summariseRoster,
  type GroupSize,
  type Signup,
} from "@swtor/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AccountStore } from "../accountStore.js";
import type { ApiConfig } from "../config.js";
import type { OperationPatch, OperationStore } from "../operationStore.js";
import { currentDiscordId } from "./auth.js";

export interface OperationRouteDeps {
  config: ApiConfig;
  accounts: AccountStore;
  operations: OperationStore;
}

const groupSize = z.union([z.literal(4), z.literal(8), z.literal(16)]);
const difficulty = z.enum(["Story", "Veteran", "Master"]);
const limits = z.object({
  tanks: z.number().int().min(0).max(8),
  healers: z.number().int().min(0).max(8),
  dps: z.number().int().min(0).max(16),
});

const createBody = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1_000).nullable().default(null),
  scheduledFor: z.coerce.date(),
  difficulty: difficulty.nullable().default(null),
  groupSize: groupSize.nullable().default(8),
  encounterId: z.string().max(64).nullable().default(null),
  operationId: z.string().max(16).nullable().default(null),
  limits: limits.optional(),
});

const signupBody = z.object({
  status: z.enum(["tank", "healer", "dps", "bench", "declined"]),
  characterName: z.string().max(64).nullable().default(null),
});

const codeParams = z.object({ code: z.string().min(4).max(32) });

/** Adds the computed roster so clients never re-implement slot maths. */
function present(event: OperationEventDocument) {
  const summary = summariseRoster(event.signups, event.limits);
  return {
    code: event.code,
    title: event.title,
    description: event.description,
    scheduledFor: event.scheduledFor,
    difficulty: event.difficulty,
    groupSize: event.groupSize,
    encounterId: event.encounterId,
    operationId: event.operationId,
    limits: event.limits,
    cancelledAt: event.cancelledAt,
    discordMessageId: event.discordMessageId,
    signups: event.signups,
    roster: summary,
    status: describeOpenSlots(summary),
  };
}

export function registerOperationRoutes(app: FastifyInstance, deps: OperationRouteDeps): void {
  const { config, accounts, operations } = deps;

  async function requireModerator(request: FastifyRequest, reply: FastifyReply) {
    const discordId = currentDiscordId(request);
    const user = discordId === null ? null : await accounts.findUserByDiscordId(discordId);

    if (user === null) {
      await reply.code(401).send({ error: "not signed in" });
      return null;
    }
    // Scheduling is a moderator action; members sign up but do not create.
    if (!user.isModerator) {
      await reply.code(403).send({ error: "moderators only" });
      return null;
    }
    return user;
  }

  app.get("/api/operations", async () => {
    const events = await operations.upcoming(config.defaultGuildId);
    return events.map(present);
  });

  app.get("/api/operations/:code", async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    const event = await operations.find(config.defaultGuildId, code);
    if (event === null) return reply.code(404).send({ error: "operation not found" });
    return present(event);
  });

  app.post("/api/operations", async (request, reply) => {
    const user = await requireModerator(request, reply);
    if (user === null) return reply;

    const body = createBody.parse(request.body);
    if (body.scheduledFor.getTime() < Date.now() - 60_000) {
      return reply.code(400).send({ error: "that time is in the past" });
    }

    const event = await operations.create({
      guildId: config.defaultGuildId,
      title: body.title,
      description: body.description,
      encounterId: body.encounterId,
      operationId: body.operationId,
      difficulty: body.difficulty,
      groupSize: body.groupSize,
      limits: body.limits ?? defaultLimits(body.groupSize as GroupSize | null),
      scheduledFor: body.scheduledFor,
      createdByUserId: user.discordId,
      discordChannelId: null,
      discordMessageId: null,
    });

    return reply.code(201).send(present(event));
  });

  app.patch("/api/operations/:code", async (request, reply) => {
    const user = await requireModerator(request, reply);
    if (user === null) return reply;

    const { code } = codeParams.parse(request.params);
    const body = createBody.partial().parse(request.body);

    // Undefined keys are dropped so a partial update never clears a field.
    const patch: OperationPatch = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined),
    );
    if (body.groupSize !== undefined && body.limits === undefined) {
      patch.limits = defaultLimits(body.groupSize as GroupSize | null);
    }

    const event = await operations.update(config.defaultGuildId, code, patch);
    if (event === null) return reply.code(404).send({ error: "operation not found" });
    return present(event);
  });

  app.delete("/api/operations/:code", async (request, reply) => {
    const user = await requireModerator(request, reply);
    if (user === null) return reply;

    const { code } = codeParams.parse(request.params);
    // Cancelled rather than deleted so the Discord message can be updated.
    const event = await operations.update(config.defaultGuildId, code, {
      cancelledAt: new Date(),
    });
    if (event === null) return reply.code(404).send({ error: "operation not found" });
    return { ok: true };
  });

  app.post("/api/operations/:code/signup", async (request, reply) => {
    const discordId = currentDiscordId(request);
    const user = discordId === null ? null : await accounts.findUserByDiscordId(discordId);
    if (user === null) return reply.code(401).send({ error: "not signed in" });

    const { code } = codeParams.parse(request.params);
    const body = signupBody.parse(request.body);

    const event = await operations.find(config.defaultGuildId, code);
    if (event === null) return reply.code(404).send({ error: "operation not found" });
    if (event.cancelledAt !== null) {
      return reply.code(409).send({ error: "that operation was cancelled" });
    }

    const signup: Signup = {
      discordUserId: user.discordId,
      displayName: user.globalName ?? user.username,
      characterName: body.characterName ?? user.characters[0]?.name ?? null,
      status: body.status,
      respondedAt: Date.now(),
    };

    const updated = await operations.signup(code, signup);
    return updated === null
      ? reply.code(404).send({ error: "operation not found" })
      : present(updated);
  });

  /** Called by the bot after a button press, authorised by the service token. */
  app.post("/api/bot/operations/:code/signup", async (request, reply) => {
    const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    if (provided !== config.feedToken) return reply.code(401).send({ error: "unauthorised" });

    const { code } = codeParams.parse(request.params);
    const body = signupBody
      .extend({
        discordUserId: z.string().min(1).max(32),
        displayName: z.string().min(1).max(64),
      })
      .parse(request.body);

    const event = await operations.find(config.defaultGuildId, code);
    if (event === null) return reply.code(404).send({ error: "operation not found" });
    if (event.cancelledAt !== null) {
      return reply.code(409).send({ error: "that operation was cancelled" });
    }

    const user = await accounts.findUserByDiscordId(body.discordUserId);
    const updated = await operations.signup(code, {
      discordUserId: body.discordUserId,
      displayName: body.displayName,
      characterName: body.characterName ?? user?.characters[0]?.name ?? null,
      status: body.status,
      respondedAt: Date.now(),
    });

    return updated === null
      ? reply.code(404).send({ error: "operation not found" })
      : present(updated);
  });

  app.post("/api/bot/operations/:code/message", async (request, reply) => {
    const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    if (provided !== config.feedToken) return reply.code(401).send({ error: "unauthorised" });

    const { code } = codeParams.parse(request.params);
    const body = z
      .object({ channelId: z.string().min(1).max(32), messageId: z.string().min(1).max(32) })
      .parse(request.body);

    await operations.linkDiscordMessage(code, body.channelId, body.messageId);
    return { ok: true };
  });
}
