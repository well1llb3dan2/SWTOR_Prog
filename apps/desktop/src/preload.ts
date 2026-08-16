import { contextBridge, ipcRenderer } from "electron";

/**
 * The renderer gets a narrow, explicit surface.
 *
 * No Node access and no ingest token: the token stays in the main process so a
 * compromised renderer cannot read or exfiltrate it.
 */
contextBridge.exposeInMainWorld("desktop", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings: unknown) => ipcRenderer.invoke("settings:save", settings),
  pickLogDirectory: () => ipcRenderer.invoke("dialog:log-directory"),
  pickReplayFile: () => ipcRenderer.invoke("dialog:replay-file"),
  redeemLinkCode: (code: string) => ipcRenderer.invoke("link:redeem", code),
  startLive: () => ipcRenderer.invoke("stream:start-live"),
  startReplay: (filePath: string, speed: number) =>
    ipcRenderer.invoke("stream:start-replay", filePath, speed),
  stop: () => ipcRenderer.invoke("stream:stop"),
  onStatus: (handler: (status: unknown) => void) => {
    const listener = (_event: unknown, status: unknown) => handler(status);
    ipcRenderer.on("status", listener);
    return () => ipcRenderer.removeListener("status", listener);
  },
});
