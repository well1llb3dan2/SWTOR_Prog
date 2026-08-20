import type { CombatEvent, Difficulty, GroupSize } from "@swtor/shared";
import { PullAccumulator, type BossThreshold, type PullEndReason } from "./pull.js";
import { buildCombatTimeline } from "./operations.js";
import type { CombatTimelineEntry, LivePullState, PullSummary, RosterEntry } from "./types.js";

export interface CombatSessionOptions {
  /**
   * Silence, in milliseconds, that ends a pull.
   *
   * Boundaries are driven by combat activity rather than combat-state flags,
   * because the game only logs `EnterCombat`/`ExitCombat` for the player whose
   * client wrote the file. Everyone else's combat state is invisible, so a rule
   * like "close once every raider has left combat" cannot be evaluated at all.
   */
  idleTimeoutMs?: number;
  /**
   * Shorter grace applied once the local player leaves combat. Any further raid
   * activity cancels it and the pull stays open, which is what happens when the
   * logging player dies or steps out while the group keeps fighting.
   */
  exitGraceMs?: number;
  bossCleanupMs?: number;
  /** Pulls shorter than this are treated as stray ticks and discarded. */
  minPullDurationMs?: number;
  /** Controls when the largest engaged NPC is reported as a boss. */
  bossThreshold?: BossThreshold;
  onPullStart?: (pull: LivePullState) => void;
  onPullEnd?: (pull: PullSummary) => void;
}

const DEFAULTS = {
  idleTimeoutMs: 8_000,
  exitGraceMs: 2_500,
  bossCleanupMs: 3_000,
  minPullDurationMs: 4_000,
  bossThreshold: { playerHealthMultiple: 8, absoluteFloor: 1_000_000 },
} as const;

function isActivity(event: CombatEvent): boolean {
  return event.type === "damage" || event.type === "heal" || event.type === "death";
}

/**
 * Splits a stream of combat events into pulls and accumulates metrics.
 *
 * The same instance runs live on the server and offline over a whole file, so
 * pull detection cannot depend on wall-clock time. Call `flush` to let an idle
 * pull close when no further events are arriving.
 */
export class CombatSession {
  readonly #options: Required<Omit<CombatSessionOptions, "onPullStart" | "onPullEnd">> &
    Pick<CombatSessionOptions, "onPullStart" | "onPullEnd">;

  readonly #roster = new Map<string, RosterEntry>();
  readonly #completed: PullSummary[] = [];

  #zone: string | null = null;
  #zoneId: string | null = null;
  #difficulty: Difficulty | null = null;
  #groupSize: GroupSize | null = null;
  #serverId: string | null = null;
  #localPlayerId: string | null = null;

  #current: PullAccumulator | null = null;
  #pullIndex = 0;
  #exitPendingSince: number | null = null;
  #lastClosedAt: number | null = null;

  constructor(options: CombatSessionOptions = {}) {
    this.#options = { ...DEFAULTS, ...options };
  }

  get pulls(): readonly PullSummary[] {
    return this.#completed;
  }

