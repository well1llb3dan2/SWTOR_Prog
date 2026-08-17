import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchReports } from "@/lib/api";

const DEFAULT_ROSTER = [
  { role: "tank", name: "Vanguard", discipline: "Plasmatech" },
  { role: "tank", name: "Assassin", discipline: "Darkness" },
  { role: "healer", name: "Doc", discipline: "Medicine" },
  { role: "healer", name: "Mako", discipline: "Bodyguard" },
  { role: "dps", name: "Gault", discipline: "Virulence" },
  { role: "dps", name: "Torian", discipline: "Annihilation" },
  { role: "dps", name: "Blizz", discipline: "Pyrotech" },
  { role: "dps", name: "Nox", discipline: "Hatred" },
];

const MISSION_PRIORITIES = [
  { title: "Primary objective", detail: "Protect the late-phase burst window with disciplined tank swaps and cleanse timing." },
  { title: "Risk", detail: "The progression spike is likely to create a scrubline around the final add wave." },
  { title: "Support plan", detail: "Anchor the roster around a stable 2/2/4 core and preserve one bench slot for utility." },
];

const READINESS_CHECKLIST = [
  { label: "Force vulnerability coverage", value: "Locked" },
  { label: "Stealth rez availability", value: "Ready" },
  { label: "Burst healing window", value: "Prepared" },
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
          A mechanics-first roster composer for the next phase of the Infamous ops workflow.
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Mission brief</h2>
            <p className="mt-1 text-sm">The next operation is being treated as a progression test with a stable core and a flexible utility bench.</p>
          </div>
          <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
            Priority: NiM prep
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
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Suggested roster</h2>
            <p className="mt-1 text-sm">Prepared for a 2-tank / 2-healer / 4-dps composition.</p>
          </div>
          <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
            Synergy score 94/100
          </span>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {DEFAULT_ROSTER.map((member, index) => (
            <li key={`${member.name}-${index}`} className="rounded border border-[var(--color-line)] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm uppercase">{member.name}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {member.role}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{member.discipline}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Mechanics notes</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
          <li>• Force vulnerability coverage is present for the primary boss phase.</li>
          <li>• Stealth rez and push utility are assigned to the core comp.</li>
          <li>• Healing coverage prioritises the late-phase burst window.</li>
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
