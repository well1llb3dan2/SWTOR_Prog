import { describe, expect, it } from "vitest";
import { decodeLogText } from "../src/core/encoding.js";

describe("decodeLogText", () => {
  it("decodes cp1252 accented names without replacement characters", () => {
    const bytes = Buffer.from([0x4d, 0xe9, 0x72, 0x6c, 0xed, 0x6e, 0x0a]);
    expect(decodeLogText(bytes)).toBe("Mérlín\n");
  });

  it("preserves utf8 text for non-ASCII names", () => {
    expect(decodeLogText(Buffer.from("Mérlín\n", "utf8"))).toBe("Mérlín\n");
  });
});
