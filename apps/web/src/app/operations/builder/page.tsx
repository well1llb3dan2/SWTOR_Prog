"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";

const API_URL = API_BASE_URL;

type SignupStatus = "tank" | "healer" | "dps" | "bench" | "declined";

interface Signup {
  discordUserId: string;
  displayName: string;
  characterName: string | null;
  status: SignupStatus;
}

interface OperationEvent {
  code: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  difficulty: string | null;
  groupSize: number | null;
  cancelledAt: string | null;
  limits: { tanks: number; healers: number; dps: number };
  signups: Signup[];
  roster: {
    tanks: { confirmed: Signup[]; waitlisted: Signup[]; limit: number };
    healers: { confirmed: Signup[]; waitlisted: Signup[]; limit: number };
    dps: { confirmed: Signup[]; waitlisted: Signup[]; limit: number };
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

function labelForStatus(status: SignupStatus) {
  switch (status) {
    case "tank":
      return "Tank";
    case "healer":
      return "Healer";
    case "dps":
      return "DPS";
    case "bench":
      return "Bench";
    default:
      return "Declined";
  }
}

export default function OperationsBuilderPage() {
  const [operations, setOperations] = useState<OperationEvent[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ isModerator: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [operationsResponse, meResponse] = await Promise.all([send("/api/operations"), send("/api/me")]);
        if (!operationsResponse.ok) throw new Error(`API returned ${operationsResponse.status}`);
        const body = (await operationsResponse.json()) as OperationEvent[];
        const account = (await meResponse.json()) as { user: { isModerator?: boolean } | null };
        if (!cancelled) {
          setOperations(body);
          setSelectedCode((current) => current ?? body[0]?.code ?? null);
          setMe(account.user ? { isModerator: account.user.isModerator ?? false } : { isModerator: false });
        }
      } catch {
        if (!cancelled) setError("Could not load operations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEvent = useMemo(
    () => operations.find((event) => event.code === selectedCode) ?? operations[0] ?? null,
    [operations, selectedCode],
  );

  const suggestion = useMemo(() => {
    if (selectedEvent === null) return null;

    const byRole = {
      tank: selectedEvent.signups.filter((signup) => signup.status === "tank"),
      healer: selectedEvent.signups.filter((signup) => signup.status === "healer"),
      dps: selectedEvent.signups.filter((signup) => signup.status === "dps"),
    } as const;

    const target = {
      tank: selectedEvent.limits.tanks || 2,
      healer: selectedEvent.limits.healers || 2,
      dps: selectedEvent.limits.dps || 4,
    };

    const suggested = {
      tank: byRole.tank.slice(0, target.tank),
      healer: byRole.healer.slice(0, target.healer),
      dps: byRole.dps.slice(0, target.dps),
    };

    const used = new Set<string>([
      ...suggested.tank.map((signup) => signup.discordUserId),
      ...suggested.healer.map((signup) => signup.discordUserId),
      ...suggested.dps.map((signup) => signup.discordUserId),
    ]);

    const bench = selectedEvent.signups.filter(
      (signup) => signup.status !== "declined" && !used.has(signup.discordUserId),
    );

    return { suggested, bench, target };
  }, [selectedEvent]);

  return (
    <main className="space-y-6">
      <header>
        <Link href="/operations" className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline">
          ← Back to operations
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Roster builder</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Review current signups and compose a practical core roster for the next mission.
        </p>
      </header>

      {error !== null ? <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p> : null}

      {me?.isModerator !== true ? (
        <section className="panel rounded-md p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-gold)]">Officer access</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Only members with the Discord officer role can review and plan the roster from this panel.</p>
        </section>
      ) : null}

      {me?.isModerator === true ? (
        <>
          <section className="panel rounded-md p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Active operation</p>
                {selectedEvent ? <h2 className="mt-1 text-lg uppercase">{selectedEvent.title}</h2> : null}
              </div>
              <div className="rounded border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-muted)]">
                {loading ? "Loading…" : operations.length === 0 ? "No operations" : "Select an operation"}
              </div>
            </div>

            {operations.length > 0 ? (
              <select
                value={selectedCode ?? ""}
                onChange={(event) => setSelectedCode(event.target.value)}
                className="mt-4 w-full rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
              >
                {operations.map((event) => (
                  <option key={event.code} value={event.code}>
                    {event.title}
                  </option>
                ))}
              </select>
            ) : null}
          </section>

          {selectedEvent !== null ? (
            <section className="panel rounded-md p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Suggested composition</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {new Date(selectedEvent.scheduledFor).toLocaleString("en-GB", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" })}
                  </p>
                </div>
                <div className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
                  {selectedEvent.roster.isFull ? "Roster full" : "Open slots available"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {(["tank", "healer", "dps"] as const).map((role) => {
                  const members = suggestion?.suggested[role] ?? [];
                  const target = suggestion?.target[role] ?? 0;
                  return (
                    <div key={role} className="rounded border border-[var(--color-line)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm uppercase">{role === "dps" ? "DPS" : role.charAt(0).toUpperCase() + role.slice(1)}s</p>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          {members.length}/{target}
                        </span>
                      </div>
                      {members.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {members.map((signup) => (
                            <li key={signup.discordUserId} className="rounded bg-black/20 px-3 py-2 text-sm">
                              {signup.characterName ?? signup.displayName}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--color-muted)]">No confirmed picks yet</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded border border-[var(--color-line)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Bench / alternate picks</p>
                  {suggestion?.bench.length ? (
                    <ul className="mt-3 space-y-2">
                      {suggestion.bench.map((signup) => (
                        <li key={signup.discordUserId} className="flex items-center justify-between rounded bg-black/20 px-3 py-2 text-sm">
                          <span>{signup.characterName ?? signup.displayName}</span>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                            {labelForStatus(signup.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--color-muted)]">No additional signups to rotate in.</p>
                  )}
                </div>
                <div className="rounded border border-[var(--color-line)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Builder notes</p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
                    <li>• The suggested roster prioritises the current confirmed role slots.</li>
                    <li>• Bench picks are drawn from signups that are not already in the core comp.</li>
                    <li>• This surface is intended as a planning aid for officers and raid leads.</li>
                  </ul>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
