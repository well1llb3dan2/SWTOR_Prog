import type { BossFightSummary } from "@swtor/analytics";
import type { CombatEvent, Signup } from "@swtor/shared";
import { MongoClient, type Collection, type Db } from "mongodb";
import type { BucketOptions } from "./buckets.js";
import { generateReportCode } from "./codes.js";
import { ensureIndexes } from "./indexes.js";
import { summariseProgression, toBossFightDocument, type ProgressionEntry } from "./reports.js";
import { COLLECTIONS, type OperationEventDocument, type ReportDocument } from "./schema.js";
import { hashToken, issueToken, generateLinkCode, type IssuedToken } from "./tokens.js";
import {
  USER_COLLECTIONS,
  type ApiTokenRecord,
  type LinkCodeDocument,
  type LinkedCharacter,
  type UserDocument,
} from "./users.js";

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  /**
   * Days to keep raw combat events. Computed summaries are never expired, so a
   * retention window trades the death-log timeline for storage, not history.
   */
  retentionDays?: number | null;
  bucketOptions?: BucketOptions;
}

export interface CreateReportInput {
  guildId: string;
  ownerUserId: string | null;
  logFileName: string;
  startedAt: Date;
}

export class SwtorDatabase {
  readonly #client: MongoClient;
  readonly #db: Db;
  readonly #retentionDays: number | null;
  readonly #bucketOptions: BucketOptions;

