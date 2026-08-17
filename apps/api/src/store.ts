import type { PullSummary } from "@swtor/analytics";
import {
  SwtorDatabase,
  generateReportCode,
  summariseProgression,
  toFightSummary,
  type ProgressionEntry,
  type ReportDocument,
} from "@swtor/db";
import type { CombatEvent } from "@swtor/shared";

export interface CreateReportInput {
  guildId: string;
  ownerUserId: string | null;
  logFileName: string;
  startedAt: Date;
}

/**
 * Storage boundary for reports.
 *
 * The API depends on this rather than on MongoDB directly so it can boot and be
 * tested without a database, which matters for the desktop replay workflow.
 */
export interface ReportStore {
  createReport(input: CreateReportInput): Promise<ReportDocument>;
  appendFight(
    code: string,
    guildId: string,
    pull: PullSummary,
    events: readonly CombatEvent[],
  ): Promise<number>;
  getReport(guildId: string, code: string): Promise<ReportDocument | null>;
  listReports(guildId: string, limit?: number): Promise<ReportDocument[]>;
  getFightEvents(guildId: string, code: string, fightId: number): Promise<CombatEvent[] | null>;
  progression(guildId: string): Promise<ProgressionEntry[]>;
  close(): Promise<void>;
}

export class MongoReportStore implements ReportStore {
  readonly #db: SwtorDatabase;

  constructor(db: SwtorDatabase) {
    this.#db = db;
  }

  static async connect(
    uri: string,
    dbName: string,
    retentionDays: number | null,
  ): Promise<MongoReportStore> {
    return new MongoReportStore(await SwtorDatabase.connect({ uri, dbName, retentionDays }));
  }

  createReport(input: CreateReportInput) {
    return this.#db.createReport(input);
  }

  appendFight(code: string, guildId: string, pull: PullSummary, events: readonly CombatEvent[]) {
    return this.#db.appendFight(code, guildId, pull, events);
  }

  getReport(guildId: string, code: string) {
    return this.#db.getReport(guildId, code);
  }

  listReports(guildId: string, limit = 50) {
    return this.#db.listReports(guildId, limit);
  }

  getFightEvents(guildId: string, code: string, fightId: number) {
    return this.#db.getFightEvents(guildId, code, fightId);
  }

  progression(guildId: string) {
    return this.#db.progression(guildId);
  }

  close() {
    return this.#db.close();
  }
}

/** Non-durable store used for local runs, replay sessions and tests. */
export class MemoryReportStore implements ReportStore {
  readonly #reports = new Map<string, ReportDocument>();

  async createReport(input: CreateReportInput): Promise<ReportDocument> {
    const now = new Date();
    const report: ReportDocument = {
      guildId: input.guildId,
      code: generateReportCode(),
      ownerUserId: input.ownerUserId,
      logFileName: input.logFileName,
      startedAt: input.startedAt,
      endedAt: null,
      zone: null,
      zoneId: null,
      difficulty: null,
      groupSize: null,
      roster: [],
      fights: [],
      createdAt: now,
      updatedAt: now,
    };
    this.#reports.set(report.code, report);
    return report;
  }

  async appendFight(
    code: string,
    guildId: string,
    pull: PullSummary,
    events: readonly CombatEvent[],
  ): Promise<number> {
    const report = this.#reports.get(code);
    if (report === undefined || report.guildId !== guildId) {
      throw new Error(`Unknown report ${code}`);
    }

    const fightId = report.fights.length + 1;
    report.fights.push(toFightSummary(pull, fightId));
    report.endedAt = new Date(pull.endedAt);
    report.zone = pull.zone;
    report.difficulty = pull.difficulty;
    report.groupSize = pull.groupSize;
    report.roster = pull.roster;
    report.updatedAt = new Date();

    return fightId;
  }

  async getReport(guildId: string, code: string): Promise<ReportDocument | null> {
    const report = this.#reports.get(code);
    return report !== undefined && report.guildId === guildId ? report : null;
  }

  async listReports(guildId: string, limit = 50): Promise<ReportDocument[]> {
    return [...this.#reports.values()]
      .filter((r) => r.guildId === guildId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  async getFightEvents(_guildId: string, _code: string, _fightId: number): Promise<CombatEvent[] | null> {
    return null;
  }

  async progression(guildId: string): Promise<ProgressionEntry[]> {
    const fights = [...this.#reports.values()]
      .filter((r) => r.guildId === guildId)
      .flatMap((r) => r.fights);
    return summariseProgression(fights);
  }

  async close(): Promise<void> {}
}
