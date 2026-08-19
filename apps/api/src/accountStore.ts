import {
  generateLinkCode,
  hashToken,
  issueToken,
  type ApiTokenRecord,
  type IssuedToken,
  type LinkCodeDocument,
  type LinkedCharacter,
  type SignupPreferences,
  type SwtorDatabase,
  type UserDocument,
} from "@swtor/db";

export interface SeenCharacter {
  playerId: string;
  serverId?: string | null;
  name: string;
  discipline: string | null;
  role: "tank" | "healer" | "dps" | null;
}

export interface UpsertUserInput {
  guildId: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  roles: string[];
  isMember: boolean;
  isModerator: boolean;
}

/** Account persistence, separated so the API can run without a database. */
export interface AccountStore {
  upsertUser(input: UpsertUserInput): Promise<UserDocument>;
  findUserByDiscordId(discordId: string): Promise<UserDocument | null>;
  findUserByToken(token: string): Promise<UserDocument | null>;
  issueUserToken(discordId: string, name: string): Promise<IssuedToken>;
  revokeUserToken(discordId: string, tokenId: string): Promise<void>;
  linkCharacter(discordId: string, character: LinkedCharacter): Promise<void>;
  unlinkCharacter(discordId: string, playerId: string, serverId?: string | null): Promise<void>;
  isCharacterClaimed(guildId: string, playerId: string, exceptDiscordId: string, serverId?: string | null): Promise<boolean>;
  createLinkCode(guildId: string, discordId: string): Promise<string>;
  consumeLinkCode(code: string): Promise<LinkCodeDocument | null>;
  /** Characters that appeared in reports this user uploaded. */
  charactersSeenBy(guildId: string, discordId: string): Promise<SeenCharacter[]>;
  updatePreferences(discordId: string, preferences: SignupPreferences): Promise<UserDocument | null>;
}

export class MongoAccountStore implements AccountStore {
  constructor(private readonly db: SwtorDatabase) {}

  upsertUser(input: UpsertUserInput) {
    return this.db.upsertUser(input);
  }
  findUserByDiscordId(discordId: string) {
    return this.db.findUserByDiscordId(discordId);
  }
  findUserByToken(token: string) {
    return this.db.findUserByToken(token);
  }
  issueUserToken(discordId: string, name: string) {
    return this.db.issueUserToken(discordId, name);
  }
  revokeUserToken(discordId: string, tokenId: string) {
    return this.db.revokeUserToken(discordId, tokenId);
  }
  linkCharacter(discordId: string, character: LinkedCharacter) {
    return this.db.linkCharacter(discordId, character);
  }
  unlinkCharacter(discordId: string, playerId: string, serverId?: string | null) {
    return this.db.unlinkCharacter(discordId, playerId, serverId);
  }
  isCharacterClaimed(guildId: string, playerId: string, exceptDiscordId: string, serverId?: string | null) {
    return this.db.isCharacterClaimed(guildId, playerId, exceptDiscordId, serverId);
  }
  createLinkCode(guildId: string, discordId: string) {
    return this.db.createLinkCode(guildId, discordId);
  }
  consumeLinkCode(code: string) {
    return this.db.consumeLinkCode(code);
  }

  async charactersSeenBy(guildId: string, discordId: string): Promise<SeenCharacter[]> {
    const reports = await this.db.reports.find({ guildId, ownerUserId: discordId }).toArray();
    return dedupeRoster(reports.flatMap((report) => report.roster));
  }

  async updatePreferences(discordId: string, preferences: SignupPreferences) {
    return this.db.updatePreferences(discordId, preferences);
  }
}

function dedupeRoster(
  roster: {
    playerId: string;
    serverId?: string | null;
    name: string;
    discipline: string | null;
    role: SeenCharacter["role"];
  }[],
): SeenCharacter[] {
  const seen = new Map<string, SeenCharacter>();
  for (const member of roster) {
    const key = `${member.playerId}::${member.serverId ?? ""}`;
    seen.set(key, {
      playerId: member.playerId,
      serverId: member.serverId ?? null,
      name: member.name,
      discipline: member.discipline,
      role: member.role,
    });
  }
  return [...seen.values()];
}

