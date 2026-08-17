import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchReports } from "@/lib/api";

const MISSION_PRIORITIES = [
  { title: "Primary focus", detail: "Maintaining readiness for the next operation window." },
  { title: "Current note", detail: "Support and timing are being coordinated around available attendance." },
  { title: "Status", detail: "Roster adjustments remain flexible as confirmations come in." },
];

const READINESS_CHECKLIST = [
  { label: "Support coverage", value: "Tracked" },
  { label: "Roster balance", value: "Reviewing" },
  { label: "Timing window", value: "Pending" },
];

export default async function OperationsPage() {
  const { data: reports, error } = await fetchReports(10);

  if (error !== null) {
    return <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>;
  }
  if (reports === null) notFound();

  return (
    <main className="space-y-6">
      <header>
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline">
          ← Home
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Raid Builder</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Planning space for the next operation window.
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Mission brief</h2>
            <p className="mt-1 text-sm">The next operation window is being coordinated around current availability and priorities.</p>
          </div>
          <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
            Priority update
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded border border-[var(--color-line)] p-4">
            <ul className="space-y-3">
              {MISSION_PRIORITIES.map((priority) => (
                <li key={priority.title} className="border-b border-[var(--color-line)] pb-3 last:border-b-0 last:pb-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{priority.title}</p>
                  <p className="mt-1 text-sm">{priority.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-[var(--color-line)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Readiness board</p>
            <ul className="mt-3 space-y-2">
              {READINESS_CHECKLIST.map((item) => (
                <li key={item.label} className="flex items-center justify-between rounded bg-black/20 px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-republic)]">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel rounded-md p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Roster status</h2>
            <p className="mt-1 text-sm">Roster details will be updated here as the next assignment is finalized.</p>
          </div>
          <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
            Pending update
          </span>
        </div>
      </section>

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Notes</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
          <li>• Coordination remains the focus for the next operation period.</li>
          <li>• Support coverage and timing stay under review.</li>
          <li>• Updates will be reflected here as planning progresses.</li>
        </ul>
      </section>

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Recent reports</h2>
        <ul className="mt-3 space-y-2">
          {reports.slice(0, 4).map((report) => (
            <li key={report.code} className="flex items-center justify-between rounded border border-[var(--color-line)] px-3 py-3 text-sm">
              <span>{report.zone ?? "Unknown zone"}</span>
              <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {report.fights.filter((fight) => fight.outcome === "kill").length}/{report.fights.length} kills
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
