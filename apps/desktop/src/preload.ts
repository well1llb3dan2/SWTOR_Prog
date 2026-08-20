import { contextBridge, ipcRenderer } from "electron";

/**
 * The renderer gets a narrow, explicit surface.
 *
 * No Node access and no ingest token: the token stays in the main process so a
 * compromised renderer cannot read or exfiltrate it.
 */
contextBridge.exposeInMainWorld("desktop", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  getStatus: () => ipcRenderer.invoke("status:get"),
  saveSettings: (settings: unknown) => ipcRenderer.invoke("settings:save", settings),
  pickLogDirectory: () => ipcRenderer.invoke("dialog:log-directory"),
  pickReplayFile: () => ipcRenderer.invoke("dialog:replay-file"),
  loginWithDiscord: () => ipcRenderer.invoke("auth:discord"),
  signOutDiscord: () => ipcRenderer.invoke("auth:signout"),
  checkApiHealth: () => ipcRenderer.invoke("api:health"),
  listReports: (limit: number) => ipcRenderer.invoke("api:reports", limit),
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
