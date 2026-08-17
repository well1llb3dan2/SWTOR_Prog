import { describe, expect, it } from "vitest";
import { fetchApiHealth, fetchApiReports } from "../src/core/api.js";

describe("desktop API helpers", () => {
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
