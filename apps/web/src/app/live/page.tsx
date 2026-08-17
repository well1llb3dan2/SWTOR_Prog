import Link from "next/link";

const LIVE_SESSIONS = [
  {
    id: "session-01",
    title: "Operations watch",
    boss: "Current focus",
    status: "Standby",
    dps: "—",
    objective: "Maintaining awareness for the next deployment window.",
    readiness: "Prepared",
  },
  {
    id: "session-02",
    title: "Support window",
    boss: "Pending confirmation",
    status: "Ready",
    dps: "—",
    objective: "Keeping the next operation window coordinated.",
    readiness: "Awaiting update",
  },
];

export default function LivePage() {
  return (
    <main className="space-y-6">
      <header>
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline">
          ← Home
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Live Sessions</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          A current view of operations activity for the guild.
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 rounded border border-[var(--color-line)] bg-black/20 p-4 md:grid-cols-[1fr_0.6fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Active objective</p>
            <p className="mt-2 text-lg uppercase">Stay aligned with the next operation window</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Current attention remains on readiness, coordination, and the next deployment update.
            </p>
          </div>
          <div className="rounded border border-[var(--color-line)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Readiness</p>
            <p className="mt-2 text-2xl uppercase">2 active</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">The current slate is being monitored for the next update.</p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {LIVE_SESSIONS.map((session) => (
            <li key={session.id} className="rounded border border-[var(--color-line)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase">{session.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Current focus · {session.boss}</p>
                  <p className="mt-2 text-sm">{session.objective}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">{session.status}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{session.dps}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">{session.readiness}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
