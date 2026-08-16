/**
 * Splits a raw combat log line into its positional slots.
 *
 * A line looks like:
 *   [time] [source] [target] [ability] [category: effect] (value) <threat>
 *
 * Splitting on `] [` is not safe. Effect names contain parentheses
 * (`Burning (Overload Saber) {…}`), position tuples contain commas and
 * negative numbers, and the value group nests a second parenthesised group
 * (`(878 ~0  (878 absorbed {…}))`). So the scanner tracks bracket depth and
 * only treats a delimiter as closing when every inner group is balanced.
 */

export interface ScannedLine {
  /** Raw `HH:MM:SS.mmm` text, still unparsed. */
  time: string;
  source: string;
  target: string;
  ability: string;
  effect: string;
  /** Contents of the trailing `(...)` group, if present. */
  value: string | null;
  /** Contents of the trailing `<...>` group: threat, or the log version tag. */
  trailing: string | null;
}

const OPENERS: Record<string, string> = { "(": ")", "{": "}", "[": "]" };

/**
 * Reads a group opened by `open` at position `start`, honouring nesting of all
 * bracket kinds. Returns the inner text and the index just past the closer.
 */
function readGroup(
  line: string,
  start: number,
  open: string,
): { content: string; next: number } | null {
  const close = OPENERS[open];
  if (close === undefined || line[start] !== open) return null;

  const stack: string[] = [close];
  for (let i = start + 1; i < line.length; i += 1) {
    const ch = line[i]!;
    const expected = stack[stack.length - 1];

    if (ch === expected) {
      stack.pop();
      if (stack.length === 0) {
        return { content: line.slice(start + 1, i), next: i + 1 };
      }
      continue;
    }
    if (OPENERS[ch] !== undefined) {
      stack.push(OPENERS[ch]!);
    }
  }
  return null;
}

function skipSpaces(line: string, i: number): number {
  let j = i;
  while (j < line.length && line[j] === " ") j += 1;
  return j;
}

/**
 * Decomposes a line, or returns null if it does not have the five leading
 * bracket groups every 7.0 log line carries.
 */
export function scanLine(line: string): ScannedLine | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  const groups: string[] = [];
  let i = 0;

  for (let slot = 0; slot < 5; slot += 1) {
    i = skipSpaces(trimmed, i);
    const read = readGroup(trimmed, i, "[");
    if (read === null) return null;
    groups.push(read.content);
    i = read.next;
  }

  let value: string | null = null;
  let trailing: string | null = null;

  i = skipSpaces(trimmed, i);
  if (trimmed[i] === "(") {
    const read = readGroup(trimmed, i, "(");
    if (read === null) return null;
    value = read.content;
    i = read.next;
  }

  i = skipSpaces(trimmed, i);
  if (trimmed[i] === "<") {
    const end = trimmed.indexOf(">", i);
    if (end === -1) return null;
    trailing = trimmed.slice(i + 1, end);
    i = end + 1;
  }

  return {
    time: groups[0]!,
    source: groups[1]!,
    target: groups[2]!,
    ability: groups[3]!,
    effect: groups[4]!,
    value,
    trailing,
  };
}
