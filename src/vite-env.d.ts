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

interface Window {
  easyMD: {
    openFile: () => Promise<EasyMDFileResult | null>;
    saveFile: (payload: { filePath?: string; content: string }) => Promise<EasyMDFileResult | null>;
    recentFiles: () => Promise<string[]>;
    listThemes: () => Promise<EasyMDUserTheme[]>;
    setDirty: (dirty: boolean) => void;
    closeAfterSave: () => void;
    onMenu: (channel: string, callback: (payload?: unknown) => void) => () => void;
  };
}
