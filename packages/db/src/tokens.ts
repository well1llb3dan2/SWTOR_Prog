import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Visible prefix so a user can identify a token without revealing it. */
export const TOKEN_PREFIX_LENGTH = 8;

export interface IssuedToken {
  /** Shown to the user exactly once. */
  token: string;
  prefix: string;
  hash: string;
}

/**
 * Issues an API token.
 *
 * The raw token is never stored -- only its SHA-256 digest. A plain hash is the
 * right choice here rather than a slow KDF: the token is 256 bits of CSPRNG
 * output, so there is no low-entropy secret to brute force and the lookup stays
 * cheap enough to run on every ingest connection.
 */
export function issueToken(): IssuedToken {
  const token = randomBytes(32).toString("base64url");
  return { token, prefix: token.slice(0, TOKEN_PREFIX_LENGTH), hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison, so a mismatch reveals nothing through timing. */
export function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Codes are read aloud in Discord, so ambiguous glyphs are excluded. */
const CODE_ALPHABET = "23456789BCDFGHJKMNPQRSTVWXYZ";

export function generateLinkCode(length = 6): string {
  const limit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let code = "";
  while (code.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= limit) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === length) break;
    }
  }
  return code;
}
