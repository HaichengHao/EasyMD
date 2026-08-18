import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("easyMD", {
  openFile: () => ipcRenderer.invoke("file:open"),
  saveFile: (payload: { filePath?: string; content: string }) => ipcRenderer.invoke("file:save", payload),
  recentFiles: () => ipcRenderer.invoke("file:recent"),
  onMenu: (channel: string, callback: (payload?: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload?: unknown) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
