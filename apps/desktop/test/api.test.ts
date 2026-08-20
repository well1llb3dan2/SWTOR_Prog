import { describe, expect, it } from "vitest";
import { fetchApiHealth, fetchApiReports, reportDetectedCharacter, reportProgressionPull } from "../src/core/api.js";

describe("desktop API helpers", () => {
  it("reports a completed progression pull to the progression ingest API", async () => {
    const calls: Array<{ url: string; method: string; body: string; headers: Record<string, string> }> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: String(init?.body ?? ""),
        headers: (init?.headers as Record<string, string>) ?? {},
      });
      return new Response(JSON.stringify({ data: { accepted: true } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    };

    const dummyPull = {
      id: "pull-1",
      index: 1,
      startedAt: Date.now() - 120_000,
      endedAt: Date.now(),
      durationMs: 120_000,
      zone: "Scum and Villainy",
      difficulty: "Veteran" as const,
      groupSize: 8 as const,
      boss: { npcId: "snv_dash", name: "Dash'Roode", maxHp: 10000000, hp: 0, hpPercent: 0, isLikelyBoss: true },
      encounter: {
        encounterId: "snv_dashroode",
        encounterName: "Dash'Roode",
        operationId: "scum_and_villainy",
        operationName: "Scum and Villainy",
        isLair: false,
        matchedBosses: ["Dash'Roode"],
        phases: [{ order: 1, name: "Phase 1", style: "Standard" }],
        victoryEvent: "Kill",
        cleared: true,
      },
      outcome: "kill" as const,
      roster: [],
      actors: [],
      deaths: [],
      buckets: [],
      bossFight: {
        id: "pull-1",
        index: 1,
        startedAt: Date.now() - 120_000,
        endedAt: Date.now(),
        durationMs: 120_000,
        zone: "Scum and Villainy",
        difficulty: "Veteran" as const,
        groupSize: 8 as const,
        encounter: {
          encounterId: "snv_dashroode",
          encounterName: "Dash'Roode",
          operationId: "scum_and_villainy",
          operationName: "Scum and Villainy",
          isLair: false,
          matchedBosses: ["Dash'Roode"],
          phases: [{ order: 1, name: "Phase 1", style: "Standard", trigger: "pull" }],
          victoryEvent: "Kill",
          cleared: true,
        },
        bossEntities: [{
          instanceId: "snv_dash",
          npcId: "snv_dash",
          name: "Dash'Roode",
          role: "boss" as const,
          firstSeenAt: Date.now() - 120_000,
          engagedAt: Date.now() - 120_000,
          lastSeenAt: Date.now(),
          diedAt: Date.now(),
          maxHp: 10_000_000,
          finalHp: 0,
          damageTaken: 10_000_000,
          damageDealt: 0,
          deaths: 1,
          phases: [1],
        }],
        mechanicEntities: [],
        unknownEntities: [],
        phases: [],
        players: [],
        deaths: [],
        outcome: "kill" as const,
        terminalEvidence: {
          kind: "boss-death" as const,
          timestamp: Date.now(),
          detail: "Boss defeated.",
          actorIds: [],
          npcIds: ["snv_dash"],
        },
        buckets: [],
      },
    };

    const result = await reportProgressionPull(
      "http://localhost:3000",
      "test-token",
      dummyPull,
      "Mrln",
      "he3000",
      fetchImpl as typeof fetch,
    );

    expect(result).toEqual({ accepted: true, encounterName: "Dash'Roode", outcome: "kill" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("http://localhost:3000/api/progression/ingest");
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.headers.Authorization).toBe("Bearer test-token");
    expect(calls[0]!.body).toContain('"characterName":"Mrln"');
    expect(calls[0]!.body).toContain('"outcome":"kill"');
    expect(calls[0]!.body).toContain('"encounterName":"Dash\'Roode"');
  });

  it("reports a detected character to the progression ingest API", async () => {
    const calls: Array<{ url: string; method: string; body: string; headers: Record<string, string> }> = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: String(init?.body ?? ""),
        headers: (init?.headers as Record<string, string>) ?? {},
      });
      return new Response(JSON.stringify({ data: { accepted: true } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await reportDetectedCharacter(
      "http://localhost:3000",
      "test-token",
      { characterName: "Mrln", serverId: "he3000", discipline: "Rage" },
      fetchImpl as typeof fetch,
    );

    expect(result).toEqual({ accepted: true, characterName: "Mrln" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("http://localhost:3000/api/progression/ingest");
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.headers.Authorization).toBe("Bearer test-token");
    expect(calls[0]!.body).toContain('"characterName":"Mrln"');
  });

  it("fetches health from the configured server URL", async () => {
    const calls: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ status: "ok", sessions: 2, uptimeSeconds: 12 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await fetchApiHealth("http://localhost:3001", fetchImpl as typeof fetch);

    expect(result).toEqual({ status: "ok", sessions: 2, uptimeSeconds: 12 });
    expect(calls).toEqual(["http://localhost:3001/health"]);
  });

  it("requests a limited report list from the API", async () => {
    const calls: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify([{ code: "ABC123", fightCount: 2, killCount: 1 }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await fetchApiReports("http://localhost:3001", 3, fetchImpl as typeof fetch);

    expect(result).toEqual([{ code: "ABC123", fightCount: 2, killCount: 1 }]);
    expect(calls).toEqual(["http://localhost:3001/api/reports?limit=3"]);
  });
});
