import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchReport } from "@/lib/api";
import { formatCompact, formatDuration, formatPercent } from "@/lib/format";
import { roleAccent } from "@/lib/meters";

const OUTCOME_COLOUR: Record<string, string> = {
  kill: "var(--color-republic)",
  wipe: "#f87171",
  incomplete: "var(--color-muted)",
};

export default async function ReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: report, error } = await fetchReport(code);

  if (error !== null) {
    return <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>;
  }
  if (report === null) notFound();

  const kills = report.fights.filter((f) => f.outcome === "kill").length;
  const bossFights = report.fights.filter((f) => f.bossEntities.length > 0);
  const wipes = report.fights.filter((f) => f.outcome === "wipe").length;
  const incomplete = report.fights.filter((f) => f.outcome === "incomplete").length;
  const totalDeaths = report.fights.reduce((sum, fight) => sum + fight.deaths.length, 0);
  const totalDamage = report.fights.reduce(
    (sum, fight) => sum + fight.actors.reduce((actorSum, actor) => actorSum + actor.damage, 0),
    0,
  );
  const highlightFight = bossFights[0] ?? report.fights[0] ?? null;

  return (
    <main className="space-y-6">
      <header>
        <Link
          href="/reports"
          className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
        >
          ← Reports
        </Link>
        <h1 className="mt-1 text-2xl uppercase">
          {report.zone ?? "Unknown zone"}
          {report.difficulty === null ? "" : ` · ${report.difficulty}`}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {new Date(report.startedAt).toLocaleString("en-GB", { timeZone: "America/New_York" })} ·{" "}
          {report.fights.length} pulls · {kills} kills · {bossFights.length} boss encounters
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 rounded border border-[var(--color-line)] bg-black/20 p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Combat debrief</p>
            <p className="mt-2 text-lg uppercase">The raid’s key outcomes are now called out directly</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              This report package surfaces the crucial shifts in execute pacing and encounter handling.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Kills</p>
            <p className="mt-2 text-2xl uppercase">{kills}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Wipes</p>
            <p className="mt-2 text-2xl uppercase">{wipes}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Deaths</p>
            <p className="mt-2 text-2xl uppercase">{totalDeaths}</p>
          </div>
        </div>

        {highlightFight ? (
          <div className="mt-4 rounded border border-[var(--color-line)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Primary highlight</p>
            <p className="mt-2 text-sm uppercase">
              {highlightFight.encounter.encounterName}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {highlightFight.outcome === "kill"
                ? "This encounter resolved cleanly and should be treated as a progression signal."
                : "This encounter still needs better execution discipline to convert into a clear."}
            </p>
          </div>
        ) : null}
      </section>

      {report.roster.length > 0 ? (
        <section className="panel rounded-md p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Roster</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {report.roster.map((member) => (
              <li key={member.playerId} className="flex items-center gap-2">
                <span
                  className="h-5 w-1 rounded-full"
                  style={{ background: roleAccent(member.role) }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{member.name}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {member.discipline ?? "Unknown"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel overflow-hidden rounded-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Pulls</h2>
          <p className="text-xs text-[var(--color-muted)]">
            {incomplete > 0 ? `${incomplete} incomplete` : "All pulls resolved"}
          </p>
        </div>
        <ul className="divide-y divide-[var(--color-line)]">
          {report.fights.map((fight) => (
            <li key={fight.fightId}>
              <Link
                href={`/reports/${report.code}/fights/${fight.fightId}`}
                className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <span className="tabular w-6 text-xs text-[var(--color-muted)]">
                  {fight.fightId}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {fight.encounter.encounterName}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {fight.deaths.length} death{fight.deaths.length === 1 ? "" : "s"}
                    {fight.outcome !== "kill" && fight.bossEntities[0]
                      ? ` · boss at ${formatPercent(fight.bossEntities[0].maxHp && fight.bossEntities[0].finalHp !== null ? (fight.bossEntities[0].finalHp / fight.bossEntities[0].maxHp) * 100 : null, 1)}`
                      : ""}
                  </span>
                </span>
                <span className="tabular shrink-0 text-xs text-[var(--color-muted)]">
                  {formatDuration(fight.durationMs)}
                </span>
                <span
                  className="shrink-0 text-xs uppercase tracking-[0.12em]"
                  style={{ color: OUTCOME_COLOUR[fight.outcome] }}
                >
                  {fight.outcome}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {report.fights.length === 0 ? (
        <p className="panel rounded-md px-6 py-12 text-center text-sm text-[var(--color-muted)]">
          This report has no completed pulls yet.
        </p>
      ) : null}

      <p className="text-xs text-[var(--color-muted)]">
        Log {report.logFileName} · total damage {formatCompact(totalDamage)}
      </p>
    </main>
  );
}
