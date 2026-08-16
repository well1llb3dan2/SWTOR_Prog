import type { OperationEventDocument, SwtorDatabase } from "@swtor/db";
import { generateReportCode } from "@swtor/db";
import type { Signup } from "@swtor/shared";

export type CreateOperationInput = Omit<
  OperationEventDocument,
  "code" | "signups" | "cancelledAt" | "createdAt" | "updatedAt"
>;

export type OperationPatch = Partial<
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
>;

/** Calendar persistence, mirroring the report and account store pattern. */
export interface OperationStore {
  create(input: CreateOperationInput): Promise<OperationEventDocument>;
  find(guildId: string, code: string): Promise<OperationEventDocument | null>;
  update(
    guildId: string,
    code: string,
    patch: OperationPatch,
  ): Promise<OperationEventDocument | null>;
  upcoming(guildId: string, from?: Date): Promise<OperationEventDocument[]>;
  signup(code: string, signup: Signup): Promise<OperationEventDocument | null>;
  linkDiscordMessage(code: string, channelId: string, messageId: string): Promise<void>;
  findByMessage(messageId: string): Promise<OperationEventDocument | null>;
}

export class MongoOperationStore implements OperationStore {
  constructor(private readonly db: SwtorDatabase) {}

  create(input: CreateOperationInput) {
    return this.db.createOperationEvent(input);
  }
  find(guildId: string, code: string) {
    return this.db.findOperation(guildId, code);
  }
  update(guildId: string, code: string, patch: OperationPatch) {
    return this.db.updateOperation(guildId, code, patch);
  }
  upcoming(guildId: string, from?: Date) {
    return this.db.upcomingOperations(guildId, from);
  }
  signup(code: string, signup: Signup) {
    return this.db.upsertSignup(code, signup);
  }
  linkDiscordMessage(code: string, channelId: string, messageId: string) {
    return this.db.linkDiscordMessage(code, channelId, messageId);
  }
  findByMessage(messageId: string) {
    return this.db.findOperationByMessage(messageId);
  }
}

export class MemoryOperationStore implements OperationStore {
  readonly #events = new Map<string, OperationEventDocument>();

  async create(input: CreateOperationInput): Promise<OperationEventDocument> {
    const now = new Date();
    const event: OperationEventDocument = {
      ...input,
      code: generateReportCode(8),
      signups: [],
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.#events.set(event.code, event);
    return event;
  }

  async find(guildId: string, code: string): Promise<OperationEventDocument | null> {
    const event = this.#events.get(code);
    return event !== undefined && event.guildId === guildId ? event : null;
  }

  async update(
    guildId: string,
    code: string,
    patch: OperationPatch,
  ): Promise<OperationEventDocument | null> {
    const event = await this.find(guildId, code);
    if (event === null) return null;
    Object.assign(event, patch, { updatedAt: new Date() });
    return event;
  }

  async upcoming(guildId: string, from = new Date()): Promise<OperationEventDocument[]> {
    return [...this.#events.values()]
      .filter((e) => e.guildId === guildId && e.cancelledAt === null && e.scheduledFor >= from)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  async signup(code: string, signup: Signup): Promise<OperationEventDocument | null> {
    const event = this.#events.get(code);
    if (event === undefined) return null;

    const index = event.signups.findIndex((s) => s.discordUserId === signup.discordUserId);
    if (index === -1) event.signups.push(signup);
    else event.signups[index] = signup;
    event.updatedAt = new Date();
    return event;
  }

  async linkDiscordMessage(code: string, channelId: string, messageId: string): Promise<void> {
    const event = this.#events.get(code);
    if (event === undefined) return;
    event.discordChannelId = channelId;
    event.discordMessageId = messageId;
  }

  async findByMessage(messageId: string): Promise<OperationEventDocument | null> {
    for (const event of this.#events.values()) {
      if (event.discordMessageId === messageId) return event;
    }
    return null;
  }
}
