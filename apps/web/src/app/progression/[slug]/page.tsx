import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchReports } from "@/lib/api";

export default async function ProgressionEncounterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: reports, error } = await fetchReports(50);

  if (error !== null) {
    return <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>;
  }
  if (reports === null) notFound();

  const fights = reports
    .flatMap((report) => report.fights)
    .filter((fight): fight is typeof fight & { encounter: NonNullable<typeof fight.encounter> } =>
      fight.encounter?.encounterId === slug)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  if (fights.length === 0) notFound();

  const bossName = fights[0]?.encounter.encounterName ?? "Encounter";
  const clears = fights.filter((fight) => fight.outcome === "kill").length;
  const wipes = fights.filter((fight) => fight.outcome === "wipe").length;
  const averageDuration = fights.length > 0
    ? Math.round(fights.reduce((sum, fight) => sum + (fight.durationMs ?? 0), 0) / fights.length)
    : 0;
  const totalDeaths = fights.reduce((sum, fight) => sum + fight.deaths.length, 0);

  return (
    <main className="space-y-6">
      <header>
        <Link
          href="/progression"
          className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
        >
          ← Progression
        </Link>
        <h1 className="mt-1 text-2xl uppercase">{bossName}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Historical clears and wipes for this encounter from the report archive.
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 rounded border border-[var(--color-line)] bg-black/20 p-4 md:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Clears</p>
            <p className="mt-2 text-2xl uppercase">{clears}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Wipes</p>
            <p className="mt-2 text-2xl uppercase">{wipes}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Avg. duration</p>
            <p className="mt-2 text-2xl uppercase">{averageDuration}ms</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Deaths</p>
            <p className="mt-2 text-2xl uppercase">{totalDeaths}</p>
          </div>
        </div>

        <div className="mt-4 rounded border border-[var(--color-line)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Current readout</p>
          <p className="mt-2 text-sm">
            {clears > wipes
              ? "The encounter is trending upward; execution is becoming more consistent."
              : "The encounter still needs cleaner burst-window discipline to turn wipes into clears."}
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {fights.map((fight) => (
            <li key={`${fight.fightId}-${fight.zone ?? "zone"}`} className="rounded border border-[var(--color-line)] px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm uppercase">{fight.outcome === "kill" ? "Clear" : "Wipe"}</span>
                <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
                  {fight.outcome}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {fight.zone ?? "Unknown zone"} · {fight.durationMs}ms · {fight.deaths.length} deaths
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
