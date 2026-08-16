import type { DeathAudit } from "@/lib/api";
import { formatCompact, formatPercent } from "@/lib/format";

const KIND_COLOUR: Record<string, string> = {
  damage: "#f87171",
  heal: "var(--color-republic)",
  defensive: "#60a5fa",
  defensiveEnd: "var(--color-muted)",
  death: "var(--color-gold)",
};

function label(entry: DeathAudit["entries"][number]): string {
  switch (entry.kind) {
    case "damage":
      return entry.ability ?? "Damage";
    case "heal":
      return entry.ability ?? "Heal";
    case "defensive":
      return `${entry.ability} up`;
    case "defensiveEnd":
      return `${entry.ability} down`;
    default:
      return "Death";
  }
}

export function DeathTimeline({ audit }: { audit: DeathAudit }) {
  return (
    <article className="panel overflow-hidden rounded-md">
      <header className="border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm uppercase tracking-[0.12em]">{audit.name}</h3>
          <p className="text-xs text-[var(--color-muted)]">
            {(audit.windowMs / 1000).toFixed(0)}s before death
          </p>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {audit.killingBlow === null
            ? "No killing blow recorded"
            : `Killed by ${audit.killingBlow.ability ?? "unknown"} from ${
                audit.killingBlow.source ?? "unknown"
              } for ${formatCompact(audit.killingBlow.amount)}`}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Damage taken
            </dt>
            <dd className="tabular text-sm">{formatCompact(audit.damageTaken)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Healing received
            </dt>
            <dd className="tabular text-sm">{formatCompact(audit.healingReceived)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Largest hit
            </dt>
            <dd className="tabular text-sm">{formatCompact(audit.largestHit)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Defensives up
            </dt>
            <dd className="text-sm">
              {audit.defensivesActive.length === 0 ? (
                <span className="text-[#f87171]">none</span>
              ) : (
                audit.defensivesActive.join(", ")
              )}
            </dd>
          </div>
        </dl>
      </header>

      <ol className="max-h-96 divide-y divide-[var(--color-line)] overflow-y-auto">
        {audit.entries.map((entry, index) => (
          <li
            key={`${entry.offsetMs}-${index}`}
            className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-4 py-1.5 text-xs"
          >
            <span className="tabular text-[var(--color-muted)]">
              -{(entry.offsetMs / 1000).toFixed(1)}s
            </span>
            <span className="min-w-0 truncate" style={{ color: KIND_COLOUR[entry.kind] }}>
              {label(entry)}
              {entry.source !== null && entry.kind !== "death" ? (
                <span className="text-[var(--color-muted)]"> · {entry.source}</span>
              ) : null}
              {entry.mitigation !== null ? (
                <span className="text-[var(--color-muted)]"> · {entry.mitigation}</span>
              ) : null}
            </span>
            <span className="tabular text-right">
              {entry.kind === "damage" || entry.kind === "heal" ? (
                <>
                  <span style={{ color: KIND_COLOUR[entry.kind] }}>
                    {entry.kind === "damage" ? "-" : "+"}
                    {formatCompact(entry.effective)}
                    {entry.critical ? "*" : ""}
                  </span>
                  {entry.hpPercent !== null ? (
                    <span className="ml-2 text-[var(--color-muted)]">
                      {formatPercent(entry.hpPercent, 0)}
                    </span>
                  ) : null}
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}
