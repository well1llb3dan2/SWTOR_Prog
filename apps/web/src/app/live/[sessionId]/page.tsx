"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { BossBar } from "@/components/BossBar";
import { MeterTable } from "@/components/MeterTable";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCompact, formatDuration } from "@/lib/format";
import { METRICS, buildRows, raidTotal, type MetricKey } from "@/lib/meters";
import { useLiveSession } from "@/lib/useLiveSession";

export default function LivePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const { status, snapshot, history, error } = useLiveSession(sessionId);
  const [metric, setMetric] = useState<MetricKey>("dps");
  const visibleHistory = history.slice(0, 3);

  const rows = useMemo(
    () => (snapshot === null ? [] : buildRows(snapshot.actors, metric)),
    [snapshot, metric],
  );

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden px-2 py-2 text-[13px] sm:px-3 sm:py-3 md:px-4">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-line)] pb-2">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline sm:text-xs"
          >
            Infamous
          </Link>
          <h1 className="mt-1 text-lg uppercase sm:text-2xl">Live Combat</h1>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={status} />
          <p className="mt-1 hidden font-mono text-[10px] text-[var(--color-muted)] sm:block">
            {sessionId}
          </p>
        </div>
      </header>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        {error !== null ? (
          <p className="panel rounded-md px-3 py-2 text-[11px] text-red-300 sm:text-sm">
            {error}
          </p>
        ) : null}

        {snapshot !== null ? (
          <>
            <div className="grid flex-shrink-0 gap-2 md:grid-cols-[1.2fr_0.8fr]">
              {snapshot.boss !== null ? (
                <BossBar
                  name={snapshot.boss.name}
                  hp={snapshot.boss.hp}
                  maxHp={snapshot.boss.maxHp}
                  hpPercent={snapshot.boss.hpPercent}
                  isLikelyBoss={snapshot.boss.isLikelyBoss}
                  encounterName={snapshot.encounter?.encounterName ?? null}
                  className="h-full"
                />
              ) : (
                <div className="panel rounded-md px-3 py-3 text-sm text-[var(--color-muted)] sm:px-4 sm:py-4">
                  No boss identified for this pull.
                </div>
              )}

              <div className="panel rounded-md px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:text-xs">
                  Fight timer
                </p>
                <p className="tabular mt-1 text-2xl sm:text-3xl">{formatDuration(snapshot.elapsedMs)}</p>
                <p className="mt-1 line-clamp-2 text-[10px] text-[var(--color-muted)] sm:text-xs">
                  {snapshot.zone ?? "Unknown zone"}
                  {snapshot.difficulty === null ? "" : ` · ${snapshot.difficulty}`}
                  {snapshot.groupSize === null ? "" : ` · ${snapshot.groupSize}-player`}
                </p>
              </div>
            </div>

            <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-md">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-line)] px-3 py-2 sm:px-4 sm:py-3">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(METRICS) as MetricKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setMetric(key)}
                      className={`rounded px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition sm:px-3 sm:py-1.5 sm:text-xs ${
                        metric === key
                          ? "bg-[var(--color-republic)]/15 text-[var(--color-republic)]"
                          : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {METRICS[key].label}
                    </button>
                  ))}
                </div>
                <p className="tabular shrink-0 text-[10px] text-[var(--color-muted)] sm:text-xs">
                  Raid {formatCompact(raidTotal(rows))} {METRICS[metric].unit}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <MeterTable rows={rows} metric={metric} unit={METRICS[metric].unit} />
              </div>
            </section>
          </>
        ) : (
          <section className="panel rounded-md px-4 py-10 text-center sm:px-6 sm:py-16">
            <p className="text-sm text-[var(--color-muted)]">
              {status === "waiting"
                ? "Waiting for the next pull…"
                : status === "connecting"
                  ? "Connecting to the server…"
                  : "No live combat on this session."}
            </p>
          </section>
        )}

        {visibleHistory.length > 0 ? (
          <section className="panel shrink-0 overflow-hidden rounded-md">
            <h2 className="border-b border-[var(--color-line)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:px-4 sm:py-3 sm:text-xs">
              Recent pulls
            </h2>
            <ul className="divide-y divide-[var(--color-line)]">
              {visibleHistory.map((pull) => (
                <li
                  key={`${pull.reportCode}-${pull.fightId}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <span className="truncate">{pull.encounter?.encounterName ?? "Trash pull"}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-[10px] text-[var(--color-muted)] sm:text-xs">
                      {formatDuration(pull.durationMs)}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.12em] sm:text-xs"
                      style={{
                        color:
                          pull.outcome === "kill"
                            ? "var(--color-republic)"
                            : pull.outcome === "wipe"
                              ? "#f87171"
                              : "var(--color-muted)",
                      }}
                    >
                      {pull.outcome}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
