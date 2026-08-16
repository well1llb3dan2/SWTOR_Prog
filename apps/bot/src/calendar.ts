import type { BotConfig } from "./config.js";
import type { OperationView } from "./signups.js";

async function call<T>(
  config: BotConfig,
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.feedToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${path} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function fetchUpcoming(config: BotConfig, fetchImpl?: typeof fetch) {
  return call<(OperationView & { discordMessageId: string | null })[]>(
    config,
    "/api/operations",
    {},
    fetchImpl,
  );
}

export function recordSignup(
  config: BotConfig,
  code: string,
  signup: { discordUserId: string; displayName: string; status: string },
  fetchImpl?: typeof fetch,
) {
  return call<OperationView>(
    config,
    `/api/bot/operations/${code}/signup`,
    { method: "POST", body: JSON.stringify(signup) },
    fetchImpl,
  );
}

export function recordMessage(
  config: BotConfig,
  code: string,
  channelId: string,
  messageId: string,
  fetchImpl?: typeof fetch,
) {
  return call<{ ok: boolean }>(
    config,
    `/api/bot/operations/${code}/message`,
    { method: "POST", body: JSON.stringify({ channelId, messageId }) },
    fetchImpl,
  );
}
