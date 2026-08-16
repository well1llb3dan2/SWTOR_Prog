import type { CombatEvent } from "@swtor/shared";
import { parseLine } from "./parseLine.js";
import { scanLine } from "./scanner.js";
import { parseLogFileName, TimelineClock, type LogFileIdentity } from "./timeline.js";

export * from "./scanner.js";
export * from "./actor.js";
export * from "./value.js";
export * from "./timeline.js";
export { parseLine } from "./parseLine.js";

export interface LogParserOptions {
  /** Combat log filename; supplies the calendar date the lines lack. */
  fileName: string;
  /** Overrides the date when the filename is non-standard. */
  identity?: Pick<LogFileIdentity, "year" | "month" | "day">;
}

/**
 * Stateful, line-at-a-time parser.
 *
 * Holds the timeline clock so timestamps stay absolute and survive midnight,
 * and tracks line numbers so any event can be traced back to its source line.
 */
export class LogParser {
  readonly #clock: TimelineClock;
  #lineNumber = 0;

  constructor(options: LogParserOptions) {
    const identity = options.identity ?? parseLogFileName(options.fileName);
    if (identity === null) {
      throw new Error(
        `Cannot determine log date from "${options.fileName}"; pass an explicit identity.`,
      );
    }
    this.#clock = new TimelineClock(identity);
  }

  /** Returns null for blank lines. */
  push(line: string): CombatEvent | null {
    this.#lineNumber += 1;
    if (line.trim().length === 0) return null;

    const scan = scanLine(line);
    const timestamp = scan === null ? 0 : (this.#clock.resolve(scan.time) ?? 0);
    return parseLine(line, { timestamp, lineNumber: this.#lineNumber });
  }

  pushAll(lines: Iterable<string>): CombatEvent[] {
    const events: CombatEvent[] = [];
    for (const line of lines) {
      const event = this.push(line);
      if (event !== null) events.push(event);
    }
    return events;
  }
}

/** Convenience for tests and the offline importer. */
export function parseLogText(fileName: string, text: string): CombatEvent[] {
  const parser = new LogParser({ fileName });
  return parser.pushAll(text.split(/\r?\n/));
}
