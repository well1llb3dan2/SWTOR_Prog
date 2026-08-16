import type { Actor, NamedEntity, Position } from "@swtor/shared";

/** Marker for the `[=]` slot, meaning "same actor as the source". */
export const SELF = Symbol("self");

function parsePosition(text: string): Position | null {
  const parts = text.split(",");
  if (parts.length !== 4) return null;
  const [x, y, z, facing] = parts.map((p) => Number.parseFloat(p));
  if ([x, y, z, facing].some((n) => n === undefined || Number.isNaN(n))) return null;
  return { x: x!, y: y!, z: z!, facing: facing! };
}

function parseHealth(text: string): { hp: number | null; maxHp: number | null } {
  const slash = text.indexOf("/");
  if (slash === -1) return { hp: null, maxHp: null };
  const hp = Number.parseInt(text.slice(0, slash), 10);
  const maxHp = Number.parseInt(text.slice(slash + 1), 10);
  return {
    hp: Number.isNaN(hp) ? null : hp,
    maxHp: Number.isNaN(maxHp) ? null : maxHp,
  };
}

function stripParens(text: string): string {
  const t = text.trim();
  return t.startsWith("(") && t.endsWith(")") ? t.slice(1, -1) : t;
}

/**
 * Parses an actor slot.
 *
 * Players:    `@Name#PlayerId|(x,y,z,facing)|(hp/maxHp)`
 * NPCs:       `Name {npcId}:instanceId|(x,y,z,facing)|(hp/maxHp)`
 * Companions: `@Owner#Id/Companion {id}:instanceId|...`
 *
 * Returns `null` for an empty slot and `SELF` for `=`.
 */
export function parseActor(slot: string): Actor | typeof SELF | null {
  const content = slot.trim();
  if (content.length === 0) return null;
  if (content === "=") return SELF;

  const fields = content.split("|");
  const identity = fields[0]!.trim();
  const position = fields[1] !== undefined ? parsePosition(stripParens(fields[1])) : null;
  const health =
    fields[2] !== undefined ? parseHealth(stripParens(fields[2])) : { hp: null, maxHp: null };

  if (identity.startsWith("@")) {
    const body = identity.slice(1);
    // A companion is logged as part of its owner's identity; the segment after
    // the slash is the actual acting entity.
    const slash = body.indexOf("/");
    if (slash !== -1) {
      const companion = parseNpcIdentity(body.slice(slash + 1));
      if (companion !== null) {
        return { kind: "npc", ...companion, position, ...health };
      }
    }
    const hash = body.lastIndexOf("#");
    const name = hash === -1 ? body : body.slice(0, hash);
    const playerId = hash === -1 ? "" : body.slice(hash + 1);
    return { kind: "player", name, playerId, position, ...health };
  }

  const npc = parseNpcIdentity(identity);
  if (npc === null) return null;
  return { kind: "npc", ...npc, position, ...health };
}

function parseNpcIdentity(
  text: string,
): { name: string; npcId: string; instanceId: string | null } | null {
  const match = /^(.*?)\s*\{(\d+)\}(?::(\d+))?$/.exec(text.trim());
  if (match === null) return null;
  return { name: match[1]!.trim(), npcId: match[2]!, instanceId: match[3] ?? null };
}

/** Parses a `Name {id}` slot, e.g. the ability column. */
export function parseNamedEntity(slot: string): NamedEntity | null {
  const content = slot.trim();
  if (content.length === 0) return null;
  const match = /^(.*)\s*\{(\d+)\}$/.exec(content);
  if (match === null) return { name: content, id: "" };
  return { name: match[1]!.trim(), id: match[2]! };
}

/** Stable key for grouping metrics by actor across a fight. */
export function actorKey(actor: Actor): string {
  return actor.kind === "player" ? `p:${actor.playerId}` : `n:${actor.npcId}`;
}