  private constructor(client: MongoClient, config: DatabaseConfig) {
    this.#client = client;
    this.#db = client.db(config.dbName);
    this.#retentionDays = config.retentionDays ?? null;
    this.#bucketOptions = {
      ...config.bucketOptions,
      retentionDays: config.retentionDays ?? null,
    };
  }

  static async connect(config: DatabaseConfig): Promise<SwtorDatabase> {
    const client = await new MongoClient(config.uri).connect();
    const database = new SwtorDatabase(client, config);
    await ensureIndexes(database.#db, database.#retentionDays);
    return database;
  }

  async close(): Promise<void> {
    await this.#client.close();
  }

  get reports(): Collection<ReportDocument> {
    return this.#db.collection<ReportDocument>(COLLECTIONS.reports);
  }

  get operations(): Collection<OperationEventDocument> {
    return this.#db.collection<OperationEventDocument>(COLLECTIONS.operationEvents);
  }

  get users(): Collection<UserDocument> {
    return this.#db.collection<UserDocument>(USER_COLLECTIONS.users);
  }

  get linkCodes(): Collection<LinkCodeDocument> {
    return this.#db.collection<LinkCodeDocument>(USER_COLLECTIONS.linkCodes);
  }

  /** Creates or refreshes a user from a Discord login. */
  async upsertUser(input: {
    guildId: string;
    discordId: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
    roles: string[];
    isMember: boolean;
    isModerator: boolean;
  }): Promise<UserDocument> {
    const now = new Date();
    const result = await this.users.findOneAndUpdate(
      { discordId: input.discordId },
      {
        $set: {
          guildId: input.guildId,
          username: input.username,
          globalName: input.globalName,
          avatar: input.avatar,
          roles: input.roles,
          isMember: input.isMember,
          isModerator: input.isModerator,
          updatedAt: now,
          lastLoginAt: now,
        },
        // Characters and tokens belong to the user, not to the login.
        $setOnInsert: {
          characters: [],
          tokens: [],
          signupPreferences: { preferredRole: null, notes: null, availabilityWindow: null },
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    return result!;
  }

  findUserByDiscordId(discordId: string): Promise<UserDocument | null> {
    return this.users.findOne({ discordId });
  }

  /** Resolves an ingest token to its owner and stamps last use. */
  async findUserByToken(token: string): Promise<UserDocument | null> {
    const hash = hashToken(token);
    const user = await this.users.findOne({ tokens: { $elemMatch: { hash, revokedAt: null } } });
    if (user === null) return null;

    await this.users.updateOne(
      { discordId: user.discordId, "tokens.hash": hash },
      { $set: { "tokens.$.lastUsedAt": new Date() } },
    );
    return user;
  }

  async issueUserToken(discordId: string, name: string): Promise<IssuedToken> {
    const issued = issueToken();
    const record: ApiTokenRecord = {
      id: issued.prefix,
      name,
      prefix: issued.prefix,
      hash: issued.hash,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
    };
    await this.users.updateOne(
      { discordId },
      { $push: { tokens: record }, $set: { updatedAt: new Date() } },
    );
    return issued;
  }

  async revokeUserToken(discordId: string, tokenId: string): Promise<void> {
    await this.users.updateOne(
      { discordId, "tokens.id": tokenId },
      { $set: { "tokens.$.revokedAt": new Date(), updatedAt: new Date() } },
    );
  }

  async linkCharacter(discordId: string, character: LinkedCharacter): Promise<void> {
    const serverId = character.serverId ?? null;
    await this.users.updateOne(
      {
        discordId,
        $nor: [{ characters: { $elemMatch: { playerId: character.playerId, serverId } } }],
      },
      { $push: { characters: character }, $set: { updatedAt: new Date() } },
    );
  }

  async unlinkCharacter(discordId: string, playerId: string, serverId?: string | null): Promise<void> {
    await this.users.updateOne(
      { discordId },
      {
        $pull: {
          characters: serverId === undefined ? { playerId } : { playerId, serverId: serverId ?? null },
        },
        $set: { updatedAt: new Date() },
      },
    );
  }

  async updatePreferences(discordId: string, preferences: Partial<UserDocument["signupPreferences"]>): Promise<UserDocument | null> {
    return this.users.findOneAndUpdate(
      { discordId },
      { $set: { signupPreferences: { preferredRole: null, notes: null, availabilityWindow: null, ...preferences }, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
  }

  /** True when any other user already owns the same SWTOR character on the same world. */
  async isCharacterClaimed(guildId: string, playerId: string, exceptDiscordId: string, serverId?: string | null) {
    const users = await this.users.find({
      guildId,
      discordId: { $ne: exceptDiscordId },
      "characters.playerId": playerId,
    }).toArray();

    return users.some((user) =>
      user.characters.some((character) => {
        if (character.playerId !== playerId) return false;
        if (serverId === undefined) return true;
        return (character.serverId ?? null) === (serverId ?? null);
      }),
    );
  }

  async createLinkCode(guildId: string, discordId: string, ttlMs = 10 * 60_000) {
    const code = generateLinkCode();
    const now = new Date();
    await this.linkCodes.insertOne({
      guildId,
      code,
      discordId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      consumedAt: null,
    });
    return code;
  }

  /** Single-use: the update only matches while the code is still unconsumed. */
  async consumeLinkCode(code: string): Promise<LinkCodeDocument | null> {
    return this.linkCodes.findOneAndUpdate(
      { code, consumedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { returnDocument: "after" },
    );
  }

  async createReport(input: CreateReportInput): Promise<ReportDocument> {
    const now = new Date();
    const report: ReportDocument = {
      guildId: input.guildId,
      code: generateReportCode(),
      ownerUserId: input.ownerUserId,
      logFileName: input.logFileName,
      startedAt: input.startedAt,
      endedAt: null,
      zone: null,
      zoneId: null,
      difficulty: null,
      groupSize: null,
      roster: [],
      fights: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.reports.insertOne(report);
    return report;
  }

  /** Appends a completed BossFightSummary and stores its raw events separately. */
  async appendFight(
    reportCode: string,
    guildId: string,
    fight: BossFightSummary,
    _events: readonly CombatEvent[],
  ): Promise<number> {
    const report = await this.reports.findOne({ code: reportCode, guildId });
    if (report === null) throw new Error(`Unknown report ${reportCode}`);

    const fightId = report.fights.length + 1;

    await this.reports.updateOne(
      { code: reportCode, guildId },
      {
        $push: { fights: toBossFightDocument(fight, fightId) },
        $set: {
          endedAt: new Date(fight.endedAt),
          zone: fight.zone,
          difficulty: fight.difficulty,
          groupSize: fight.groupSize,
          roster: fight.players.map((player) => ({
            playerId: player.actorId,
            serverId: null,
            name: player.name,
            advancedClass: player.combatStyle ?? null,
            discipline: player.discipline,
            role: player.role,
          })),
          updatedAt: new Date(),
        },
      },
    );

    return fightId;
  }

  getReport(guildId: string, code: string): Promise<ReportDocument | null> {
    return this.reports.findOne({ guildId, code });
  }

  listReports(guildId: string, limit = 50): Promise<ReportDocument[]> {
    return this.reports.find({ guildId }).sort({ startedAt: -1 }).limit(limit).toArray();
  }

  async getFightEvents(
    _guildId: string,
    _reportCode: string,
    _fightId: number,
  ): Promise<CombatEvent[] | null> {
    return null;
  }

  async progression(guildId: string): Promise<ProgressionEntry[]> {
    const reports = await this.reports.find({ guildId }).project({ fights: 1 }).toArray();
    return summariseProgression(reports.flatMap((r) => (r as ReportDocument).fights));
  }

  async createOperationEvent(
    input: Omit<
      OperationEventDocument,
      "code" | "signups" | "cancelledAt" | "createdAt" | "updatedAt"
    >,
  ): Promise<OperationEventDocument> {
    const now = new Date();
    const event: OperationEventDocument = {
      ...input,
      code: generateReportCode(8),
      signups: [],
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.operations.insertOne(event);
    return event;
  }

  findOperation(guildId: string, code: string): Promise<OperationEventDocument | null> {
    return this.operations.findOne({ guildId, code });
  }

  async updateOperation(
    guildId: string,
    code: string,
    patch: Partial<
      Pick<
        OperationEventDocument,
        | "title"
        | "description"
        | "scheduledFor"
        | "difficulty"
        | "groupSize"
        | "limits"
        | "encounterId"
        | "operationId"
        | "cancelledAt"
      >
    >,
  ): Promise<OperationEventDocument | null> {
    return this.operations.findOneAndUpdate(
      { guildId, code },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
  }

  async linkDiscordMessage(code: string, channelId: string, messageId: string): Promise<void> {
    await this.operations.updateOne(
      { code },
      { $set: { discordChannelId: channelId, discordMessageId: messageId, updatedAt: new Date() } },
    );
  }

  /**
   * Records or replaces a player's signup.
   *
   * Two statements because MongoDB cannot match-and-update an array element and
   * push a new one in a single operation; the positional update runs first so
   * the common case (changing your mind) is a single round trip.
   */
  async upsertSignup(code: string, signup: Signup): Promise<OperationEventDocument | null> {
    const updated = await this.operations.updateOne(
      { code, "signups.discordUserId": signup.discordUserId },
      { $set: { "signups.$": signup, updatedAt: new Date() } },
    );
    if (updated.matchedCount === 0) {
      await this.operations.updateOne(
        { code, "signups.discordUserId": { $ne: signup.discordUserId } },
        { $push: { signups: signup }, $set: { updatedAt: new Date() } },
      );
    }
    return this.operations.findOne({ code });
  }

  findOperationByMessage(messageId: string): Promise<OperationEventDocument | null> {
    return this.operations.findOne({ discordMessageId: messageId });
  }

  upcomingOperations(guildId: string, from = new Date()): Promise<OperationEventDocument[]> {
    return this.operations
      .find({ guildId, scheduledFor: { $gte: from }, cancelledAt: null })
      .sort({ scheduledFor: 1 })
      .toArray();
  }
}
