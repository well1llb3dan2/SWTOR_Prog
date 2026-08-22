import { mkdtemp, rm, writeFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogTailer } from "../src/core/tailer.js";
import { newestLogFile, listLogFiles, defaultLogDirectory } from "../src/core/logDirectory.js";

const NAME_A = "combat_2026-08-15_20_21_10_493955.txt";
const NAME_B = "combat_2026-08-15_22_48_11_971003.txt";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "swtor-tail-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("log directory", () => {
  it("points at the game's combat log folder", () => {
    expect(defaultLogDirectory("C:\\Users\\x")).toContain("Star Wars - The Old Republic");
    expect(defaultLogDirectory("C:\\Users\\x")).toContain("CombatLogs");
  });

  it("ignores files that are not combat logs", async () => {
    await writeFile(join(dir, NAME_A), "");
    await writeFile(join(dir, "notes.txt"), "");
    await writeFile(join(dir, "combat_bad.txt"), "");

    const files = await listLogFiles(dir);
    expect(files.map((f) => f.name)).toEqual([NAME_A]);
  });

  it("returns null for a directory that does not exist", async () => {
    expect(await newestLogFile(join(dir, "missing"))).toBeNull();
  });

  // The game keeps writing to a file named for when the session began, so the
  // newest name is not necessarily the active file.
  it("picks the most recently written file, not the latest name", async () => {
    await writeFile(join(dir, NAME_B), "old");
    await new Promise((r) => setTimeout(r, 15));
    await writeFile(join(dir, NAME_A), "new");

    expect((await newestLogFile(dir))?.name).toBe(NAME_A);
  });
});

describe("LogTailer", () => {
  const line = (time: string, name = "Twistle") =>
    `[${time}] [@${name}#688363584125440|(0,0,0,0)|(1/1)] [] [] ` +
    `[Event {836045448945472}: EnterCombat {836045448945489}]`;

  it("skips existing content on first attach", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, `${line("21:00:00.000")}\n`);

    const onLines = vi.fn();
    const tailer = new LogTailer(dir, { onLines });
    await tailer.poll();

    expect(onLines).not.toHaveBeenCalled();

    await appendFile(path, `${line("21:00:01.000")}\n`);
    await tailer.poll();

    expect(onLines).toHaveBeenCalledOnce();
    expect(onLines.mock.calls[0]![0]).toHaveLength(1);
  });

  it("reads from the top when asked", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, `${line("21:00:00.000")}\n${line("21:00:01.000")}\n`);

    const onLines = vi.fn();
    await new LogTailer(dir, { onLines, startAtEnd: false }).poll();

    expect(onLines.mock.calls[0]![0]).toHaveLength(2);
  });

  it("holds back a partial line until its newline arrives", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, "");

    const onLines = vi.fn();
    const tailer = new LogTailer(dir, { onLines, startAtEnd: false });
    await tailer.poll();

    const full = line("21:00:00.000");
    await appendFile(path, full.slice(0, 20));
    await tailer.poll();
    expect(onLines).not.toHaveBeenCalled();

    await appendFile(path, `${full.slice(20)}\n`);
    await tailer.poll();
    expect(onLines.mock.calls[0]![0]).toEqual([full]);
  });

  // Character names are routinely non-ASCII, so a chunk boundary can land in
  // the middle of a multi-byte sequence.
  it("reassembles multi-byte characters split across reads", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, "");

    const onLines = vi.fn();
    const tailer = new LogTailer(dir, { onLines, startAtEnd: false, chunkSize: 8 });
    await tailer.poll();

    const text = `${line("21:00:00.000", "Mörlin")}\n`;
    await appendFile(path, text, "utf8");
    await tailer.poll();

    expect(onLines.mock.calls[0]![0][0]).toContain("Mörlin");
  });

  it("strips a byte order mark from the first read", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, `\uFEFF${line("21:00:00.000")}\n`, "utf8");

    const onLines = vi.fn();
    await new LogTailer(dir, { onLines, startAtEnd: false }).poll();

    expect(onLines.mock.calls[0]![0][0]!.startsWith("[")).toBe(true);
  });

  it("switches to a new log and reads it in full when the game rotates", async () => {
    const first = join(dir, NAME_A);
    await writeFile(first, `${line("21:00:00.000")}\n`);

    const onLines = vi.fn();
    const onFileChange = vi.fn();
    const tailer = new LogTailer(dir, { onLines, onFileChange });
    await tailer.poll();

    await new Promise((r) => setTimeout(r, 15));
    await writeFile(join(dir, NAME_B), `${line("22:00:00.000")}\n${line("22:00:01.000")}\n`);
    await tailer.poll();

    expect(onFileChange).toHaveBeenCalledTimes(2);
    expect(tailer.currentPath).toContain(NAME_B);
    expect(onLines.mock.calls.at(-1)![0]).toHaveLength(2);
  });

  it("re-reads from the start when the file is truncated under it", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, `${line("21:00:00.000")}\n${line("21:00:01.000")}\n`);

    const onLines = vi.fn();
    const tailer = new LogTailer(dir, { onLines, startAtEnd: false });
    await tailer.poll();
    expect(tailer.offset).toBeGreaterThan(0);

    await writeFile(path, `${line("21:05:00.000")}\n`);
    await tailer.poll();

    expect(onLines.mock.calls.at(-1)![0]).toHaveLength(1);
  });

  it("treats truncation as a new file generation and notifies listeners", async () => {
    const path = join(dir, NAME_A);
    await writeFile(path, `${line("21:00:00.000")}\n${line("21:00:01.000")}\n`);

    const onLines = vi.fn();
    const onFileChange = vi.fn();
    const tailer = new LogTailer(dir, { onLines, onFileChange, startAtEnd: false });
    await tailer.poll();

    await writeFile(path, `${line("21:05:00.000")}\n`);
    await tailer.poll();

    expect(onFileChange).toHaveBeenCalledTimes(2);
    expect(tailer.currentPath).toBe(path);
  });

  it("reports an empty directory instead of throwing", async () => {
    const onFileChange = vi.fn();
    const onError = vi.fn();
    await new LogTailer(dir, { onLines: vi.fn(), onFileChange, onError }).poll();

    expect(onError).not.toHaveBeenCalled();
    expect(onFileChange).not.toHaveBeenCalled();
  });
});
