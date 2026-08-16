"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { roleAccent } from "@/lib/meters";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TIME_ZONE = "America/New_York";

type SignupStatus = "tank" | "healer" | "dps" | "bench" | "declined";

interface Signup {
  discordUserId: string;
  displayName: string;
  characterName: string | null;
  status: SignupStatus;
}

interface RosterGroup {
  confirmed: Signup[];
  waitlisted: Signup[];
  limit: number;
}

interface OperationEvent {
  code: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  difficulty: string | null;
  groupSize: number | null;
  cancelledAt: string | null;
  status: string;
  signups: Signup[];
  roster: {
    tanks: RosterGroup;
    healers: RosterGroup;
    dps: RosterGroup;
    bench: Signup[];
    declined: Signup[];
    isFull: boolean;
  };
}

const send = (path: string, init: RequestInit = {}) =>
  fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...init,
  });

const CHOICES: { status: SignupStatus; label: string }[] = [
  { status: "tank", label: "Tank" },
  { status: "healer", label: "Healer" },
  { status: "dps", label: "DPS" },
  { status: "bench", label: "Bench" },
  { status: "declined", label: "Can't make it" },
];

function RoleColumn({ title, group, role }: { title: string; group: RosterGroup; role: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {title} {group.confirmed.length}/{group.limit}
      </p>
      <ul className="mt-1.5 space-y-1">
        {group.confirmed.map((signup) => (
          <li key={signup.discordUserId} className="flex items-center gap-2 text-sm">
            <span
              className="h-3.5 w-0.5 rounded-full"
              style={{ background: roleAccent(role as "tank") }}
              aria-hidden
            />
            <span className="truncate">{signup.characterName ?? signup.displayName}</span>
          </li>
        ))}
        {group.waitlisted.map((signup) => (
          <li
            key={signup.discordUserId}
            className="truncate pl-2.5 text-sm text-[var(--color-muted)]"
          >
            {signup.characterName ?? signup.displayName} (waitlist)
          </li>
        ))}
        {group.confirmed.length === 0 && group.waitlisted.length === 0 ? (
          <li className="pl-2.5 text-sm text-[var(--color-muted)]">—</li>
        ) : null}
      </ul>
    </div>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const [me, setMe] = useState<{ discordId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [operations, session] = await Promise.all([send("/api/operations"), send("/api/me")]);
      if (!operations.ok) throw new Error(`API returned ${operations.status}`);

      setEvents((await operations.json()) as OperationEvent[]);
      setMe(((await session.json()) as { user: { discordId: string } | null }).user);
      setError(null);
    } catch {
      setError("Could not reach the API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function signup(code: string, status: SignupStatus) {
    const response = await send(`/api/operations/${code}/signup`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    if (!response.ok) setError(((await response.json()) as { error: string }).error);
    await refresh();
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
          <h1 className="mt-1 text-2xl uppercase">Operations</h1>
          <p className="text-xs text-[var(--color-muted)]">All times shown in server time</p>
        </div>
        {me === null ? (
          <Link href="/me" className="text-sm text-[var(--color-republic)] hover:underline">
            Sign in to respond →
          </Link>
        ) : null}
      </header>

      {error !== null ? (
        <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      {loading ? (
        <p className="panel rounded-md px-6 py-16 text-center text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <p className="panel rounded-md px-6 py-16 text-center text-sm text-[var(--color-muted)]">
          Nothing scheduled. A raid leader can create an operation from the portal or Discord.
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => {
            const mine = event.signups.find((s) => s.discordUserId === me?.discordId);

            return (
              <li key={event.code} className="panel rounded-md p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg uppercase">{event.title}</h2>
                  <span
                    className="text-xs uppercase tracking-[0.12em]"
                    style={{
                      color: event.roster.isFull ? "var(--color-republic)" : "var(--color-gold)",
                    }}
                  >
                    {event.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {new Date(event.scheduledFor).toLocaleString("en-GB", {
                    timeZone: TIME_ZONE,
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                  {event.difficulty === null ? "" : ` · ${event.difficulty}`}
                  {event.groupSize === null ? "" : ` · ${event.groupSize}-player`}
                </p>

                {event.description !== null ? (
                  <p className="mt-2 text-sm">{event.description}</p>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <RoleColumn title="Tanks" group={event.roster.tanks} role="tank" />
                  <RoleColumn title="Healers" group={event.roster.healers} role="healer" />
                  <RoleColumn title="DPS" group={event.roster.dps} role="dps" />
                </div>

                {event.roster.bench.length > 0 || event.roster.declined.length > 0 ? (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {event.roster.bench.length > 0
                      ? `Bench: ${event.roster.bench.map((s) => s.displayName).join(", ")}`
                      : ""}
                    {event.roster.bench.length > 0 && event.roster.declined.length > 0 ? " · " : ""}
                    {event.roster.declined.length > 0
                      ? `Out: ${event.roster.declined.map((s) => s.displayName).join(", ")}`
                      : ""}
                  </p>
                ) : null}

                {me !== null ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {CHOICES.map((choice) => (
                      <button
                        key={choice.status}
                        onClick={() => void signup(event.code, choice.status)}
                        className={`rounded border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
                          mine?.status === choice.status
                            ? "border-[var(--color-republic)] bg-[var(--color-republic)]/15 text-[var(--color-republic)]"
                            : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
