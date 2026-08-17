import { describe, expect, it } from "vitest";
import { buildAutoUpdateFeed } from "../src/core/updater.js";

describe("buildAutoUpdateFeed", () => {
  it("creates a github release feed config for the repo", () => {
    expect(buildAutoUpdateFeed({ owner: "well1llb3dan2", repo: "SWTOR_Prog" })).toEqual({
      provider: "github",
      owner: "well1llb3dan2",
      repo: "SWTOR_Prog",
      releaseType: "release",
    });
  });
});
