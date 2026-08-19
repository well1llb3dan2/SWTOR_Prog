import type { LivePullState, PullSummary } from "@swtor/analytics";

export interface ApiHealth {
  status: string;
  sessions: number;
  uptimeSeconds: number;
}

export interface ApiReportSummary {
  code: string;
  logFileName: string;
  startedAt: number;
  endedAt?: number;
  zone: string;
  difficulty: string;
  groupSize: number;
  fightCount: number;
  killCount: number;
}

export interface DetectedCharacterInput {
  characterName: string;
  serverId?: string | null;
  discipline?: string | null;
  discordUserId?: string | null;
  occurredAt?: string;
}

export function normalizeBaseUrl(serverUrl: string): string {
  let url = (serverUrl || "").trim().replace(/\/+$/, "");
  if (url.endsWith("/api")) {
    url = url.slice(0, -4).replace(/\/+$/, "");
  }
  return url || (process.env.MERLIN_SERVER_URL ?? process.env.SWTOR_SERVER_URL ?? "https://api.infamous-guild.com");
}

export async function reportLiveSnapshot(
  serverUrl: string,
  token: string,
  snapshot: LivePullState | null,
  inCombat: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!token) return;
  const baseUrl = normalizeBaseUrl(serverUrl);
  const url = `${baseUrl}/api/progression/live`;
  try {
    await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-swtor-prog-token": token,
      },
      body: JSON.stringify({
        snapshot,
        inCombat,
      }),
    });
  } catch {
    // Best-effort live snapshot
  }
}

export async function reportDetectedCharacter(
  serverUrl: string,
  token: string,
  character: DetectedCharacterInput,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accepted: boolean; characterName: string }> {
  const baseUrl = normalizeBaseUrl(serverUrl);
  const url = `${baseUrl}/api/progression/ingest`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}`, "x-swtor-prog-token": token } : {}),
    },
    body: JSON.stringify({
      schema: "progression-event",
      version: "1.0",
      guildId: "default",
      generatedAt: new Date().toISOString(),
      source: "SWTOR_Prog",
      visibility: "guild",
      event: {
        encounterId: "character-detection",
        encounterName: "Character Detection",
        outcome: "active",
        characterName: character.characterName,
        serverId: character.serverId ?? undefined,
        discipline: character.discipline ?? undefined,
        discordUserId: character.discordUserId ?? undefined,
        occurredAt: character.occurredAt ?? new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Character detection failed (${response.status}) at ${url}`);
  }
  return { accepted: true, characterName: character.characterName };
}

export async function reportProgressionPull(
  serverUrl: string,
  token: string,
  pull: PullSummary,
  localCharacterName: string,
  serverId?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accepted: boolean; encounterName: string; outcome: string }> {
  const baseUrl = normalizeBaseUrl(serverUrl);
  const url = `${baseUrl}/api/progression/ingest`;
  const encounterId = pull.encounter?.encounterId ?? pull.boss?.npcId ?? "boss-fight";
  const encounterName = pull.encounter?.encounterName ?? pull.boss?.name ?? "Boss Encounter";
  const outcome = pull.outcome === "kill" ? "kill" : "wipe";
  const occurredAt = new Date(pull.endedAt || Date.now()).toISOString();

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}`, "x-swtor-prog-token": token } : {}),
    },
    body: JSON.stringify({
      schema: "progression-event",
      version: "1.0",
      guildId: "default",
      generatedAt: new Date().toISOString(),
      source: "SWTOR_Prog",
      visibility: "guild",
      event: {
        encounterId,
        encounterName,
        outcome,
        characterName: localCharacterName,
        serverId: serverId ?? undefined,
        difficulty: pull.difficulty ?? "Veteran",
        occurredAt,
        details: {
          operationId: pull.encounter?.operationId,
          operationName: pull.encounter?.operationName,
          durationMs: pull.durationMs,
          boss: pull.boss ?? undefined,
          actors: pull.actors.map((a) => ({
            actorId: a.actorId,
            name: a.name,
            role: a.role,
            discipline: a.discipline,
            dps: a.dps,
            hps: a.hps,
            dtps: a.dtps,
            damage: a.damage,
            healing: a.healing,
            damageTaken: a.damageTaken,
            overhealPercent: a.overhealPercent,
            deaths: a.deaths,
          })),
          deaths: pull.deaths.map((d) => ({
            playerId: d.playerId,
            name: d.name,
            timestamp: d.timestamp,
            offsetMs: d.offsetMs,
            killingBlowAbility: d.killingBlowAbility,
            killingBlowSource: d.killingBlowSource,
          })),
          bossPhases: (pull.encounter?.phases ?? []).map((phase) => ({
            order: phase.order,
            name: phase.name,
            style: phase.style,
            trigger: phase.trigger,
            outcome,
          })),
          enemyFights: (pull.encounter?.matchedBosses ?? []).map((enemyName, index) => ({
            enemyName,
            outcome,
            phaseName: (pull.encounter?.phases ?? [])[index]?.name,
          })),
        },
      },
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Progression pull reporting failed (${response.status}) at ${url}`);
  }
  return { accepted: true, encounterName, outcome };
}

export async function fetchApiHealth(
  serverUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiHealth> {
  const response = await fetchImpl(`${serverUrl.replace(/\/$/, "")}/health`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Health check failed (${response.status})`);
  }
  return (await response.json()) as ApiHealth;
}

export async function fetchApiReports(
  serverUrl: string,
  limit = 10,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiReportSummary[]> {
  const response = await fetchImpl(`${serverUrl.replace(/\/$/, "")}/api/reports?limit=${limit}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Reports failed (${response.status})`);
  }
  return (await response.json()) as ApiReportSummary[];
}
