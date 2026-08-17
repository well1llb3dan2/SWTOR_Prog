"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";
import { CommandDeck } from "@/components/commandDeck";
import { MissionTimeline } from "@/components/missionTimeline";

const API_URL = API_BASE_URL;

export default function HomePage() {
  const router = useRouter();
  const [streamStatus, setStreamStatus] = useState<{
    active: boolean;
    sessionId?: string | null;
    reportCode?: string | null;
    sessions?: Array<{
      sessionId: string;
      reportCode?: string | null;
      logFileName?: string | null;
      eventsReceived?: number;
      lastSeenAt?: number;
    }>;
  } | null>(null);
  const [opsSummary, setOpsSummary] = useState<{
    nextTitle?: string | null;
    nextTime?: string | null;
    upcomingCount: number;
    totalSignups: number;
  } | null>(null);
  const [reportSummary, setReportSummary] = useState<{
    latestTitle?: string | null;
    killCount: number;
    fightCount: number;
  } | null>(null);
  const [me, setMe] = useState<{ isModerator?: boolean } | null>(null);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [streamResponse, operationsResponse, reportsResponse, meResponse] = await Promise.all([
          fetch(`${API_URL}/api/me/stream/status`, { credentials: "include" }),
          fetch(`${API_URL}/api/operations`, { credentials: "include" }),
          fetch(`${API_URL}/api/reports`, { credentials: "include" }),
          fetch(`${API_URL}/api/me`, { credentials: "include" }),
        ]);

        if (streamResponse.ok) {
          const body = (await streamResponse.json()) as {
            active: boolean;
            sessionId?: string | null;
            reportCode?: string | null;
            sessions?: Array<{
              sessionId: string;
              reportCode?: string | null;
              logFileName?: string | null;
              eventsReceived?: number;
              lastSeenAt?: number;
            }>;
          };
          setStreamStatus(body);
        } else {
          setStreamStatus(null);
        }

        if (operationsResponse.ok) {
          const operations = (await operationsResponse.json()) as Array<{
            title: string;
            scheduledFor: string;
            signups?: Array<{ discordUserId: string }>;
          }>;
          const upcoming = [...operations].sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
          const next = upcoming[0];
          setOpsSummary({
            nextTitle: next?.title ?? null,
            nextTime: next ? new Date(next.scheduledFor).toLocaleString("en-GB", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) : null,
            upcomingCount: upcoming.length,
            totalSignups: upcoming.reduce((sum, event) => sum + (event.signups?.length ?? 0), 0),
          });
        } else {
          setOpsSummary(null);
        }

        if (reportsResponse.ok) {
          const reports = (await reportsResponse.json()) as Array<{
            zone?: string | null;
            fightCount?: number;
            killCount?: number;
          }>;
          const latest = reports[0];
          setReportSummary({
            latestTitle: latest?.zone ?? null,
            killCount: latest?.killCount ?? 0,
            fightCount: latest?.fightCount ?? 0,
          });
        } else {
          setReportSummary(null);
        }

        if (meResponse.ok) {
          const meBody = (await meResponse.json()) as { user?: { isModerator?: boolean } | null };
          setMe(meBody.user ?? null);
        } else {
          setMe(null);
        }
      } catch {
        setStreamStatus(null);
        setOpsSummary(null);
        setReportSummary(null);
        setMe(null);
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 10_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">Infamous</p>
        <h1 className="mt-2 text-3xl uppercase">Combat Analytics</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
          Start the desktop streamer and choose the live session below to watch the raid live.
        </p>
      </header>

      {streamStatus?.active ? (
        <section className="panel rounded-md border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-republic)]">
            Live stream connected
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink)]">
            A desktop streamer is currently connected to the portal.
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Session {streamStatus.sessionId ?? "unknown"} · Report {streamStatus.reportCode ?? "unknown"}
          </p>
        </section>
      ) : null}

      <section className="panel rounded-md p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Watch your live session
        </h2>
        {streamStatus?.active && (streamStatus.sessions?.length ?? 0) > 0 ? (
          <div className="mt-4 space-y-2">
            {streamStatus.sessions?.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => router.push(`/live/${encodeURIComponent(session.sessionId)}`)}
                className="flex w-full items-center justify-between rounded border border-[var(--color-line)] bg-black/40 px-4 py-3 text-left text-sm transition hover:border-[var(--color-republic)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[var(--color-ink)]">{session.sessionId}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--color-muted)]">
                    {session.reportCode ?? "Live report pending"}
                  </span>
                </span>
                <span className="ml-3 text-xs uppercase tracking-[0.15em] text-[var(--color-gold)]">
                  Watch
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Your desktop streamer is not currently connected to the portal.
          </p>
        )}
      </section>

      <section className="rounded-md border border-[var(--color-line)] bg-black/25 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Current objective</p>
            <p className="mt-1 text-lg uppercase">Protect the execute window and convert clean clears</p>
          </div>
          <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
            Priority: burst timing
          </span>
        </div>
      </section>

      <CommandDeck />
      <MissionTimeline />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel rounded-md p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Next mission</p>
          <p className="mt-2 text-lg uppercase">{opsSummary?.nextTitle ?? "No mission queued"}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {opsSummary?.nextTime ?? "Signups will appear as soon as operations are created."}
          </p>
        </div>
        <div className="panel rounded-md p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Upcoming operations</p>
          <p className="mt-2 text-2xl uppercase">{opsSummary?.upcomingCount ?? 0}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{opsSummary ? `${opsSummary.totalSignups} responses logged across the current queue.` : "No operations available yet."}</p>
        </div>
        <div className="panel rounded-md p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Recent report</p>
          <p className="mt-2 text-lg uppercase">{reportSummary?.latestTitle ?? "No report yet"}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {reportSummary ? `${reportSummary.killCount}/${reportSummary.fightCount} kills` : "Stream a mission to create the first report."}
          </p>
        </div>
      </section>

      {me?.isModerator ? (
        <section className="rounded-md border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-republic)]">Officer command desk</p>
              <p className="mt-1 text-lg uppercase">Keep roster planning and mission coordination in sync</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/operations/builder" className="rounded border border-[var(--color-republic)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
                Open builder
              </Link>
              <Link href="/calendar" className="rounded border border-[var(--color-line)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Review calendar
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel rounded-md p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Mission lanes</h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Each lane below leads to a focused part of the operations workflow.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/reports" className="rounded border border-[var(--color-line)] p-3 transition hover:border-[var(--color-republic)]">
            <p className="text-sm uppercase">Reports</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Review archived clears and wipes.</p>
          </Link>
          <Link href="/progression" className="rounded border border-[var(--color-line)] p-3 transition hover:border-[var(--color-republic)]">
            <p className="text-sm uppercase">Progression</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Track boss momentum and encounter focus.</p>
          </Link>
          <Link href="/operations" className="rounded border border-[var(--color-line)] p-3 transition hover:border-[var(--color-republic)]">
            <p className="text-sm uppercase">Raid builder</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Align the next roster and utility plan.</p>
          </Link>
          <Link href="/calendar" className="rounded border border-[var(--color-line)] p-3 transition hover:border-[var(--color-republic)]">
            <p className="text-sm uppercase">Calendar</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Review upcoming missions and responses.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
