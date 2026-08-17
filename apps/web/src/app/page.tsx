"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";

const API_URL = API_BASE_URL;

export default function HomePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [streamStatus, setStreamStatus] = useState<{
    active: boolean;
    sessionId?: string;
    reportCode?: string;
  } | null>(null);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch(`${API_URL}/api/me/stream/status`, { credentials: "include" });
        if (!response.ok) return;
        const body = (await response.json()) as { active: boolean; sessionId?: string; reportCode?: string };
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
          Start the desktop streamer, then paste its session id below to watch the raid live.
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
          Watch a live session
        </h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = sessionId.trim();
            if (trimmed.length > 0) router.push(`/live/${encodeURIComponent(trimmed)}`);
          }}
        >
          <input
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            placeholder="Session id from the desktop client"
            className="flex-1 rounded border border-[var(--color-line)] bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--color-republic)]"
          />
          <button
            type="submit"
            className="rounded border border-[var(--color-gold)] px-5 py-2 text-xs uppercase tracking-[0.15em] text-[var(--color-gold)] transition hover:bg-[var(--color-gold)]/10"
          >
            Watch
          </button>
        </form>
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
