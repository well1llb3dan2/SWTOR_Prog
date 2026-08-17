import { CombatSession, type LivePullState, type PullSummary } from "@swtor/analytics";
import type { ActorMetrics, CombatEvent, MeterSnapshot } from "@swtor/shared";
import type { SeenCharacter } from "./accountStore.js";

export interface IngestSessionInit {
  sessionId: string;
  guildId: string;
  reportCode: string;
  logFileName: string;
  ownerUserId?: string | null;
  idleTimeoutMs?: number;
  exitGraceMs?: number;
  onPullEnd: (pull: PullSummary, events: CombatEvent[]) => void;
}

/**
 * Hard ceiling on events buffered for one pull.
 *
 * A long operation boss can run past a hundred thousand events; the cap stops a
 * malfunctioning or hostile client from growing the buffer without bound. When
 * it trips the metrics stay correct because they are already aggregated -- only
 * the raw event archive for that pull is truncated.
 */
const MAX_BUFFERED_EVENTS = 250_000;

function toActorMetrics(actor: LivePullState["actors"][number]): ActorMetrics {
  return {
    actorId: actor.actorId,
    name: actor.name,
    role: actor.role,
    discipline: actor.discipline,
    dps: actor.dps,
    hps: actor.hps,
    dtps: actor.dtps,
    totalDamage: actor.damage,
    totalHealing: actor.healing,
    totalDamageTaken: actor.damageTaken,
    overhealPercent: actor.overhealPercent,
    deaths: actor.deaths,
  };
}

/** One connected desktop client: its analytics engine and raw-event buffer. */
export class IngestSession {
  readonly sessionId: string;
  readonly guildId: string;
  readonly reportCode: string;
  readonly logFileName: string;
  readonly ownerUserId: string | null;

  readonly #combat: CombatSession;
  #buffer: CombatEvent[] = [];
  #pullOpen = false;
  #truncated = false;

  /**
   * Pull expiry is measured on the log's own clock, not the wall clock.
   *
   * A live client's event times track real time closely, but a replayed log is
   * hours or days old -- comparing its timestamps against `Date.now()` would
   * expire every pull the instant it opened. Advancing the last event time by
   * however long the client has actually been quiet handles both cases.
   */
  #lastEventAt = 0;
  #lastBatchWallAt = Date.now();

  eventsReceived = 0;
  lastSeenAt = Date.now();

  constructor(init: IngestSessionInit) {
    this.sessionId = init.sessionId;
    this.guildId = init.guildId;
    this.reportCode = init.reportCode;
    this.logFileName = init.logFileName;
    this.ownerUserId = init.ownerUserId ?? null;

    this.#combat = new CombatSession({
      ...(init.idleTimeoutMs === undefined ? {} : { idleTimeoutMs: init.idleTimeoutMs }),
      ...(init.exitGraceMs === undefined ? {} : { exitGraceMs: init.exitGraceMs }),
      onPullStart: () => {
        this.#pullOpen = true;
        this.#buffer = [];
        this.#truncated = false;
      },
      onPullEnd: (pull) => {
        this.#pullOpen = false;
        const events = this.#buffer;
        this.#buffer = [];
        if (pull.boss?.isLikelyBoss !== true) return;
        init.onPullEnd(pull, events);
      },
    });
  }

  push(events: readonly CombatEvent[]): void {
    for (const event of events) {
      this.#combat.push(event);
      // `onPullStart` fires inside push, so the opening event lands in the buffer.
      if (this.#pullOpen) {
        if (this.#buffer.length < MAX_BUFFERED_EVENTS) this.#buffer.push(event);
        else this.#truncated = true;
      }
      if (event.timestamp > this.#lastEventAt) this.#lastEventAt = event.timestamp;
    }
    this.eventsReceived += events.length;
    this.lastSeenAt = Date.now();
    this.#lastBatchWallAt = this.lastSeenAt;
  }

  /** Log-clock equivalent of a wall-clock instant. */
  #eventTime(wallNow: number): number {
    if (this.#lastEventAt === 0) return wallNow;
    return this.#lastEventAt + Math.max(0, wallNow - this.#lastBatchWallAt);
  }

  get truncated(): boolean {
    return this.#truncated;
  }

  /** Lets an idle pull close when the client has gone quiet. */
  flush(wallNow: number): void {
    this.#combat.flush(this.#eventTime(wallNow));
  }

  end(): void {
    this.#combat.end();
  }

  snapshot(wallNow: number): MeterSnapshot | null {
    const pull = this.#combat.current(this.#eventTime(wallNow));
    if (pull === null || pull.boss?.isLikelyBoss !== true) return null;

    return {
      sessionId: this.sessionId,
      pullId: pull.id,
      zone: pull.zone,
      difficulty: pull.difficulty,
      groupSize: pull.groupSize,
      boss: pull.boss,
      encounter: pull.encounter,
      inCombat: true,
      elapsedMs: pull.elapsedMs,
      actors: pull.actors.map(toActorMetrics),
    };
  }

  characters(wallNow: number): SeenCharacter[] {
    const pull = this.#combat.current(this.#eventTime(wallNow));
    const liveCharacters = (pull?.actors ?? []).map((actor) => ({
      playerId: actor.actorId,
      name: actor.name,
      discipline: actor.discipline,
      role: actor.role,
    }));

    const rosterCharacters = this.#combat.roster.map((member) => ({
      playerId: member.playerId,
      name: member.name,
      discipline: member.discipline,
      role: member.role,
    }));

    const seen = new Map<string, SeenCharacter>();
    for (const character of [...liveCharacters, ...rosterCharacters]) {
      seen.set(character.playerId, character);
    }
    return [...seen.values()];
  }
}

export interface SessionManagerOptions {
  maxSessions: number;
  /** Sessions silent for longer than this are reaped. */
  idleTimeoutMs?: number;
}

export class SessionManager {
  readonly #sessions = new Map<string, IngestSession>();
  readonly #options: Required<SessionManagerOptions>;

  constructor(options: SessionManagerOptions) {
    this.#options = { idleTimeoutMs: 5 * 60_000, ...options };
  }

  get size(): number {
    return this.#sessions.size;
  }

  add(session: IngestSession): void {
    if (this.#sessions.size >= this.#options.maxSessions) {
      throw new Error("Session limit reached");
    }
    this.#sessions.set(session.sessionId, session);
  }

  list(): IngestSession[] {
    return [...this.#sessions.values()];
  }

  get(sessionId: string): IngestSession | undefined {
    return this.#sessions.get(sessionId);
  }

  findByOwnerUserId(ownerUserId: string): IngestSession[] {
    return [...this.#sessions.values()].filter((session) => session.ownerUserId === ownerUserId);
  }

  remove(sessionId: string): void {
    const session = this.#sessions.get(sessionId);
    if (session === undefined) return;
    session.end();
    this.#sessions.delete(sessionId);
  }

  /** Emits a snapshot for every live pull; drives the 1 Hz broadcast. */
  tick(now: number): MeterSnapshot[] {
    const snapshots: MeterSnapshot[] = [];
    for (const session of this.#sessions.values()) {
      session.flush(now);
      const snapshot = session.snapshot(now);
      if (snapshot !== null) snapshots.push(snapshot);
    }
    return snapshots;
  }

  reapIdle(now: number): string[] {
    const reaped: string[] = [];
    for (const [id, session] of this.#sessions) {
      if (now - session.lastSeenAt > this.#options.idleTimeoutMs) {
        this.remove(id);
        reaped.push(id);
      }
    }
    return reaped;
  }

  clear(): void {
    for (const id of [...this.#sessions.keys()]) this.remove(id);
  }
}
