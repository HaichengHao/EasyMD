/// <reference types="vite/client" />

interface EasyMDFileResult {
  filePath: string;
  content?: string;
  recentFiles: string[];
}

interface EasyMDUserTheme {
  id: string;
  name: string;
  filePath: string;
  cssText: string;
}

interface EasyMDImportedTheme {
  id: string;
  name: string;
  filePath: string;
  cssText: string;
}

interface Window {
  easyMD: {
    openFile: () => Promise<EasyMDFileResult | null>;
    saveFile: (payload: { filePath?: string; content: string }) => Promise<EasyMDFileResult | null>;
    imageDataUrl: (filePath: string) => Promise<string | null>;
    selectImage: () => Promise<string | null>;
    exportPdf: (defaultName?: string) => Promise<{ filePath: string } | null>;
    recentFiles: () => Promise<string[]>;
    listThemes: () => Promise<EasyMDUserTheme[]>;
    refreshThemeMenu: () => Promise<void>;
    importThemeFile: () => Promise<EasyMDImportedTheme | null>;
    appInfo: () => Promise<{ name: string; version: string; repository: string }>;
    checkForUpdates: () => Promise<{ hasUpdate: boolean; currentVersion: string; latestVersion?: string; releaseUrl?: string }>;
    openExternal: (url: string) => Promise<void>;
    aiChat: (payload: {
      apiKey: string;
      baseUrl: string;
      model: string;
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      temperature?: number;
    }) => Promise<{ content: string }>;
    aiListModels: (payload: { apiKey: string; baseUrl: string }) => Promise<{ models: string[]; fallback?: boolean }>;
    setDirty: (dirty: boolean) => void;
    closeAfterSave: () => void;
    onMenu: (channel: string, callback: (payload?: unknown) => void) => () => void;
  };
}
