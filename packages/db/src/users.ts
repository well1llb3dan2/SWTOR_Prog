import type { Role } from "@swtor/shared";
import type { Tenanted } from "./schema.js";

export interface LinkedCharacter {
  /** SWTOR player id as it appears in combat logs. */
  playerId: string;
  name: string;
  discipline: string | null;
  role: Role | null;
  linkedAt: Date;
}

export interface ApiTokenRecord {
  id: string;
  name: string;
  /** First few characters of the token, for display only. */
  prefix: string;
  hash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface SignupPreferences {
  preferredRole: "tank" | "healer" | "dps" | "bench" | "declined" | null;
  notes: string | null;
  availabilityWindow: string | null;
}

export interface UserDocument extends Tenanted {
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  /** Discord role ids at last login. */
  roles: string[];
  isModerator: boolean;
  isMember: boolean;
  characters: LinkedCharacter[];
  tokens: ApiTokenRecord[];
  signupPreferences: SignupPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

/** Short-lived code exchanged in Discord to prove control of an account. */
export interface LinkCodeDocument extends Tenanted {
  code: string;
  discordId: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

export const USER_COLLECTIONS = {
  users: "users",
  linkCodes: "linkCodes",
} as const;

/** A user is safe to send to the browser only after the secrets are stripped. */
export interface PublicUser {
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  isModerator: boolean;
  isMember: boolean;
  characters: LinkedCharacter[];
  tokens: Omit<ApiTokenRecord, "hash">[];
  signupPreferences: SignupPreferences;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    discordId: user.discordId,
    username: user.username,
    globalName: user.globalName,
    avatar: user.avatar,
    isModerator: user.isModerator,
    isMember: user.isMember,
    characters: user.characters,
    signupPreferences: user.signupPreferences,
    tokens: user.tokens
      .filter((token) => token.revokedAt === null)
      .map(({ hash: _hash, ...rest }) => rest),
  };
}