  get timeline(): readonly CombatTimelineEntry[] {
    return buildCombatTimeline(this.#completed);
  }

  get roster(): readonly RosterEntry[] {
    return [...this.#roster.values()];
  }

  get localPlayerId(): string | null {
    return this.#localPlayerId;
  }

  current(now: number): LivePullState | null {
    return this.#current === null ? null : this.#current.live(now);
  }

  push(event: CombatEvent): void {
    // Record any discovered player in the session roster
    for (const actor of [event.source, event.target]) {
      if (actor && actor.kind === "player" && !this.#roster.has(actor.playerId)) {
        this.#roster.set(actor.playerId, {
          playerId: actor.playerId,
          serverId: this.#serverId,
          name: actor.name,
          advancedClass: null,
          discipline: null,
          role: null,
        });
      }
    }

    switch (event.type) {
      case "areaEntered":
        // Zoning always ends a fight, and never begins one.
        this.#close(this.#current?.lastActivityAt ?? event.timestamp, "stream-ended");
        this.#zone = event.zone.name;
        this.#zoneId = event.zone.id;
        this.#difficulty = event.difficulty;
        this.#groupSize = event.groupSize;
        this.#serverId = event.serverId ?? this.#serverId;
        this.#rememberLocalPlayer(event);
        return;

      case "disciplineChanged":
        this.#rememberDiscipline(event);
        return;

      case "combatState":
        this.#rememberLocalPlayer(event);
        if (event.state === "enter") {
          this.#expireIdlePull(event.timestamp);
          this.#open(event.timestamp);
        } else {
          this.#exitPendingSince = event.timestamp;
        }
        return;

      default:
        break;
    }

    this.#expireIdlePull(event.timestamp);

    if (!isActivity(event)) {
      this.#current?.add(event);
      return;
    }

    this.#open(event.timestamp);
    this.#exitPendingSince = null;
    this.#current?.add(event);
  }

  /** Lets an idle pull close when the stream has gone quiet. */
  flush(now: number): void {
    this.#expireIdlePull(now);
  }

  /** Closes any pull still open; call once the log or session ends. */
  end(): void {
    this.#close(this.#current?.lastActivityAt ?? 0, "stream-ended");
  }

  #rememberLocalPlayer(event: CombatEvent): void {
    if (this.#localPlayerId !== null) return;
    if (event.source?.kind === "player") this.#localPlayerId = event.source.playerId;
  }

  #rememberDiscipline(event: Extract<CombatEvent, { type: "disciplineChanged" }>): void {
    const player = event.source;
    if (player?.kind !== "player") return;
    this.#roster.set(player.playerId, {
      playerId: player.playerId,
      serverId: this.#serverId,
      name: player.name,
      advancedClass: event.advancedClass.name,
      discipline: event.discipline.name,
      role: event.role,
    });
  }

  #expireIdlePull(now: number): void {
    if (this.#current === null) return;
    const threshold = this.#current.hasVictory()
      ? this.#options.bossCleanupMs
      : this.#exitPendingSince === null ? this.#options.idleTimeoutMs : this.#options.exitGraceMs;
    if (now - this.#current.lastActivityAt >= threshold) {
      this.#close(this.#current.lastActivityAt, "sustained-silence");
    }
  }

  #open(startedAt: number): void {
    if (this.#current !== null) return;
    if (this.#lastClosedAt !== null && startedAt - this.#lastClosedAt < 1000) return;
    this.#pullIndex += 1;
    this.#current = new PullAccumulator(
      `${startedAt}-${this.#pullIndex}`,
      this.#pullIndex,
      startedAt,
      {
        zone: this.#zone,
        zoneId: this.#zoneId,
        difficulty: this.#difficulty,
        groupSize: this.#groupSize,
        roster: this.#roster,
        localPlayerId: this.#localPlayerId,
      },
      this.#options.bossThreshold,
    );
    this.#options.onPullStart?.(this.#current.live(startedAt));
  }

  #close(endedAt: number, endReason: PullEndReason): void {
    const pull = this.#current;
    this.#current = null;
    this.#exitPendingSince = null;
    if (pull === null) return;

    this.#lastClosedAt = endedAt;

    const summary = pull.finish(Math.max(endedAt, pull.startedAt), endReason);
    const meaningful =
      summary.durationMs >= this.#options.minPullDurationMs &&
      summary.actors.some((a) => a.damage > 0);
    if (!meaningful) {
      this.#pullIndex -= 1;
      return;
    }

    this.#completed.push(summary);
    this.#options.onPullEnd?.(summary);
  }
}

/** Runs a whole event stream through a session; used by tests and the importer. */
export function analyzeEvents(
  events: Iterable<CombatEvent>,
  options: CombatSessionOptions = {},
): PullSummary[] {
  const session = new CombatSession(options);
  for (const event of events) session.push(event);
  session.end();
  return [...session.pulls];
}
