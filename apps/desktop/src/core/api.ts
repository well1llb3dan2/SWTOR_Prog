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
