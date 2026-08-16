import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Where the game writes combat logs when logging is enabled. */
export function defaultLogDirectory(home = homedir()): string {
  return join(home, "Documents", "Star Wars - The Old Republic", "CombatLogs");
}

const LOG_FILE = /^combat_\d{4}-\d{2}-\d{2}_\d{2}_\d{2}_\d{2}(?:_\d+)?\.txt$/i;

export interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
}

export async function listLogFiles(directory: string): Promise<LogFileInfo[]> {
  const entries = await readdir(directory).catch(() => null);
  if (entries === null) return [];

  const files: LogFileInfo[] = [];
  for (const name of entries) {
    if (!LOG_FILE.test(name)) continue;
    const path = join(directory, name);
    const stats = await stat(path).catch(() => null);
    if (stats === null || !stats.isFile()) continue;
    files.push({ name, path, size: stats.size, modifiedAt: stats.mtimeMs });
  }

  return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

/**
 * Newest log in the directory.
 *
 * Sorted by modification time rather than filename: the game keeps writing to a
 * file whose name reflects when the session began, so a session that started
 * earlier can still be the active one after a client restart.
 */
export async function newestLogFile(directory: string): Promise<LogFileInfo | null> {
  return (await listLogFiles(directory))[0] ?? null;
}
