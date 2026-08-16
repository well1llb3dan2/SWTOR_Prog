import { randomBytes } from "node:crypto";

/** Excludes vowels and lookalike glyphs so codes are unambiguous when read aloud. */
const ALPHABET = "0123456789BCDFGHJKLMNPQRSTVWXYZ";

/**
 * Generates a short, URL-safe report code.
 *
 * Uses rejection sampling rather than modulo so every symbol is equally likely;
 * a modulo bias would shrink the effective keyspace and raise collision odds.
 */
export function generateReportCode(length = 10): string {
  if (length <= 0) throw new RangeError("length must be positive");

  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let code = "";

  while (code.length < length) {
    for (const byte of randomBytes(length)) {
      if (byte >= limit) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === length) break;
    }
  }

  return code;
}

export function isReportCode(value: string): boolean {
  return value.length > 0 && [...value].every((c) => ALPHABET.includes(c));
}
