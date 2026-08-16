import { formatCompact, formatPercent } from "@/lib/format";

interface Props {
  name: string;
  hpPercent: number | null;
  hp: number | null;
  maxHp: number;
  encounterName: string | null;
  isLikelyBoss: boolean;
}

export function BossBar({ name, hpPercent, hp, maxHp, encounterName, isLikelyBoss }: Props) {
  const percent = hpPercent ?? 100;

  return (
    <div className="panel rounded-md px-5 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg uppercase">{encounterName ?? name}</h2>
          {encounterName !== null && encounterName !== name ? (
            <p className="truncate text-xs text-[var(--color-muted)]">{name}</p>
          ) : null}
        </div>
        <p className="tabular shrink-0 text-lg text-[var(--color-gold)]">
          {formatPercent(hpPercent, 1)}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            background: isLikelyBoss
              ? "linear-gradient(90deg, #d4af37, #f0d67a)"
              : "linear-gradient(90deg, #4ade80, #a7f3d0)",
          }}
        />
      </div>

      <p className="mt-2 tabular text-xs text-[var(--color-muted)]">
        {hp === null ? "—" : formatCompact(hp)} / {formatCompact(maxHp)}
        {isLikelyBoss ? "" : " · trash"}
      </p>
    </div>
  );
}
