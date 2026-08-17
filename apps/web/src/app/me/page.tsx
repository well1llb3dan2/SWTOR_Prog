"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBase";
import { roleAccent } from "@/lib/meters";

const API_URL = API_BASE_URL;

interface TokenSummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Character {
  playerId: string;
  name: string;
  discipline: string | null;
  role: "tank" | "healer" | "dps" | null;
}

interface Me {
  discordId: string;
  username: string;
  globalName: string | null;
  isMember: boolean;
  isModerator: boolean;
  characters: Character[];
  tokens: TokenSummary[];
}

const send = (path: string, init: RequestInit = {}) =>
  fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...init,
  });

function AccountPageContent() {
  const searchParams = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [available, setAvailable] = useState<Character[]>([]);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [usedLinkCode, setUsedLinkCode] = useState<string | null>(null);

  const linkCode = searchParams.get("linkCode")?.trim().toUpperCase() ?? null;

  const refresh = useCallback(async () => {
    const response = await send("/api/me");
    const body = (await response.json()) as { user: Me | null };
    setMe(body.user);
    setLoading(false);

    if (body.user !== null) {
      const characters = await send("/api/me/characters/available");
      if (characters.ok) setAvailable((await characters.json()) as Character[]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (me === null || linkCode === null || usedLinkCode === linkCode) return;

    let cancelled = false;
    void (async () => {
      const response = await send("/api/link/redeem", {
        method: "POST",
        body: JSON.stringify({ code: linkCode }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; username?: string } | null;

      if (cancelled) return;
      if (!response.ok) {
        setMessage(body?.error ?? "That link code could not be used.");
        setUsedLinkCode(linkCode);
        return;
      }

      setMessage(`Linked successfully as ${body?.username ?? "your account"}. You can now generate a token or link characters.`);
      setUsedLinkCode(linkCode);
    })();

    return () => {
      cancelled = true;
    };
  }, [linkCode, me, usedLinkCode]);

  if (loading) {
    return <p className="panel rounded-md px-6 py-16 text-center text-sm">Loading…</p>;
  }

  if (me === null) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl uppercase">Sign in</h1>
        <section className="panel rounded-md p-6">
          <p className="text-sm text-[var(--color-muted)]">
            Sign in with Discord to link your characters and generate a streaming token.
          </p>
          {linkCode !== null ? (
            <p className="mt-3 text-sm text-[var(--color-gold)]">
              A one-time link code was found. Sign in with Discord to finish linking it.
            </p>
          ) : null}
          <a
            href={`${API_URL}/auth/discord${linkCode === null ? "" : `?linkCode=${encodeURIComponent(linkCode)}`}`}
            className="mt-4 inline-block rounded border border-[var(--color-gold)] px-5 py-2 text-xs uppercase tracking-[0.15em] text-[var(--color-gold)] transition hover:bg-[var(--color-gold)]/10"
          >
            Continue with Discord
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
          >
            Infamous
          </Link>
          <h1 className="mt-1 text-2xl uppercase">{me.globalName ?? me.username}</h1>
          <p className="text-xs text-[var(--color-muted)]">
            {me.isModerator ? "Moderator" : me.isMember ? "Member" : "Guest"}
          </p>
        </div>
        <button
          onClick={async () => {
            await send("/auth/logout", { method: "POST" });
            await refresh();
          }}
          className="rounded border border-[var(--color-line)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Sign out
        </button>
      </header>

      {message !== null ? (
        <p className="panel rounded-md px-4 py-3 text-sm text-[var(--color-muted)]">{message}</p>
      ) : null}

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Characters</h2>

        {me.characters.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No characters linked yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {me.characters.map((character) => (
              <li key={character.playerId} className="flex items-center gap-3">
                <span
                  className="h-5 w-1 rounded-full"
                  style={{ background: roleAccent(character.role) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{character.name}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {character.discipline ?? "Unknown discipline"}
                  </span>
                </span>
                <button
                  onClick={async () => {
                    await send(`/api/me/characters/${character.playerId}`, { method: "DELETE" });
                    await refresh();
                  }}
                  className="text-xs uppercase tracking-[0.1em] text-[var(--color-muted)] hover:text-red-300"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}

        {available.length > 0 ? (
          <>
            <h3 className="mt-5 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Seen in your uploads
            </h3>
            <ul className="mt-2 space-y-2">
              {available.map((character) => (
                <li key={character.playerId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {character.name}
                    <span className="text-[var(--color-muted)]">
                      {character.discipline === null ? "" : ` · ${character.discipline}`}
                    </span>
                  </span>
                  <button
                    onClick={async () => {
                      const response = await send("/api/me/characters", {
                        method: "POST",
                        body: JSON.stringify({ playerId: character.playerId }),
                      });
                      if (!response.ok) {
                        setMessage(((await response.json()) as { error: string }).error);
                      }
                      await refresh();
                    }}
                    className="rounded border border-[var(--color-republic)] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[var(--color-republic)]"
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Streaming tokens
        </h2>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Or run <code className="text-[var(--color-republic)]">/link</code> in Discord to get a
          one-time code for the desktop app.
        </p>

        {freshToken !== null ? (
          <div className="mt-3 rounded border border-[var(--color-gold)]/40 bg-black/40 p-3">
            <p className="text-xs text-[var(--color-gold)]">
              Copy this now — it is not shown again.
            </p>
            <code className="mt-2 block break-all text-sm">{freshToken}</code>
          </div>
        ) : null}

        {me.tokens.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {me.tokens.map((token) => (
              <li key={token.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {token.name}
                  <span className="text-[var(--color-muted)]"> · {token.prefix}…</span>
                </span>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">
                  {token.lastUsedAt === null
                    ? "never used"
                    : new Date(token.lastUsedAt).toLocaleDateString("en-GB")}
                </span>
                <button
                  onClick={async () => {
                    await send(`/api/me/tokens/${token.id}`, { method: "DELETE" });
                    setFreshToken(null);
                    await refresh();
                  }}
                  className="shrink-0 text-xs uppercase tracking-[0.1em] text-[var(--color-muted)] hover:text-red-300"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          onClick={async () => {
            const response = await send("/api/me/tokens", {
              method: "POST",
              body: JSON.stringify({ name: "Desktop" }),
            });
            if (response.ok) setFreshToken(((await response.json()) as { token: string }).token);
            await refresh();
          }}
          className="mt-4 rounded border border-[var(--color-gold)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-gold)] transition hover:bg-[var(--color-gold)]/10"
        >
          Generate token
        </button>
      </section>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="panel rounded-md px-6 py-16 text-center text-sm">Loading…</p>}>
      <AccountPageContent />
    </Suspense>
  );
}
