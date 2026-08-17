import { formatCompact, formatPercent } from "@/lib/format";

interface Props {
  name: string;
  hpPercent: number | null;
  hp: number | null;
  maxHp: number;
  encounterName: string | null;
  isLikelyBoss: boolean;
  className?: string;
}

export function BossBar({
  name,
  hpPercent,
  hp,
  maxHp,
  encounterName,
  isLikelyBoss,
  className,
}: Props) {
  const percent = hpPercent ?? 100;

  return (
    <div className={`panel rounded-md px-3 py-3 sm:px-4 sm:py-4 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm uppercase sm:text-base">{encounterName ?? name}</h2>
          {encounterName !== null && encounterName !== name ? (
            <p className="truncate text-[10px] text-[var(--color-muted)] sm:text-xs">{name}</p>
          ) : null}
        </div>
        <p className="tabular shrink-0 text-sm text-[var(--color-gold)] sm:text-lg">
          {formatPercent(hpPercent, 1)}
        </p>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50 sm:mt-3">
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

      <p className="mt-2 tabular text-[10px] text-[var(--color-muted)] sm:text-xs">
        {hp === null ? "—" : formatCompact(hp)} / {formatCompact(maxHp)}
        {isLikelyBoss ? "" : " · trash"}
      </p>
    </div>
  );
}
