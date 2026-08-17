"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";

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

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch(`${API_URL}/api/me/stream/status`, { credentials: "include" });
        if (!response.ok) return;
        const body = (await response.json()) as {
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
      } catch {
        setStreamStatus(null);
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 5_000);

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

      <section className="panel rounded-md p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Reports</h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Completed pulls are archived automatically.
        </p>
        <div className="mt-4 flex flex-wrap gap-5">
          <Link href="/reports" className="text-sm text-[var(--color-republic)] hover:underline">
            Browse reports →
          </Link>
          <Link href="/calendar" className="text-sm text-[var(--color-republic)] hover:underline">
            Operation calendar →
          </Link>
          <Link href="/me" className="text-sm text-[var(--color-republic)] hover:underline">
            Your account →
          </Link>
        </div>
      </section>
    </main>
  );
}
