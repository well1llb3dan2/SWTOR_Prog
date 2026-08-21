import { z } from "zod";

/**
 * Wire schemas for the desktop -> API -> browser pipeline.
 *
 * These are the system's trust boundary: everything crossing a socket is
 * validated here before it reaches the analytics engine.
 */

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  facing: z.number(),
});

const actorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("player"),
    name: z.string().max(64),
    playerId: z.string().max(32),
    position: positionSchema.nullable(),
    hp: z.number().nullable(),
    maxHp: z.number().nullable(),
  }),
  z.object({
    kind: z.literal("npc"),
    name: z.string().max(128),
    npcId: z.string().max(32),
    instanceId: z.string().max(32).nullable(),
    position: positionSchema.nullable(),
    hp: z.number().nullable(),
    maxHp: z.number().nullable(),
  }),
]);

const namedEntitySchema = z.object({
  name: z.string().max(128),
  id: z.string().max(32),
});

const magnitudeSchema = z.object({
  kind: z.literal("magnitude"),
  amount: z.number(),
  effective: z.number().nullable(),
  critical: z.boolean(),
  damageType: z.enum(["kinetic", "energy", "internal", "elemental"]).nullable(),
  mitigation: z
    .enum(["miss", "dodge", "parry", "deflect", "immune", "resist", "shield", "unknown"])
    .nullable(),
  absorbed: z.number().nullable(),
  reflected: z.boolean(),
});

const chargesSchema = z.object({ kind: z.literal("charges"), charges: z.number() });
const valueSchema = z.discriminatedUnion("kind", [magnitudeSchema, chargesSchema]);

const contextShape = {
  timestamp: z.number().int().nonnegative(),
  lineNumber: z.number().int().nonnegative(),
  source: actorSchema.nullable(),
  target: actorSchema.nullable(),
  ability: namedEntitySchema.nullable(),
  threat: z.number().nullable(),
};

const event = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ type: z.literal(type), ...contextShape, ...shape });

export const combatEventSchema = z.discriminatedUnion("type", [
  event("damage", { value: magnitudeSchema }),
  event("heal", { value: magnitudeSchema }),
  event("applyEffect", { effect: namedEntitySchema, value: valueSchema.nullable() }),
  event("removeEffect", { effect: namedEntitySchema }),
  event("modifyCharges", { effect: namedEntitySchema, charges: z.number().nullable() }),
  event("resource", {
    direction: z.enum(["spend", "restore"]),
    resource: namedEntitySchema,
    amount: z.number(),
  }),
  event("ability", { phase: z.enum(["activate", "deactivate", "cancel", "interrupt"]) }),
  event("combatState", { state: z.enum(["enter", "exit"]) }),
  event("death", { revived: z.literal(false) }),
  event("revived", { revived: z.literal(true) }),
  event("target", { state: z.enum(["set", "cleared"]) }),
  event("taunt", {}),
  event("threat", {}),
  event("fallingDamage", { amount: z.number() }),
  event("areaEntered", {
    zone: namedEntitySchema,
    serverId: z.string().max(32).nullable(),
    groupSize: z.union([z.literal(4), z.literal(8), z.literal(16)]).nullable(),
    difficulty: z.enum(["Story", "Veteran", "Master"]).nullable(),
    logVersion: z.string().max(32).nullable(),
  }),
  event("disciplineChanged", {
    advancedClass: namedEntitySchema,
    discipline: namedEntitySchema,
    role: z.enum(["tank", "healer", "dps"]).nullable(),
  }),
  event("other", {
    category: namedEntitySchema,
    effect: namedEntitySchema.nullable(),
    value: valueSchema.nullable(),
  }),
  event("unknown", { raw: z.string().max(4096), reason: z.string().max(256) }),
]);

/** Opening frame a desktop client sends when it connects to `/ingest`. */
export const ingestHelloSchema = z.object({
  clientVersion: z.string().max(32),
  sessionId: z.string().uuid(),
  logFileName: z.string().max(256),
  /** Epoch ms of the log file's first line, derived from its filename. */
  logStartedAt: z.number().int().nonnegative(),
});

/** Bounded so a malformed or hostile client cannot exhaust server memory. */
export const MAX_EVENTS_PER_BATCH = 500;

export const ingestBatchSchema = z.object({
  sessionId: z.string().uuid(),
  /** Monotonic per session; lets the server detect gaps after a reconnect. */
  sequence: z.number().int().nonnegative(),
  events: z.array(combatEventSchema).max(MAX_EVENTS_PER_BATCH),
});

