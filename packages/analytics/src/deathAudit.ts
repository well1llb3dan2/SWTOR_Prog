import { findDefensive, type DefensiveCategory } from "@swtor/game-data";
import type { CombatEvent } from "@swtor/shared";
import { appliedAmount } from "./pull.js";
import { isPlayer } from "./types.js";

export const DEFAULT_AUDIT_WINDOW_MS = 15_000;

export type AuditEntryKind = "damage" | "heal" | "defensive" | "defensiveEnd" | "death";

export interface DeathAuditEntry {
  timestamp: number;
  /** Milliseconds before death; 0 is the killing blow. */
  offsetMs: number;
  kind: AuditEntryKind;
  ability: string | null;
  source: string | null;
  amount: number;
  /** Health actually applied, from the log's own effective value. */
  effective: number;
  critical: boolean;
  absorbed: number | null;
  mitigation: string | null;
  defensiveCategory: DefensiveCategory | null;
  /** Target health after the event, as reported in the log. */
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
  killingBlow: { ability: string | null; source: string | null; amount: number } | null;
  /** Defensives applied during the window and not removed before death. */
  defensivesActive: string[];
  /** Defensives used at any point in the window. */
  defensivesUsed: string[];
  /** Largest single hit taken in the window. */
  largestHit: number;
}

export interface DeathMoment {
  playerId: string;
  name: string;
  timestamp: number;
}

/** Player deaths in event order; NPC deaths are ignored. */
export function findPlayerDeaths(events: readonly CombatEvent[]): DeathMoment[] {
  const deaths: DeathMoment[] = [];
  for (const event of events) {
    if (event.type !== "death" || !isPlayer(event.target)) continue;
    deaths.push({
      playerId: event.target.playerId,
      name: event.target.name,
      timestamp: event.timestamp,
    });
  }
  return deaths;
}

/**
 * Reconstructs the seconds before a player died.
 *
 * Answers the question a raid leader actually asks: what landed, what was
 * healed, and which defensives were up. Health values come from the log's own
 * actor snapshots rather than being inferred, so the timeline reflects what the
 * game reported rather than an approximation.
 */
export function buildDeathAudit(
  events: readonly CombatEvent[],
  death: DeathMoment,
  windowMs = DEFAULT_AUDIT_WINDOW_MS,
): DeathAudit {
  const from = death.timestamp - windowMs;
  const entries: DeathAuditEntry[] = [];
  const active = new Map<string, string>();
  const used = new Set<string>();

  let damageTaken = 0;
  let healingReceived = 0;
  let largestHit = 0;
  let killingBlow: DeathAudit["killingBlow"] = null;

  for (const event of events) {
    if (event.timestamp < from || event.timestamp > death.timestamp) continue;

    const target = event.target;
    const targetsVictim = isPlayer(target) && target.playerId === death.playerId;
    const sourceIsVictim = isPlayer(event.source) && event.source.playerId === death.playerId;
    const offsetMs = death.timestamp - event.timestamp;

    const health = targetsVictim
      ? {
          hp: target.hp,
          hpPercent:
            target.hp === null || target.maxHp === null || target.maxHp === 0
              ? null
              : (target.hp / target.maxHp) * 100,
        }
      : { hp: null, hpPercent: null };

    if (event.type === "damage" && targetsVictim) {
      const effective = appliedAmount(event.value);
      damageTaken += effective;
      largestHit = Math.max(largestHit, effective);
      if (effective > 0) {
        killingBlow = {
          ability: event.ability?.name ?? null,
          source: event.source?.name ?? null,
          amount: effective,
        };
      }
      entries.push({
        timestamp: event.timestamp,
        offsetMs,
        kind: "damage",
        ability: event.ability?.name ?? null,
        source: event.source?.name ?? null,
        amount: event.value.amount,
        effective,
        critical: event.value.critical,
        absorbed: event.value.absorbed,
        mitigation: event.value.mitigation,
        defensiveCategory: null,
        ...health,
      });
      continue;
    }

    if (event.type === "heal" && targetsVictim) {
      const effective = appliedAmount(event.value);
      healingReceived += effective;
      entries.push({
        timestamp: event.timestamp,
        offsetMs,
        kind: "heal",
        ability: event.ability?.name ?? null,
        source: event.source?.name ?? null,
        amount: event.value.amount,
        effective,
        critical: event.value.critical,
        absorbed: null,
        mitigation: null,
        defensiveCategory: null,
        ...health,
      });
      continue;
    }

    if (event.type === "applyEffect" || event.type === "removeEffect") {
      // A defensive counts when it lands on the victim, whoever cast it, which
      // is what makes an external such as Guard show up.
      if (!targetsVictim && !sourceIsVictim) continue;
      const defensive = findDefensive(event.effect.id, event.effect.name);
      if (defensive === null) continue;

      if (event.type === "applyEffect") {
        active.set(defensive.name, defensive.name);
        used.add(defensive.name);
      } else {
        active.delete(defensive.name);
      }

      entries.push({
        timestamp: event.timestamp,
        offsetMs,
        kind: event.type === "applyEffect" ? "defensive" : "defensiveEnd",
        ability: defensive.name,
        source: event.source?.name ?? null,
        amount: 0,
        effective: 0,
        critical: false,
        absorbed: null,
        mitigation: null,
        defensiveCategory: defensive.category,
        ...health,
      });
    }
  }

  entries.push({
    timestamp: death.timestamp,
    offsetMs: 0,
    kind: "death",
    ability: killingBlow?.ability ?? null,
    source: killingBlow?.source ?? null,
    amount: 0,
    effective: 0,
    critical: false,
    absorbed: null,
    mitigation: null,
    defensiveCategory: null,
    hp: 0,
    hpPercent: 0,
  });

  entries.sort((a, b) => a.timestamp - b.timestamp || a.kind.localeCompare(b.kind));

  return {
    playerId: death.playerId,
    name: death.name,
    diedAt: death.timestamp,
    windowMs,
    entries,
    damageTaken,
    healingReceived,
    killingBlow,
    defensivesActive: [...active.keys()],
    defensivesUsed: [...used],
    largestHit,
  };
}

/** Builds an audit for every player death in a fight. */
export function buildFightDeathAudits(
  events: readonly CombatEvent[],
  windowMs = DEFAULT_AUDIT_WINDOW_MS,
): DeathAudit[] {
  return findPlayerDeaths(events).map((death) => buildDeathAudit(events, death, windowMs));
}
