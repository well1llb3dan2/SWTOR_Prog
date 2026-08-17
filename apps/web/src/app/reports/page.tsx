import Link from "next/link";
import { API_BASE_URL } from "@/lib/apiBase";
import { formatDuration } from "@/lib/format";

interface ReportSummary {
  code: string;
  logFileName: string;
  startedAt: string;
  endedAt: string | null;
  zone: string | null;
  difficulty: string | null;
  groupSize: number | null;
  fightCount: number;
  killCount: number;
}

const API_URL = API_BASE_URL;

async function loadReports(): Promise<{ reports: ReportSummary[]; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/reports`, { cache: "no-store" });
    if (!response.ok) return { reports: [], error: `API returned ${response.status}` };
    return { reports: (await response.json()) as ReportSummary[], error: null };
  } catch {
    return { reports: [], error: "Could not reach the API" };
  }
}

export default async function ReportsPage() {
  const { reports, error } = await loadReports();
  const meaningfulReports = reports.filter((report) => report.killCount > 0);
  const totalKills = meaningfulReports.reduce((sum, report) => sum + report.killCount, 0);
  const latestReport = meaningfulReports[0] ?? null;

  return (
    <main className="space-y-6">
      <header>
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline"
        >
          Infamous
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Reports</h1>
      </header>

      {error !== null ? (
        <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 rounded border border-[var(--color-line)] bg-black/20 p-4 md:grid-cols-[1.2fr_0.6fr_0.6fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Archive summary</p>
            <p className="mt-2 text-lg uppercase">Mission history is now organized by outcome</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              The report archive keeps a running record of the encounters that moved the guild forward.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Total kills</p>
            <p className="mt-2 text-2xl uppercase">{totalKills}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Latest report</p>
            {latestReport ? (
              <>
                <p className="mt-2 text-sm uppercase">{latestReport.zone ?? "Unknown zone"}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {latestReport.killCount}/{latestReport.fightCount} kills
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-muted)]">No reports yet</p>
            )}
          </div>
        </div>
      </section>

      {meaningfulReports.length === 0 && error === null ? (
        <p className="panel rounded-md px-6 py-16 text-center text-sm text-[var(--color-muted)]">
          No reports yet. Stream a raid from the desktop client to create one.
        </p>
      ) : (
        <ul className="space-y-3">
          {meaningfulReports.map((report) => (
            <li key={report.code} className="panel overflow-hidden rounded-md">
              <Link
                href={`/reports/${report.code}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {report.zone ?? "Unknown zone"}
                    {report.difficulty === null ? "" : ` · ${report.difficulty}`}
                    {report.groupSize === null ? "" : ` · ${report.groupSize}-player`}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {new Date(report.startedAt).toLocaleString("en-GB", {
                      timeZone: "America/New_York",
                    })}
                    {report.endedAt === null
                      ? ""
                      : ` · ${formatDuration(
                          new Date(report.endedAt).getTime() - new Date(report.startedAt).getTime(),
                        )}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[var(--color-gold)]/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-gold)]">
                    {report.killCount}/{report.fightCount} kills
                  </span>
                  <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-republic)]">
                    View report
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
