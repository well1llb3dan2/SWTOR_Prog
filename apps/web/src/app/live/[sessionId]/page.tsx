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

  const rows = useMemo(
    () => (snapshot === null ? [] : buildRows(snapshot.actors, metric)),
    [snapshot, metric],
  );

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
          >
            Infamous
          </Link>
          <h1 className="mt-1 text-2xl uppercase">Live Combat</h1>
        </div>
        <div className="text-right">
          <StatusBadge status={status} />
          <p className="mt-1 font-mono text-[11px] text-[var(--color-muted)]">{sessionId}</p>
        </div>
      </header>

      {error !== null ? (
        <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      {snapshot !== null ? (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            {snapshot.boss !== null ? (
              <BossBar
                name={snapshot.boss.name}
                hp={snapshot.boss.hp}
                maxHp={snapshot.boss.maxHp}
                hpPercent={snapshot.boss.hpPercent}
                isLikelyBoss={snapshot.boss.isLikelyBoss}
                encounterName={snapshot.encounter?.encounterName ?? null}
              />
            ) : (
              <div className="panel rounded-md px-5 py-4 text-sm text-[var(--color-muted)]">
                No boss identified for this pull.
              </div>
            )}

            <div className="panel rounded-md px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Fight timer
              </p>
              <p className="tabular mt-1 text-3xl">{formatDuration(snapshot.elapsedMs)}</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {snapshot.zone ?? "Unknown zone"}
                {snapshot.difficulty === null ? "" : ` · ${snapshot.difficulty}`}
                {snapshot.groupSize === null ? "" : ` · ${snapshot.groupSize}-player`}
              </p>
            </div>
          </div>

          <section className="panel overflow-hidden rounded-md">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
              <div className="flex gap-1">
                {(Object.keys(METRICS) as MetricKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setMetric(key)}
                    className={`rounded px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                      metric === key
                        ? "bg-[var(--color-republic)]/15 text-[var(--color-republic)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {METRICS[key].label}
                  </button>
                ))}
              </div>
              <p className="tabular text-xs text-[var(--color-muted)]">
                Raid {formatCompact(raidTotal(rows))} {METRICS[metric].unit}
              </p>
            </div>
            <MeterTable rows={rows} metric={metric} unit={METRICS[metric].unit} />
          </section>
        </>
      ) : (
        <section className="panel rounded-md px-6 py-16 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            {status === "waiting"
              ? "Waiting for the next pull…"
              : status === "connecting"
                ? "Connecting to the server…"
                : "No live combat on this session."}
          </p>
        </section>
      )}

      {history.length > 0 ? (
        <section className="panel overflow-hidden rounded-md">
          <h2 className="border-b border-[var(--color-line)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
            This session
          </h2>
          <ul className="divide-y divide-[var(--color-line)]">
            {history.map((pull) => (
              <li
                key={`${pull.reportCode}-${pull.fightId}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="truncate">{pull.encounter?.encounterName ?? "Trash pull"}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tabular text-xs text-[var(--color-muted)]">
                    {formatDuration(pull.durationMs)}
                  </span>
                  <span
                    className="text-xs uppercase tracking-[0.12em]"
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
    </main>
  );
}
