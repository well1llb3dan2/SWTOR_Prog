"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBase";
import { roleAccent } from "@/lib/meters";

const API_URL = API_BASE_URL;

interface Character {
  playerId: string;
  serverId?: string | null;
  name: string;
  discipline: string | null;
  role: "tank" | "healer" | "dps" | null;
}

interface SignupPreferences {
  preferredRole: "tank" | "healer" | "dps" | "bench" | "declined" | null;
  notes: string | null;
  availabilityWindow: string | null;
}

interface Me {
  discordId: string;
  username: string;
  globalName: string | null;
  isMember: boolean;
  isModerator: boolean;
  characters: Character[];
  signupPreferences: SignupPreferences;
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [usedLinkCode, setUsedLinkCode] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<SignupPreferences>({
    preferredRole: null,
    notes: null,
    availabilityWindow: null,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [streamStatus, setStreamStatus] = useState<{
    active: boolean;
    sessionId?: string;
    reportCode?: string;
    logFileName?: string;
    eventsReceived?: number;
    lastSeenAt?: number;
  } | null>(null);

  const linkCode = searchParams.get("linkCode")?.trim().toUpperCase() ?? null;

  const refresh = useCallback(async () => {
    const response = await send("/api/me");
    const body = (await response.json()) as { user: Me | null };
    setMe(body.user);
    setLoading(false);

    if (body.user !== null) {
      setPreferences(body.user.signupPreferences ?? { preferredRole: null, notes: null, availabilityWindow: null });

      const characters = await send("/api/me/characters/available");
      if (characters.ok) setAvailable((await characters.json()) as Character[]);

      const streamResponse = await send("/api/me/stream/status");
      if (streamResponse.ok) {
        setStreamStatus((await streamResponse.json()) as { active: boolean; sessionId?: string; reportCode?: string; logFileName?: string; eventsReceived?: number; lastSeenAt?: number });
      }
    } else {
      setStreamStatus(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (me === null) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, 5_000);

    return () => window.clearInterval(interval);
  }, [me, refresh]);

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
            Sign in with Discord to link your own characters after they are detected by parsing.
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
            await send("/auth/logout", { method: "GET" });
            window.location.assign("/me");
          }}
          className="rounded border border-[var(--color-line)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Sign out
        </button>
      </header>

      {message !== null ? (
        <p className="panel rounded-md px-4 py-3 text-sm text-[var(--color-muted)]">{message}</p>
      ) : null}

      {streamStatus?.active ? (
        <section className="panel rounded-md border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-republic)]">
            Live stream connected
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink)]">
            Your desktop streamer is currently active and sending live combat data.
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Session {streamStatus.sessionId ?? "unknown"} · Report {streamStatus.reportCode ?? "unknown"}
          </p>
        </section>
      ) : null}

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Member profile</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Only characters you personally appeared with in your own uploads or live sessions can be linked here. This keeps the roster tied to your account rather than every character seen in guild logs.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="rounded border border-[var(--color-line)] p-3 text-sm">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">Preferred role</span>
            <select
              value={preferences.preferredRole ?? ""}
              onChange={(event) => setPreferences((current) => ({ ...current, preferredRole: event.target.value as SignupPreferences["preferredRole"] }))}
              className="mt-2 w-full rounded border border-[var(--color-line)] bg-black/25 px-3 py-2 text-sm"
            >
              <option value="">No preference</option>
              <option value="tank">Tank</option>
              <option value="healer">Healer</option>
              <option value="dps">DPS</option>
              <option value="bench">Bench</option>
              <option value="declined">Declined</option>
            </select>
          </label>
          <label className="rounded border border-[var(--color-line)] p-3 text-sm">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">Availability window</span>
            <input
              value={preferences.availabilityWindow ?? ""}
              onChange={(event) => setPreferences((current) => ({ ...current, availabilityWindow: event.target.value }))}
              placeholder="e.g. Sunday 8pm-11pm"
              className="mt-2 w-full rounded border border-[var(--color-line)] bg-black/25 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-3 block rounded border border-[var(--color-line)] p-3 text-sm">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">Roster notes</span>
          <textarea
            value={preferences.notes ?? ""}
            onChange={(event) => setPreferences((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Share your notes for raid leads, such as late-night availability or backup roles."
            className="mt-2 min-h-24 w-full rounded border border-[var(--color-line)] bg-black/25 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={async () => {
            setSavingPreferences(true);
            const response = await send("/api/me/preferences", {
              method: "PATCH",
              body: JSON.stringify(preferences),
            });
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            setSavingPreferences(false);
            setMessage(response.ok ? "Your signup details were saved." : body?.error ?? "Could not save your profile details.");
          }}
          className="mt-4 rounded border border-[var(--color-republic)] px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--color-republic)]"
        >
          {savingPreferences ? "Saving…" : "Save signup details"}
        </button>
      </section>

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Characters</h2>

        {me.characters.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No characters linked yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {me.characters.map((character) => (
              <li key={`${character.playerId}::${character.serverId ?? ""}`} className="flex items-center gap-3">
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
                    const query = character.serverId ? `?serverId=${encodeURIComponent(character.serverId)}` : "";
                    await send(`/api/me/characters/${character.playerId}${query}`, { method: "DELETE" });
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
                <li key={`${character.playerId}::${character.serverId ?? ""}`} className="flex items-center gap-3">
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
                        body: JSON.stringify({ playerId: character.playerId, serverId: character.serverId ?? null }),
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
