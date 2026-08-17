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

      {meaningfulReports.length === 0 && error === null ? (
        <p className="panel rounded-md px-6 py-16 text-center text-sm text-[var(--color-muted)]">
          No reports yet. Stream a raid from the desktop client to create one.
        </p>
      ) : (
        <ul className="panel divide-y divide-[var(--color-line)] overflow-hidden rounded-md">
          {meaningfulReports.map((report) => (
            <li key={report.code}>
              <Link
                href={`/reports/${report.code}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-white/[0.03]"
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
                <p className="tabular shrink-0 text-xs text-[var(--color-muted)]">
                  {report.killCount}/{report.fightCount} kills
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
