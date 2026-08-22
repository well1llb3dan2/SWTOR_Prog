import { describe, expect, it } from "vitest";
import {
  TOKEN_PREFIX_LENGTH,
  generateLinkCode,
  hashToken,
  issueToken,
  toPublicUser,
  tokenMatches,
  type UserDocument,
} from "@swtor/db";

describe("issueToken", () => {
  it("returns a token, its visible prefix and only a digest to store", () => {
    const issued = issueToken();

    expect(issued.token.length).toBeGreaterThan(32);
    expect(issued.prefix).toBe(issued.token.slice(0, TOKEN_PREFIX_LENGTH));
    expect(issued.hash).toHaveLength(64);
    expect(issued.hash).not.toContain(issued.token);
  });

  it("is URL safe so it survives config files and headers", () => {
    for (let i = 0; i < 25; i += 1) {
      expect(issueToken().token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 1_000 }, () => issueToken().token));
    expect(tokens.size).toBe(1_000);
  });
});

describe("tokenMatches", () => {
  it("accepts the token that produced the hash", () => {
    const issued = issueToken();
    expect(tokenMatches(issued.token, issued.hash)).toBe(true);
  });

  it("rejects any other token", () => {
    const issued = issueToken();
    expect(tokenMatches(issueToken().token, issued.hash)).toBe(false);
    expect(tokenMatches(`${issued.token}x`, issued.hash)).toBe(false);
  });

  it("rejects a malformed hash without throwing", () => {
    expect(tokenMatches("anything", "not-a-hash")).toBe(false);
    expect(tokenMatches("anything", "")).toBe(false);
  });

  it("hashes deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("generateLinkCode", () => {
  it("avoids glyphs that are ambiguous when read aloud", () => {
    const codes = Array.from({ length: 200 }, () => generateLinkCode()).join("");
    expect(codes).not.toMatch(/[01OILAEU]/);
  });

  it("honours the requested length", () => {
    expect(generateLinkCode(6)).toHaveLength(6);
    expect(generateLinkCode(10)).toHaveLength(10);
  });
});

describe("toPublicUser", () => {
  const user: UserDocument = {
    guildId: "infamous",
    discordId: "1234",
    username: "twistle",
    globalName: "Twistle",
    avatar: null,
    roles: ["role-a"],
    isMember: true,
    isModerator: true,
    signupPreferences: { preferredRole: null, notes: null, availabilityWindow: null },
    characters: [
      {
        playerId: "688363584125440",
        name: "Twistle",
        discipline: "Watchman",
        role: "dps",
        linkedAt: new Date(),
      },
    ],
    tokens: [
      {
        id: "abc",
        name: "Desktop",
        prefix: "abc",
        hash: "secret-hash",
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      },
      {
        id: "old",
        name: "Old laptop",
        prefix: "old",
        hash: "another-hash",
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  // Leaking a token hash would let an attacker verify guessed tokens offline.
  it("never exposes token hashes to the browser", () => {
    const publicUser = toPublicUser(user);
    expect(JSON.stringify(publicUser)).not.toContain("secret-hash");
    expect(publicUser.tokens[0]).not.toHaveProperty("hash");
  });

  it("hides revoked tokens", () => {
    expect(toPublicUser(user).tokens.map((t) => t.id)).toEqual(["abc"]);
  });

  it("keeps the details the portal needs", () => {
    const publicUser = toPublicUser(user);
    expect(publicUser).toMatchObject({ discordId: "1234", isModerator: true });
    expect(publicUser.characters[0]!.name).toBe("Twistle");
  });

  it("does not expose raw Discord role ids", () => {
    expect(toPublicUser(user)).not.toHaveProperty("roles");
  });
});
