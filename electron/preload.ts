import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("easyMD", {
  openFile: () => ipcRenderer.invoke("file:open"),
  saveFile: (payload: { filePath?: string; content: string }) => ipcRenderer.invoke("file:save", payload),
  exportPdf: (defaultName?: string) => ipcRenderer.invoke("file:export-pdf", defaultName),
  recentFiles: () => ipcRenderer.invoke("file:recent"),
  listThemes: () => ipcRenderer.invoke("theme:list"),
  refreshThemeMenu: () => ipcRenderer.invoke("theme:refresh-menu"),
  importThemeFile: () => ipcRenderer.invoke("theme:import-file"),
  appInfo: () => ipcRenderer.invoke("app:info"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-updates"),
  openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  setDirty: (dirty: boolean) => ipcRenderer.send("document:set-dirty", dirty),
  closeAfterSave: () => ipcRenderer.send("document:close-after-save"),
  onMenu: (channel: string, callback: (payload?: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload?: unknown) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
