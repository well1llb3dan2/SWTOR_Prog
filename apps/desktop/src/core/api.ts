import type { LivePullState, BossFightSummary, TrashEncounterSummary } from "@swtor/analytics";

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
    const formattedSnapshot = snapshot
      ? {
          elapsedMs: snapshot.elapsedMs,
          zone: snapshot.zone,
          difficulty: snapshot.difficulty,
          boss: snapshot.boss
            ? {
                name: snapshot.boss.name,
                hp: snapshot.boss.hp,
                maxHp: snapshot.boss.maxHp,
                hpPercent: snapshot.boss.hpPercent,
                isLikelyBoss: snapshot.boss.isLikelyBoss,
              }
            : snapshot.encounter
              ? {
                  name: snapshot.encounter.encounterName,
                  hp: null,
                  maxHp: 10000000,
                  hpPercent: null,
                  isLikelyBoss: true,
                }
              : null,
          encounter: snapshot.encounter
            ? {
                encounterId: snapshot.encounter.encounterId,
                encounterName: snapshot.encounter.encounterName,
                operationId: snapshot.encounter.operationId,
                operationName: snapshot.encounter.operationName,
              }
            : null,
          actors: (snapshot.actors ?? []).map((a) => ({
            actorId: a.actorId,
            name: a.name,
            role: a.role,
            discipline: a.discipline,
            combatStyle: a.combatStyle,
            dps: Math.round(a.dps),
            hps: Math.round(a.hps),
            dtps: Math.round(a.dtps),
            damage: a.damage,
            totalDamage: a.damage,
            healing: a.healing,
            totalHealing: a.healing,
            damageTaken: a.damageTaken,
            totalDamageTaken: a.damageTaken,
            overhealPercent: Math.round(a.overhealPercent),
            deaths: a.deaths,
          })),
          bossFight: snapshot.bossFight,
        }
      : null;

    await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-swtor-prog-token": token,
      },
      body: JSON.stringify({
        snapshot: formattedSnapshot,
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
      version: "2.0",
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
  fight: BossFightSummary,
  localCharacterName: string,
  serverId?: string | null,
  fetchImpl: typeof fetch = fetch,
  logFileName?: string | null,
): Promise<{ accepted: boolean; encounterName: string; outcome: string }> {
  const baseUrl = normalizeBaseUrl(serverUrl);
  const url = `${baseUrl}/api/progression/ingest`;
  const bossFight = fight;
  const encounterId = bossFight.encounter.encounterId;
  const encounterName = bossFight.encounter.encounterName;
  const outcome = bossFight.outcome;
  const occurredAt = new Date(fight.endedAt || Date.now()).toISOString();

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}`, "x-swtor-prog-token": token } : {}),
    },
    body: JSON.stringify({
      schema: "progression-event",
      version: "2.0",
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
        logFileName: logFileName ?? undefined,
        difficulty: fight.difficulty ?? undefined,
        occurredAt,
        details: {
          bossFight,
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

export async function reportTrashEncounter(
  serverUrl: string,
  token: string,
  fight: TrashEncounterSummary,
  localCharacterName: string,
  serverId?: string | null,
  fetchImpl: typeof fetch = fetch,
  logFileName?: string | null,
): Promise<void> {
  const url = `${normalizeBaseUrl(serverUrl)}/api/progression/ingest`;
  const encounterId = `trash:${fight.enemy.instanceId}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}`, "x-swtor-prog-token": token } : {}) },
    body: JSON.stringify({
      schema: "progression-event",
      version: "2.0",
      guildId: "default",
      generatedAt: new Date().toISOString(),
      source: "SWTOR_Prog",
      visibility: "guild",
      event: {
        encounterId,
        encounterName: fight.enemy.name,
        outcome: fight.outcome,
        characterName: localCharacterName,
        serverId: serverId ?? undefined,
        logFileName: logFileName ?? undefined,
        occurredAt: new Date(fight.endedAt).toISOString(),
        details: { trashFight: fight },
      },
    }),
  });
  if (!response.ok) throw new Error(`Trash encounter reporting failed (${response.status}) at ${url}`);
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
