import { describe, expect, it } from "vitest";
import { buildLinkMessage } from "../src/link.js";

describe("buildLinkMessage", () => {
  it("includes a one-click account link URL for the web portal", () => {
    const message = buildLinkMessage("ABC123", 600, "https://swtor-web.onrender.com");
    expect(message).toContain("https://swtor-web.onrender.com/me?linkCode=ABC123");
    expect(message).toContain("finish linking");
  });
});
