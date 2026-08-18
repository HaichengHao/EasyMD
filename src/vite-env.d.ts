/// <reference types="vite/client" />

interface EasyMDFileResult {
  filePath: string;
  content?: string;
  recentFiles: string[];
}

interface Window {
  easyMD: {
    openFile: () => Promise<EasyMDFileResult | null>;
    saveFile: (payload: { filePath?: string; content: string }) => Promise<EasyMDFileResult | null>;
    recentFiles: () => Promise<string[]>;
    onMenu: (channel: string, callback: (payload?: unknown) => void) => () => void;
  };
}
