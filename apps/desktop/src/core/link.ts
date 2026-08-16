export interface RedeemedLink {
  token: string;
  username: string;
  discordId: string;
}

/**
 * Exchanges a `/link` code from Discord for a streaming token.
 *
 * Short codes are far less error-prone to retype than a 43-character token,
 * and they are single-use and short-lived, so a shoulder-surfed code is close
 * to worthless.
 */
export async function redeemLinkCode(
  serverUrl: string,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RedeemedLink> {
  const response = await fetchImpl(`${serverUrl}/api/link/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Link failed (${response.status})`);
  }
  return (await response.json()) as RedeemedLink;
}
