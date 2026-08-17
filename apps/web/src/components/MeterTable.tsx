import { formatCompact, formatPercent } from "@/lib/format";
import { roleAccent, type MeterRow, type MetricKey } from "@/lib/meters";

interface Props {
  rows: MeterRow[];
  metric: MetricKey;
  unit: string;
}

export function MeterTable({ rows, metric, unit }: Props) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
        No {unit.toLowerCase()} recorded yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-[var(--color-line)]">
      {rows.map((row, index) => (
        <li key={row.actorId} className="relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 opacity-20 transition-[width] duration-500"
            style={{ width: `${row.share * 100}%`, background: roleAccent(row.role) }}
            aria-hidden
          />
          <div className="relative flex items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2.5">
            <span className="w-4 text-[10px] text-[var(--color-muted)] tabular sm:w-5 sm:text-xs">
              {index + 1}
            </span>
            <span
              className="h-5 w-1 rounded-full sm:h-6"
              style={{ background: roleAccent(row.role) }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium sm:text-sm">{row.name}</p>
              <p className="truncate text-[10px] text-[var(--color-muted)] sm:text-xs">
                {row.discipline ?? "Unknown discipline"}
                {row.deaths > 0 ? ` · ${row.deaths} death${row.deaths === 1 ? "" : "s"}` : ""}
                {metric === "hps" && row.overhealPercent > 0
                  ? ` · ${formatPercent(row.overhealPercent, 0)} overheal`
                  : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular text-xs font-semibold sm:text-sm">{formatCompact(row.rate)}</p>
              <p className="tabular text-[10px] text-[var(--color-muted)] sm:text-xs">
                {formatCompact(row.total)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
