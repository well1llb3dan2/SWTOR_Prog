import Link from "next/link";
import { notFound } from "next/navigation";
import { DeathTimeline } from "@/components/DeathTimeline";
import { MeterTable } from "@/components/MeterTable";
import { fetchDeaths, fetchReport } from "@/lib/api";
import { formatCompact, formatDuration, formatPercent } from "@/lib/format";
import { METRICS, buildRows, type MetricKey } from "@/lib/meters";

export default async function FightPage({
  params,
}: {
  params: Promise<{ code: string; fightId: string }>;
}) {
  const { code, fightId } = await params;
  const id = Number(fightId);

  const [{ data: report, error }, { data: audits }] = await Promise.all([
    fetchReport(code),
    fetchDeaths(code, id),
  ]);

  if (error !== null) {
    return <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>;
  }
  if (report === null) notFound();

  const fight = report.fights.find((f) => f.fightId === id);
  if (fight === undefined) notFound();

  const actors = fight.players.map((actor) => ({
    ...actor,
    totalDamage: actor.damage,
    totalHealing: actor.healing,
    totalDamageTaken: actor.damageTaken,
  }));
  const totalDamage = fight.players.reduce((sum, actor) => sum + actor.damage, 0);
  const totalHealing = fight.players.reduce((sum, actor) => sum + actor.healing, 0);
  const maxDamage = fight.players.reduce((max, actor) => Math.max(max, actor.damage), 0);

  return (
    <main className="space-y-6">
      <header>
        <Link
          href={`/reports/${code}`}
          className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
        >
          ← {report.zone ?? "Report"}
        </Link>
        <h1 className="mt-1 text-2xl uppercase">
          {fight.encounter.encounterName}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Pull {fight.fightId} · {formatDuration(fight.durationMs)} · {fight.outcome}
          {fight.outcome !== "kill" && fight.bossEntities[0]
            ? ` · boss ended at ${formatPercent(fight.bossEntities[0].maxHp && fight.bossEntities[0].finalHp !== null ? (fight.bossEntities[0].finalHp / fight.bossEntities[0].maxHp) * 100 : null, 1)}`
            : ""}
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 rounded border border-[var(--color-line)] bg-black/20 p-4 md:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Fight summary</p>
            <p className="mt-2 text-lg uppercase">This pull should be read as a tactical debrief</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              The key question is whether the raid held tempo through the boss mechanics and kept the late window stable.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Total damage</p>
            <p className="mt-2 text-2xl uppercase">{formatCompact(totalDamage)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Top output</p>
            <p className="mt-2 text-2xl uppercase">{formatCompact(maxDamage)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Highest single actor contribution</p>
          </div>
        </div>

        {fight.encounter !== null && fight.encounter.phases.length > 0 ? (
          <div className="mt-4 rounded border border-[var(--color-line)] p-4">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {fight.encounter.operationName} · phases
            </h2>
            <ol className="mt-3 space-y-2">
              {fight.encounter.phases.map((phase) => (
                <li key={phase.order} className="flex gap-3 text-sm">
                  <span className="tabular text-[var(--color-muted)]">{phase.order}</span>
                  <span className="min-w-0">
                    <span className="block">{phase.name}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {phase.style} · {phase.trigger}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(METRICS) as MetricKey[]).map((metric) => (
          <section key={metric} className="panel overflow-hidden rounded-md">
            <h2 className="border-b border-[var(--color-line)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {METRICS[metric].label}
            </h2>
            <MeterTable
              rows={buildRows(actors, metric)}
              metric={metric}
              unit={METRICS[metric].unit}
            />
          </section>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Death log · {fight.deaths.length} death{fight.deaths.length === 1 ? "" : "s"}
          </h2>
          <p className="text-xs text-[var(--color-muted)]">Total healing {formatCompact(totalHealing)}</p>
        </div>

        {audits === null ? (
          <p className="panel rounded-md px-6 py-10 text-center text-sm text-[var(--color-muted)]">
            Raw events for this pull are no longer stored, so the death timeline is unavailable.
          </p>
        ) : audits.deaths.length === 0 ? (
          <p className="panel rounded-md px-6 py-10 text-center text-sm text-[var(--color-muted)]">
            Nobody died. {formatCompact(fight.actors.reduce((s, a) => s + a.damage, 0))} damage, no
            casualties.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {audits.deaths.map((audit, index) => (
              <DeathTimeline key={`${audit.playerId}-${index}`} audit={audit} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
