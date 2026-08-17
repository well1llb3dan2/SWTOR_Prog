export interface AutoUpdateFeedConfig {
  provider: "github";
  owner: string;
  repo: string;
  releaseType: "release";
}

export function buildAutoUpdateFeed(config: {
  owner: string;
  repo: string;
}): AutoUpdateFeedConfig {
  return {
    provider: "github",
    owner: config.owner,
    repo: config.repo,
    releaseType: "release",
  };
}
