export const METRICS = {
  dps: { label: "Damage", unit: "DPS" },
  hps: { label: "Healing", unit: "HPS" },
  dtps: { label: "Damage taken", unit: "DTPS" },
} as const;

export type MetricKey = keyof typeof METRICS;

export interface MeterActor {
  actorId: string;
  name: string;
  role: "tank" | "healer" | "dps" | null;
  discipline: string | null;
  dps: number;
  hps: number;
  dtps: number;
  totalDamage: number;
  totalHealing: number;
  totalDamageTaken: number;
  overhealPercent: number;
  deaths: number;
}

export interface MeterRow {
  actorId: string;
  name: string;
  role: MeterActor["role"];
  discipline: string | null;
  rate: number;
  total: number;
  /** Fraction of the leader's rate, for bar width. */
  share: number;
  overhealPercent: number;
  deaths: number;
}

const TOTALS: Record<MetricKey, keyof MeterActor> = {
  dps: "totalDamage",
  hps: "totalHealing",
  dtps: "totalDamageTaken",
};

/**
 * Ranks actors for one metric.
 *
 * Contributors of zero are dropped rather than shown at the bottom: on a
 * healing meter every damage dealer would otherwise pad the table with noise.
 */
export function buildRows(actors: readonly MeterActor[], metric: MetricKey): MeterRow[] {
  const rows = actors
    .filter((actor) => actor[metric] > 0)
    .map((actor) => ({
      actorId: actor.actorId,
      name: actor.name,
      role: actor.role,
      discipline: actor.discipline,
      rate: actor[metric],
      total: actor[TOTALS[metric]] as number,
      share: 0,
      overhealPercent: actor.overhealPercent,
      deaths: actor.deaths,
    }))
    .sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name));

  const leader = rows[0]?.rate ?? 0;
  for (const row of rows) row.share = leader === 0 ? 0 : row.rate / leader;
  return rows;
}

export function roleAccent(role: MeterActor["role"]): string {
  switch (role) {
    case "tank":
      return "var(--accent-tank)";
    case "healer":
      return "var(--accent-healer)";
    case "dps":
      return "var(--accent-dps)";
    default:
      return "var(--accent-unknown)";
  }
}

export function raidTotal(rows: readonly MeterRow[]): number {
  return rows.reduce((sum, row) => sum + row.rate, 0);
}
