import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionTimeline } from "@/components/missionTimeline";
import { fetchReports } from "@/lib/api";

export default async function ProgressionPage() {
  const { data: reports, error } = await fetchReports(50);

  if (error !== null) {
    return <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>;
  }
  if (reports === null) notFound();

  const bossFights = reports.flatMap((report) =>
    report.fights.filter((fight) => fight.boss?.isLikelyBoss === true),
  );

  const encounterSummary = new Map<string, { name: string; kills: number; wipes: number }>();
  for (const fight of bossFights) {
    const key = fight.encounter?.encounterId ?? fight.boss?.name ?? "unknown";
    const label = fight.encounter?.encounterName ?? fight.boss?.name ?? "Unknown boss";
    const current = encounterSummary.get(key) ?? { name: label, kills: 0, wipes: 0 };
    if (fight.outcome === "kill") current.kills += 1;
    if (fight.outcome === "wipe") current.wipes += 1;
    encounterSummary.set(key, current);
  }

  const ranked = [...encounterSummary.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name));

  return (
    <main className="space-y-6">
      <header>
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Progression</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Track boss clears, wipes, and encounter momentum from the live combat archive.
        </p>
      </header>

      <MissionTimeline />

      <section className="panel rounded-md p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Encounter matrix
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              The current progression trend favors controlled execute windows over chaotic late pulls.
            </p>
          </div>
          <Link href="/analytics" className="text-xs uppercase tracking-[0.12em] text-[var(--color-republic)] hover:underline">
            Open analytics →
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {ranked.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center justify-between rounded border border-[var(--color-line)] px-3 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">{entry.name}</span>
                <span className="mt-1 block text-xs text-[var(--color-muted)]">
                  {entry.kills} clears · {entry.wipes} wipes
                </span>
              </span>
              <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
                {entry.kills > 0 ? "Active" : "Observed"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
