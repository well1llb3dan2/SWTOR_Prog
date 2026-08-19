import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defaultLogDirectory } from "./logDirectory.js";

export interface DesktopSettings {
  serverUrl: string;
  /** Ingest token. Stored locally only; never logged or sent to the renderer. */
  token: string;
  logDirectory: string;
  autoStart: boolean;
}

export function defaultSettings(): DesktopSettings {
  return {
    serverUrl: "https://infamous-command.onrender.com",
    token: "",
    logDirectory: defaultLogDirectory(),
    autoStart: false,
  };
}

export async function loadSettings(path: string): Promise<DesktopSettings> {
  const raw = await readFile(path, "utf8").catch(() => null);
  if (raw === null) return defaultSettings();

  try {
    const parsed = JSON.parse(raw) as Partial<DesktopSettings>;
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(path: string, settings: DesktopSettings): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 2), "utf8");
}

export function settingsPath(userDataDir: string): string {
  return join(userDataDir, "settings.json");
}

/** Settings safe to hand to the renderer; the token is replaced by a flag. */
export function redactSettings(settings: DesktopSettings): Omit<DesktopSettings, "token"> & {
  hasToken: boolean;
} {
  const { token, ...rest } = settings;
  return { ...rest, hasToken: token.length > 0 };
}
