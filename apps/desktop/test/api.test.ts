import { describe, expect, it } from "vitest";
import { fetchApiHealth, fetchApiReports, reportDetectedCharacter } from "../src/core/api.js";

describe("desktop API helpers", () => {
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
