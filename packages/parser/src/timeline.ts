/**
 * Reconstructs absolute timestamps from a combat log.
 *
 * Log lines carry only `HH:MM:SS.mmm`. The calendar date lives in the
 * filename, and a raid running past midnight will wrap the clock, so the
 * timeline has to be tracked statefully as lines are consumed.
 */

const FILE_NAME = /^combat_(\d{4})-(\d{2})-(\d{2})_(\d{2})_(\d{2})_(\d{2})(?:_(\d+))?\.txt$/i;
const LINE_TIME = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;

const MS_PER_DAY = 86_400_000;
/** A backwards jump smaller than this is jitter; larger means midnight passed. */
const ROLLOVER_THRESHOLD_MS = 12 * 60 * 60 * 1000;

export interface LogFileIdentity {
  year: number;
  /** 1-based. */
  month: number;
  day: number;
  /** Epoch ms of the timestamp encoded in the filename. */
  startedAt: number;
}

export function parseLogFileName(fileName: string): LogFileIdentity | null {
  const base = fileName.replace(/^.*[\\/]/, "");
  const match = FILE_NAME.exec(base);
  if (match === null) return null;

  const [, y, mo, d, h, mi, s] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  // Logs are written in the player's local time, so build the instant locally.
  const startedAt = new Date(year, month - 1, day, Number(h), Number(mi), Number(s)).getTime();
  return { year, month, day, startedAt };
}

export class TimelineClock {
  readonly #baseMidnight: number;
  #dayOffset = 0;
  #previousTimeOfDay: number | null = null;

  constructor(identity: Pick<LogFileIdentity, "year" | "month" | "day">) {
    this.#baseMidnight = new Date(identity.year, identity.month - 1, identity.day).getTime();
  }

  /** Returns epoch ms for a `HH:MM:SS.mmm` token, or null if malformed. */
  resolve(timeText: string): number | null {
    const match = LINE_TIME.exec(timeText.trim());
    if (match === null) return null;

    const [, h, m, s, frac] = match;
    const millis = frac === undefined ? 0 : Number(frac.padEnd(3, "0"));
    const timeOfDay = Number(h) * 3_600_000 + Number(m) * 60_000 + Number(s) * 1000 + millis;

    if (
      this.#previousTimeOfDay !== null &&
      this.#previousTimeOfDay - timeOfDay > ROLLOVER_THRESHOLD_MS
    ) {
      this.#dayOffset += 1;
    }
    this.#previousTimeOfDay = timeOfDay;

    return this.#baseMidnight + this.#dayOffset * MS_PER_DAY + timeOfDay;
  }
}
