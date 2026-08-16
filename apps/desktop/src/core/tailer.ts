import { open, stat } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
import { newestLogFile, type LogFileInfo } from "./logDirectory.js";

export interface TailerEvents {
  onLines: (lines: string[], file: LogFileInfo) => void;
  onFileChange?: (file: LogFileInfo | null) => void;
  onError?: (error: unknown) => void;
}

export interface TailerOptions extends TailerEvents {
  pollIntervalMs?: number;
  /** Skip whatever is already in the file when first attaching. */
  startAtEnd?: boolean;
  chunkSize?: number;
}

const DEFAULT_POLL_MS = 500;
const DEFAULT_CHUNK = 1 << 20;

/**
 * Follows the active combat log.
 *
 * Polls `stat` rather than using `fs.watch`: on Windows, watch events for
 * appends to a file the game holds open are unreliable and can stall for
 * seconds, which would stutter a live meter. Reads are incremental from the
 * last byte offset and never lock the file, so the game is unaffected.
 */
export class LogTailer {
  readonly #directory: string;
  readonly #options: Required<Omit<TailerOptions, keyof TailerEvents>> & TailerEvents;

  #timer: NodeJS.Timeout | null = null;
  #currentPath: string | null = null;
  #offset = 0;
  #partial = "";
  #decoder = new StringDecoder("utf8");
  #polling = false;

  constructor(directory: string, options: TailerOptions) {
    this.#directory = directory;
    this.#options = {
      pollIntervalMs: DEFAULT_POLL_MS,
      startAtEnd: true,
      chunkSize: DEFAULT_CHUNK,
      ...options,
    };
  }

  get currentPath(): string | null {
    return this.#currentPath;
  }

  get offset(): number {
    return this.#offset;
  }

  start(): void {
    if (this.#timer !== null) return;
    this.#timer = setInterval(() => void this.poll(), this.#options.pollIntervalMs);
    this.#timer.unref?.();
    void this.poll();
  }

  stop(): void {
    if (this.#timer === null) return;
    clearInterval(this.#timer);
    this.#timer = null;
  }

  /** One polling pass. Exposed so tests can drive it without timers. */
  async poll(): Promise<void> {
    if (this.#polling) return;
    this.#polling = true;
    try {
      await this.#pollOnce();
    } catch (error: unknown) {
      this.#options.onError?.(error);
    } finally {
      this.#polling = false;
    }
  }

  async #pollOnce(): Promise<void> {
    const newest = await newestLogFile(this.#directory);
    if (newest === null) {
      if (this.#currentPath !== null) {
        this.#currentPath = null;
        this.#options.onFileChange?.(null);
      }
      return;
    }

    if (newest.path !== this.#currentPath) {
      const first = this.#currentPath === null;
      this.#reset(newest.path);
      // Only the very first attach skips history; a log that rotates mid-raid
      // is a new session and must be read from the top.
      this.#offset = first && this.#options.startAtEnd ? newest.size : 0;
      this.#options.onFileChange?.(newest);
    }

    const stats = await stat(newest.path);
    if (stats.size < this.#offset) {
      // The file shrank, so it was replaced or truncated under us.
      this.#reset(newest.path);
    }
    if (stats.size === this.#offset) return;

    const lines = await this.#readFrom(newest.path, stats.size);
    if (lines.length > 0) {
      this.#options.onLines(lines, { ...newest, size: stats.size });
    }
  }

  #reset(path: string): void {
    this.#currentPath = path;
    this.#offset = 0;
    this.#partial = "";
    this.#decoder = new StringDecoder("utf8");
  }

  async #readFrom(path: string, upTo: number): Promise<string[]> {
    const handle = await open(path, "r");
    const lines: string[] = [];

    try {
      const buffer = Buffer.allocUnsafe(this.#options.chunkSize);
      while (this.#offset < upTo) {
        const wanted = Math.min(this.#options.chunkSize, upTo - this.#offset);
        const { bytesRead } = await handle.read(buffer, 0, wanted, this.#offset);
        if (bytesRead === 0) break;
        this.#offset += bytesRead;

        // The decoder holds back partial multi-byte sequences, which matters
        // because character names are routinely non-ASCII.
        let text = this.#decoder.write(buffer.subarray(0, bytesRead));
        if (this.#partial.length === 0 && lines.length === 0) text = text.replace(/^\uFEFF/, "");

        this.#partial += text;
        const parts = this.#partial.split(/\r?\n/);
        this.#partial = parts.pop() ?? "";
        for (const part of parts) {
          if (part.length > 0) lines.push(part);
        }
      }
    } finally {
      await handle.close();
    }

    return lines;
  }
}