/** Non-durable account store for local runs and tests. */
export class MemoryAccountStore implements AccountStore {
  readonly #users = new Map<string, UserDocument>();
  readonly #codes = new Map<string, LinkCodeDocument>();
  #seen = new Map<string, SeenCharacter[]>();

  /** Test seam: pretend these characters appeared in the user's reports. */
  setSeenCharacters(discordId: string, characters: SeenCharacter[]): void {
    this.#seen.set(discordId, characters);
  }

  async upsertUser(input: UpsertUserInput): Promise<UserDocument> {
    const now = new Date();
    const existing = this.#users.get(input.discordId);
    const user: UserDocument = {
      ...input,
      characters: existing?.characters ?? [],
      tokens: existing?.tokens ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastLoginAt: now,
    };
    this.#users.set(user.discordId, user);
    return user;
  }

  async findUserByDiscordId(discordId: string): Promise<UserDocument | null> {
    return this.#users.get(discordId) ?? null;
  }

  async findUserByToken(token: string): Promise<UserDocument | null> {
    const hash = hashToken(token);
    for (const user of this.#users.values()) {
      const match = user.tokens.find((t) => t.hash === hash && t.revokedAt === null);
      if (match !== undefined) {
        match.lastUsedAt = new Date();
        return user;
      }
    }
    return null;
  }

  async issueUserToken(discordId: string, name: string): Promise<IssuedToken> {
    const user = this.#users.get(discordId);
    if (user === undefined) throw new Error("unknown user");

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
    user.tokens.push(record);
    return issued;
  }

  async revokeUserToken(discordId: string, tokenId: string): Promise<void> {
    const token = this.#users.get(discordId)?.tokens.find((t) => t.id === tokenId);
    if (token !== undefined) token.revokedAt = new Date();
  }

  async linkCharacter(discordId: string, character: LinkedCharacter): Promise<void> {
    const user = this.#users.get(discordId);
    if (user === undefined) return;
    const targetServer = character.serverId ?? null;
    if (user.characters.some((c) => c.playerId === character.playerId && (c.serverId ?? null) === targetServer)) return;
    user.characters.push(character);
  }

  async unlinkCharacter(discordId: string, playerId: string, serverId?: string | null): Promise<void> {
    const user = this.#users.get(discordId);
    if (user === undefined) return;
    user.characters = user.characters.filter((c) => {
      const matches = c.playerId === playerId;
      if (matches && serverId !== undefined) return (c.serverId ?? null) !== (serverId ?? null);
      return !matches;
    });
  }

  async isCharacterClaimed(
    guildId: string,
    playerId: string,
    exceptDiscordId: string,
    serverId?: string | null,
  ): Promise<boolean> {
    for (const user of this.#users.values()) {
      if (user.guildId !== guildId || user.discordId === exceptDiscordId) continue;
      if (user.characters.some((c) => {
        const samePlayer = c.playerId === playerId;
        if (!samePlayer) return false;
        if (serverId === undefined) return true;
        return (c.serverId ?? null) === (serverId ?? null);
      })) return true;
    }
    return false;
  }

  async createLinkCode(guildId: string, discordId: string): Promise<string> {
    const code = generateLinkCode();
    this.#codes.set(code, {
      guildId,
      code,
      discordId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      consumedAt: null,
    });
    return code;
  }

  async consumeLinkCode(code: string): Promise<LinkCodeDocument | null> {
    const entry = this.#codes.get(code);
    if (entry === undefined || entry.consumedAt !== null || entry.expiresAt <= new Date()) {
      return null;
    }
    entry.consumedAt = new Date();
    return entry;
  }

  async charactersSeenBy(_guildId: string, discordId: string): Promise<SeenCharacter[]> {
    return this.#seen.get(discordId) ?? [];
  }

  async updatePreferences(discordId: string, preferences: SignupPreferences) {
    const user = this.#users.get(discordId);
    if (user === undefined) return null;
    user.signupPreferences = { ...user.signupPreferences, ...preferences };
    user.updatedAt = new Date();
    return user;
  }
}