export const actorMetricsSchema = z.object({
  actorId: z.string(),
  name: z.string(),
  role: z.enum(["tank", "healer", "dps"]).nullable(),
  discipline: z.string().nullable(),
  dps: z.number(),
  hps: z.number(),
  dtps: z.number(),
  totalDamage: z.number(),
  totalHealing: z.number(),
  totalDamageTaken: z.number(),
  overhealPercent: z.number(),
  deaths: z.number(),
});

const difficultySchema = z.enum(["Story", "Veteran", "Master"]).nullable();
const groupSizeSchema = z.union([z.literal(4), z.literal(8), z.literal(16)]).nullable();

/**
 * Encounter identification travelling alongside the combat data.
 *
 * This is what drives progression: `cleared` reflects the encounter's own
 * victory condition, which for multi-boss fights is not satisfied by killing
 * the largest target.
 */
export const encounterRefSchema = z.object({
  encounterId: z.string().max(64),
  encounterName: z.string().max(128),
  operationId: z.string().max(16),
  operationName: z.string().max(128),
  isLair: z.boolean(),
  matchedBosses: z.array(z.string().max(128)).max(16),
  phases: z
    .array(
      z.object({
        order: z.number().int().positive(),
        name: z.string().max(128),
        style: z.string().max(64),
        trigger: z.string().max(256),
      }),
    )
    .max(16),
  victoryEvent: z.string().max(256),
  cleared: z.boolean(),
  catalogSource: z.string().max(64).optional(),
  catalogVersion: z.string().max(128).optional(),
});

export const bossInfoSchema = z.object({
  npcId: z.string().max(32),
  name: z.string().max(128),
  maxHp: z.number(),
  hp: z.number().nullable(),
  hpPercent: z.number().nullable(),
  isLikelyBoss: z.boolean(),
});

export const meterSnapshotSchema = z.object({
  sessionId: z.string().uuid(),
  pullId: z.string(),
  zone: z.string().nullable(),
  difficulty: difficultySchema,
  groupSize: groupSizeSchema,
  boss: bossInfoSchema.nullable(),
  encounter: encounterRefSchema.nullable(),
  inCombat: z.boolean(),
  elapsedMs: z.number().int().nonnegative(),
  actors: z.array(actorMetricsSchema),
  bossFight: z.object({
    id: z.string().max(128),
    index: z.number().int().positive(),
    startedAt: z.number().int().nonnegative(),
    elapsedMs: z.number().int().nonnegative(),
    zone: z.string().nullable(),
    difficulty: difficultySchema,
    groupSize: groupSizeSchema,
    encounter: encounterRefSchema,
    bossEntities: z.array(z.object({
      instanceId: z.string(), npcId: z.string(), name: z.string(), rawName: z.string().optional(), identitySource: z.enum(["catalog", "log"]).optional(), role: z.enum(["boss", "mechanic", "unknown"]),
      firstSeenAt: z.number(), engagedAt: z.number().nullable(), lastSeenAt: z.number(), diedAt: z.number().nullable(),
      maxHp: z.number().nullable(), finalHp: z.number().nullable(), damageTaken: z.number(), damageDealt: z.number(),
      absorbed: z.number().optional(), criticalHits: z.number().optional(), criticalDamage: z.number().optional(),
      mitigatedDamage: z.number().optional(), overkill: z.number().optional(), threat: z.number().optional(),
      damageByType: z.record(z.number()).optional(), mitigationByType: z.record(z.number()).optional(), deaths: z.number(), phases: z.array(z.number()),
    }).passthrough()).max(512),
    mechanicEntities: z.array(z.any()).max(512),
    unknownEntities: z.array(z.any()).max(512),
    phases: z.array(z.object({
      order: z.number(), name: z.string(), style: z.string(), trigger: z.string(), startedAt: z.number(), endedAt: z.number().nullable(),
      triggerEvidence: z.any().nullable(), enemies: z.array(z.any()), players: z.array(z.any()),
    }).passthrough()).max(32),
    players: z.array(z.any()).max(64),
    catalogSource: z.string().max(64).optional(),
    catalogVersion: z.string().max(128).optional(),
  }).strict().nullable(),
});

export type IngestHello = z.infer<typeof ingestHelloSchema>;
export type IngestBatch = z.infer<typeof ingestBatchSchema>;
export type ActorMetrics = z.infer<typeof actorMetricsSchema>;
export type EncounterRefPayload = z.infer<typeof encounterRefSchema>;
export type MeterSnapshot = z.infer<typeof meterSnapshotSchema>;
