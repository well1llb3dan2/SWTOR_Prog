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
  const bossFights = report.fights.filter((f) => f.boss?.isLikelyBoss === true);

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
        <h2 className="border-b border-[var(--color-line)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Pulls
        </h2>
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
                    {fight.encounter?.encounterName ?? fight.boss?.name ?? "Trash pull"}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {fight.deaths.length} death{fight.deaths.length === 1 ? "" : "s"}
                    {fight.boss !== null && fight.outcome !== "kill"
                      ? ` · boss at ${formatPercent(fight.boss.hpPercent, 1)}`
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
        Log {report.logFileName} · total damage{" "}
        {formatCompact(
          report.fights.reduce(
            (sum, fight) => sum + fight.actors.reduce((a, actor) => a + actor.damage, 0),
            0,
          ),
        )}
      </p>
    </main>
  );
}
