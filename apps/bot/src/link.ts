import type { BotConfig } from "./config.js";

export interface LinkCodeResponse {
  code: string;
  expiresInSeconds: number;
}

export async function requestLinkCode(
  config: BotConfig,
  user: { id: string; username: string; globalName: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<LinkCodeResponse> {
  const response = await fetchImpl(`${config.apiUrl}/api/link/code`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.feedToken}`,
    },
    body: JSON.stringify({
      discordId: user.id,
      username: user.username,
      globalName: user.globalName,
    }),
  });

  if (!response.ok) throw new Error(`link code request failed (${response.status})`);
  return (await response.json()) as LinkCodeResponse;
}

/**
 * Wording for the `/link` reply.
 *
 * Kept separate from Discord so the copy is unit tested; the reply is always
 * ephemeral because the code is a bearer credential for the desktop client.
 */
export function buildLinkMessage(code: string, expiresInSeconds: number, webUrl: string): string {
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  return [
    `Your link code is **${code}**`,
    "",
    `Open the desktop streamer, choose **Link with code**, and enter it. ` +
      `The code works once and expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    `You can also manage characters and tokens at ${webUrl}/me`,
  ].join("\n");
}
