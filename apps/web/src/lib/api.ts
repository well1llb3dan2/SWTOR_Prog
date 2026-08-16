export interface FightSummary {
  fightId: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  zone: string | null;
  difficulty: string | null;
  groupSize: number | null;
  outcome: "kill" | "wipe" | "incomplete";
  boss: {
    npcId: string;
    name: string;
    maxHp: number;
    hp: number | null;
    hpPercent: number | null;
    isLikelyBoss: boolean;
  } | null;
  encounter: {
    encounterId: string;
    encounterName: string;
    operationName: string;
    victoryEvent: string;
    phases: { order: number; name: string; style: string; trigger: string }[];
  } | null;
  actors: {
    actorId: string;
    name: string;
    role: "tank" | "healer" | "dps" | null;
    discipline: string | null;
    dps: number;
    hps: number;
    dtps: number;
    damage: number;
    healing: number;
    damageTaken: number;
    overhealPercent: number;
    deaths: number;
  }[];
  deaths: {
    playerId: string;
    name: string;
    timestamp: number;
    offsetMs: number;
    killingBlowAbility: string | null;
    killingBlowSource: string | null;
  }[];
}

export interface ReportDetail {
  code: string;
  logFileName: string;
  startedAt: string;
  endedAt: string | null;
  zone: string | null;
  difficulty: string | null;
  groupSize: number | null;
  roster: {
    playerId: string;
    name: string;
    advancedClass: string | null;
    discipline: string | null;
    role: "tank" | "healer" | "dps" | null;
  }[];
  fights: FightSummary[];
}

export interface DeathAuditEntry {
  offsetMs: number;
  kind: "damage" | "heal" | "defensive" | "defensiveEnd" | "death";
  ability: string | null;
  source: string | null;
  amount: number;
  effective: number;
  critical: boolean;
  absorbed: number | null;
  mitigation: string | null;
  defensiveCategory: string | null;
  hp: number | null;
  hpPercent: number | null;
}

export interface DeathAudit {
  playerId: string;
  name: string;
  diedAt: number;
  windowMs: number;
  entries: DeathAuditEntry[];
  damageTaken: number;
  healingReceived: number;
  largestHit: number;
  killingBlow: { ability: string | null; source: string | null; amount: number } | null;
  defensivesActive: string[];
  defensivesUsed: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (response.status === 404) return { data: null, error: null };
    if (!response.ok) return { data: null, error: `API returned ${response.status}` };
    return { data: (await response.json()) as T, error: null };
  } catch {
    return { data: null, error: "Could not reach the API" };
  }
}

export const fetchReport = (code: string) => get<ReportDetail>(`/api/reports/${code}`);

export const fetchDeaths = (code: string, fightId: number) =>
  get<{ deaths: DeathAudit[] }>(`/api/reports/${code}/fights/${fightId}/deaths`);
