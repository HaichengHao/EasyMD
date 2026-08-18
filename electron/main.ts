import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

let recentFiles: string[] = [];
let documentDirty = false;

interface UserTheme {
  id: string;
  name: string;
  filePath: string;
  cssText: string;
}

function t(value: string) {
  return value;
}

function getRecentFiles() {
  return recentFiles.filter(Boolean);
}

function rememberFile(filePath: string) {
  recentFiles = [filePath, ...getRecentFiles().filter((item) => item !== filePath)].slice(0, 12);
}

function projectRoot() {
  return path.join(__dirname, "..");
}

function themeIdFromFile(filePath: string) {
  return `user:${path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}`;
}

function themeNameFromCss(cssText: string, filePath: string) {
  const match = cssText.match(/@theme-name\s+(.+?)\s*;?/i);
  return (match?.[1] || path.basename(filePath, path.extname(filePath))).replace(/^["']|["']$/g, "").trim();
}

async function ensureThemesDir() {
  const themesDir = path.join(projectRoot(), "themes");
  await fs.mkdir(themesDir, { recursive: true });
  return themesDir;
}

async function readUserThemes(): Promise<UserTheme[]> {
  const themesDir = await ensureThemesDir();
  const entries = await fs.readdir(themesDir, { withFileTypes: true });
  const cssFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".css"))
    .map((entry) => path.join(themesDir, entry.name));

  const themes = await Promise.all(cssFiles.map(async (filePath) => {
    const cssText = await fs.readFile(filePath, "utf8");
    return {
      id: themeIdFromFile(filePath),
      name: themeNameFromCss(cssText, filePath),
      filePath,
      cssText
    };
  }));
  return themes.sort((a, b) => a.name.localeCompare(b.name));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    icon: path.join(__dirname, "../assets/icon.png"),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#25292f",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  const send = (channel: string, payload?: unknown) => win.webContents.send(channel, payload);

  win.on("close", (event) => {
    if (!documentDirty) return;
    const choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      buttons: [t("\u53d6\u6d88"), t("\u4e0d\u4fdd\u5b58"), t("\u4fdd\u5b58")],
      defaultId: 2,
      cancelId: 0,
      title: "EasyMD",
      message: t("\u6587\u6863\u8fd8\u6ca1\u6709\u4fdd\u5b58"),
      detail: t("\u5173\u95ed\u524d\u8981\u4fdd\u5b58\u5f53\u524d Markdown \u6587\u6863\u5417\uff1f")
    });
    if (choice === 0) {
      event.preventDefault();
      return;
    }
    if (choice === 2) {
      event.preventDefault();
      send("menu:save-then-close");
    }
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: t("\u6587\u4ef6"),
      submenu: [
        { label: t("\u65b0\u5efa"), accelerator: "CmdOrCtrl+N", click: () => send("menu:new") },
        { label: t("\u6253\u5f00..."), accelerator: "CmdOrCtrl+O", click: () => send("menu:open") },
        { label: t("\u4fdd\u5b58"), accelerator: "CmdOrCtrl+S", click: () => send("menu:save") },
        { label: t("\u53e6\u5b58\u4e3a..."), accelerator: "CmdOrCtrl+Shift+S", click: () => send("menu:save-as") },
        { type: "separator" },
        { role: "quit", label: t("\u9000\u51fa") }
      ]
    },
    {
      label: t("\u7f16\u8f91"),
      submenu: [
        { role: "undo", label: t("\u64a4\u9500") },
        { role: "redo", label: t("\u91cd\u505a") },
        { type: "separator" },
        { role: "cut", label: t("\u526a\u5207") },
        { role: "copy", label: t("\u590d\u5236") },
        { role: "paste", label: t("\u7c98\u8d34") }
      ]
    },
    {
      label: t("\u6bb5\u843d"),
      submenu: [
        { label: t("\u4e00\u7ea7\u6807\u9898"), accelerator: "CmdOrCtrl+1", click: () => send("menu:format", "h1") },
        { label: t("\u4e8c\u7ea7\u6807\u9898"), accelerator: "CmdOrCtrl+2", click: () => send("menu:format", "h2") },
        { label: t("\u4e09\u7ea7\u6807\u9898"), accelerator: "CmdOrCtrl+3", click: () => send("menu:format", "h3") },
        { label: t("\u5f15\u7528"), accelerator: "CmdOrCtrl+Shift+Q", click: () => send("menu:format", "quote") },
        { label: t("\u4ee3\u7801\u5757"), accelerator: "CmdOrCtrl+Shift+K", click: () => send("menu:format", "code") }
      ]
    },
    {
      label: t("\u683c\u5f0f"),
      submenu: [
        { label: t("\u52a0\u7c97"), accelerator: "CmdOrCtrl+B", click: () => send("menu:format", "bold") },
        { label: t("\u659c\u4f53"), accelerator: "CmdOrCtrl+I", click: () => send("menu:format", "italic") },
        { label: t("\u5220\u9664\u7ebf"), accelerator: "Alt+Shift+5", click: () => send("menu:format", "strike") },
        { label: t("\u94fe\u63a5"), accelerator: "CmdOrCtrl+K", click: () => send("menu:format", "link") },
        { label: t("\u5185\u8054\u516c\u5f0f"), click: () => send("menu:format", "inlineMath") }
      ]
    },
    {
      label: t("\u89c6\u56fe"),
      submenu: [
        { label: t("\u6e90\u7801"), accelerator: "CmdOrCtrl+/", click: () => send("menu:view", "source") },
        { label: t("\u9884\u89c8"), accelerator: "CmdOrCtrl+Shift+/", click: () => send("menu:view", "preview") },
        { label: t("\u6e90\u7801\u548c\u9884\u89c8"), accelerator: "CmdOrCtrl+Alt+/", click: () => send("menu:view", "split") },
        { type: "separator" },
        { label: t("\u663e\u793a/\u9690\u85cf\u4fa7\u8fb9\u680f"), accelerator: "CmdOrCtrl+Shift+L", click: () => send("menu:toggle-sidebar") },
        { role: "togglefullscreen", label: t("\u5207\u6362\u5168\u5c4f") },
        { role: "toggleDevTools", label: t("\u5f00\u53d1\u8005\u5de5\u5177") }
      ]
    },
    {
      label: t("\u4e3b\u9898"),
      submenu: [
        ["Night", "night"],
        ["Github", "github"],
        ["Newsprint", "newsprint"],
        ["Pixyll", "pixyll"],
        ["Whitey", "whitey"],
        ["MyPage Default", "mypage-default"],
        ["Ink Graffiti", "ink-graffiti"]
      ].map(([label, value]) => ({
        label,
        click: () => send("menu:theme", value)
      }))
    },
    {
      label: t("\u5e2e\u52a9"),
      submenu: [{ label: "EasyMD", click: () => shell.openExternal("https://github.com/HaichengHao/EasyMD") }]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "txt"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  rememberFile(filePath);
  return { filePath, content, recentFiles: getRecentFiles() };
});

ipcMain.handle("file:save", async (_event, payload: { filePath?: string; content: string }) => {
  let filePath = payload.filePath;
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      defaultPath: "Untitled.md",
      filters: [{ name: "Markdown", extensions: ["md"] }]
    });
    if (result.canceled || !result.filePath) return null;
    filePath = result.filePath;
  }
  await fs.writeFile(filePath, payload.content, "utf8");
  rememberFile(filePath);
  return { filePath, recentFiles: getRecentFiles() };
});

ipcMain.handle("file:recent", () => getRecentFiles());
ipcMain.handle("theme:list", () => readUserThemes());
ipcMain.on("document:set-dirty", (_event, dirty: boolean) => {
  documentDirty = dirty;
});
ipcMain.on("document:close-after-save", (event) => {
  documentDirty = false;
  BrowserWindow.fromWebContents(event.sender)?.close();
});
