import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  Bold,
  CheckSquare,
  Clipboard,
  Code2,
  Copy,
  Eye,
  FileCode2,
  FileText,
  Italic,
  Link,
  List,
  ListOrdered,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Quote,
  RefreshCcw,
  Save,
  ScrollText,
  Scissors,
  SplitSquareHorizontal,
  Trash2,
  Upload
} from "lucide-react";
import { applyFormat, FormatCommand } from "./editorCommands";
import { demoMarkdown, getOutline, renderMarkdown } from "./markdown";

type ViewMode = "source" | "preview" | "split";
type BuiltInThemeName = "night" | "github" | "newsprint" | "pixyll" | "whitey" | "mypage-default" | "ink-graffiti";
type ThemeName = BuiltInThemeName | "custom" | `user:${string}`;

interface ContextMenuState {
  x: number;
  y: number;
}

const zh = {
  saved: "\u5df2\u4fdd\u5b58",
  unsaved: "\u672a\u4fdd\u5b58",
  file: "\u6587\u4ef6",
  outline: "\u5927\u7eb2",
  currentDocument: "\u5f53\u524d\u6587\u6863",
  blankDocument: "\u7a7a\u767d\u6587\u6863",
  recentFile: "\u6700\u8fd1\u6587\u4ef6",
  noHeading: "\u6682\u65e0\u6807\u9898",
  open: "\u6253\u5f00",
  save: "\u4fdd\u5b58",
  source: "\u6e90\u7801",
  preview: "\u9884\u89c8",
  split: "\u6e90\u7801\u548c\u9884\u89c8",
  hideSidebar: "\u9690\u85cf\u4fa7\u8fb9\u680f",
  showSidebar: "\u663e\u793a\u4fa7\u8fb9\u680f",
  bold: "\u52a0\u7c97",
  italic: "\u659c\u4f53",
  heading: "\u6807\u9898",
  quote: "\u5f15\u7528",
  list: "\u5217\u8868",
  codeBlock: "\u4ee3\u7801\u5757",
  link: "\u94fe\u63a5",
  cut: "\u526a\u5207",
  copy: "\u590d\u5236",
  paste: "\u7c98\u8d34",
  delete: "\u5220\u9664",
  orderedList: "\u6709\u5e8f\u5217\u8868",
  unorderedList: "\u65e0\u5e8f\u5217\u8868",
  taskList: "\u4efb\u52a1\u5217\u8868",
  h1: "\u4e00\u7ea7\u6807\u9898",
  h2: "\u4e8c\u7ea7\u6807\u9898",
  formulaBlock: "\u63d2\u5165\u516c\u5f0f\u5757",
  words: "\u8bcd",
  headings: "\u4e2a\u6807\u9898",
  theme: "\u4e3b\u9898",
  uploadTheme: "\u5bfc\u5165\u4e3b\u9898",
  refreshThemes: "\u5237\u65b0\u4e3b\u9898\u76ee\u5f55",
  invalidTheme: "\u4e3b\u9898 CSS \u4e0d\u53ef\u7528\uff0c\u5df2\u5207\u56de Night\u3002"
};

const themes: Array<{ value: BuiltInThemeName; label: string }> = [
  { value: "night", label: "Night" },
  { value: "github", label: "Github" },
  { value: "newsprint", label: "Newsprint" },
  { value: "pixyll", label: "Pixyll" },
  { value: "whitey", label: "Whitey" },
  { value: "mypage-default", label: "MyPage Default" },
  { value: "ink-graffiti", label: "Ink Graffiti" }
];

const toolbar: Array<{ command: FormatCommand; label: string; icon: JSX.Element }> = [
  { command: "bold", label: zh.bold, icon: <Bold size={16} /> },
  { command: "italic", label: zh.italic, icon: <Italic size={16} /> },
  { command: "h2", label: zh.heading, icon: <AlignLeft size={16} /> },
  { command: "quote", label: zh.quote, icon: <Quote size={16} /> },
  { command: "list", label: zh.list, icon: <List size={16} /> },
  { command: "code", label: zh.codeBlock, icon: <Code2 size={16} /> },
  { command: "link", label: zh.link, icon: <Link size={16} /> }
];

function fileName(filePath?: string) {
  if (!filePath) return "Untitled.md";
  return filePath.split(/[\\/]/).pop() || filePath;
}

function compactPath(filePath?: string) {
  if (!filePath) return "Untitled.md";
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 2) return filePath;
  return `... / ${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
}

export function App() {
  const [markdown, setMarkdown] = useState(demoMarkdown());
  const [filePath, setFilePath] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [theme, setTheme] = useState<ThemeName>("night");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"files" | "outline">("files");
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [sourceLineNumbers, setSourceLineNumbers] = useState(true);
  const [codeLineNumbers, setCodeLineNumbers] = useState(true);
  const [showScrollbars, setShowScrollbars] = useState(true);
  const [customThemeName, setCustomThemeName] = useState<string>();
  const [userThemes, setUserThemes] = useState<EasyMDUserTheme[]>([]);
  const customThemeInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const sourceLinesRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const html = useMemo(() => renderMarkdown(markdown, { codeLineNumbers }), [markdown, codeLineNumbers]);
  const outline = useMemo(() => getOutline(markdown), [markdown]);
  const words = useMemo(() => markdown.trim() ? markdown.trim().split(/\s+/).length : 0, [markdown]);
  const sourceLineCount = useMemo(() => Math.max(1, markdown.split("\n").length), [markdown]);
  const themeClass = theme.startsWith("user:") ? "theme-user" : `theme-${theme}`;

  async function openFile() {
    const result = await window.easyMD.openFile();
    if (!result) return;
    setMarkdown(result.content || "");
    setFilePath(result.filePath);
    setRecentFiles(result.recentFiles);
    setDirty(false);
  }

  async function saveFile(forceSaveAs = false, closeAfterSave = false) {
    const result = await window.easyMD.saveFile({ filePath: forceSaveAs ? undefined : filePath, content: markdown });
    if (!result) return;
    setFilePath(result.filePath);
    setRecentFiles(result.recentFiles);
    setDirty(false);
    if (closeAfterSave) window.easyMD.closeAfterSave();
  }

  function newFile() {
    setMarkdown(demoMarkdown());
    setFilePath(undefined);
    setDirty(false);
  }

  function runFormat(command: FormatCommand) {
    const editor = editorRef.current;
    if (!editor) return;
    const result = applyFormat(markdown, command, editor.selectionStart, editor.selectionEnd);
    setMarkdown(result.value);
    setDirty(true);
    setContextMenu(null);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function insertRaw(text: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    setMarkdown(markdown.slice(0, start) + text + markdown.slice(end));
    setDirty(true);
    setContextMenu(null);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function syncScroll(from: HTMLElement, to: HTMLElement) {
    if (syncing.current) return;
    const fromMax = Math.max(1, from.scrollHeight - from.clientHeight);
    const toMax = Math.max(1, to.scrollHeight - to.clientHeight);
    syncing.current = true;
    to.scrollTop = (from.scrollTop / fromMax) * toMax;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }

  function syncSourceLineScroll(scrollTop: number) {
    if (sourceLinesRef.current) sourceLinesRef.current.scrollTop = scrollTop;
  }

  function showContextMenu(event: React.MouseEvent) {
    if (!(event.target as HTMLElement).closest(".source-pane, .preview-pane")) return;
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 284),
      y: Math.min(event.clientY, window.innerHeight - 336)
    });
  }

  async function nativeEdit(command: "cut" | "copy" | "paste" | "delete") {
    editorRef.current?.focus();
    if (command === "paste") {
      const text = await navigator.clipboard.readText().catch(() => "");
      insertRaw(text);
      return;
    }
    document.execCommand(command === "delete" ? "delete" : command);
    setContextMenu(null);
  }

  function validateThemeCss(cssText: string) {
    if (!cssText.trim() || cssText.length > 240_000) return false;
    if (!/(\.app|:root|--canvas|--paper|--text|--brand)/.test(cssText)) return false;
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      return sheet.cssRules.length > 0;
    } catch {
      return false;
    }
  }

  function applyThemeStyle(id: string, cssText: string) {
    const style = document.getElementById(id) || document.createElement("style");
    style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
  }

  async function refreshUserThemes(selectedTheme = theme) {
    const discovered = await window.easyMD.listThemes();
    const usable = discovered.filter((item) => validateThemeCss(item.cssText));
    setUserThemes(usable);
    const activeTheme = usable.find((item) => item.id === selectedTheme);
    if (activeTheme) {
      applyThemeStyle("directory-theme", activeTheme.cssText);
      setTheme(activeTheme.id as ThemeName);
      return;
    }
    if (String(selectedTheme).startsWith("user:")) {
      document.getElementById("directory-theme")?.remove();
      setTheme("night");
      localStorage.setItem("easymd.theme", "night");
      window.alert(zh.invalidTheme);
    }
  }

  async function importTheme(file?: File) {
    if (!file) return;
    const cssText = await file.text();
    if (!validateThemeCss(cssText)) {
      document.getElementById("custom-theme")?.remove();
      setCustomThemeName(undefined);
      setTheme("night");
      localStorage.removeItem("easymd.customThemeCss");
      localStorage.removeItem("easymd.customThemeName");
      localStorage.setItem("easymd.theme", "night");
      window.alert(zh.invalidTheme);
      return;
    }
    document.getElementById("directory-theme")?.remove();
    applyThemeStyle("custom-theme", cssText);
    const nextName = file.name.replace(/\.css$/i, "");
    setCustomThemeName(nextName);
    localStorage.setItem("easymd.customThemeCss", cssText);
    localStorage.setItem("easymd.customThemeName", nextName);
    localStorage.setItem("easymd.theme", "custom");
    setTheme("custom");
  }

  function chooseTheme(nextTheme: ThemeName) {
    if (nextTheme.startsWith("user:")) {
      const userTheme = userThemes.find((item) => item.id === nextTheme);
      if (!userTheme || !validateThemeCss(userTheme.cssText)) {
        document.getElementById("directory-theme")?.remove();
        setTheme("night");
        localStorage.setItem("easymd.theme", "night");
        window.alert(zh.invalidTheme);
        return;
      }
      document.getElementById("custom-theme")?.remove();
      applyThemeStyle("directory-theme", userTheme.cssText);
    } else {
      document.getElementById("directory-theme")?.remove();
    }
    setTheme(nextTheme);
  }

  useEffect(() => {
    const savedCustomCss = localStorage.getItem("easymd.customThemeCss");
    const savedCustomName = localStorage.getItem("easymd.customThemeName");
    if (savedCustomCss && validateThemeCss(savedCustomCss)) {
      applyThemeStyle("custom-theme", savedCustomCss);
      setCustomThemeName(savedCustomName || "Custom Theme");
    } else if (savedCustomCss) {
      document.getElementById("custom-theme")?.remove();
      localStorage.removeItem("easymd.customThemeCss");
      localStorage.removeItem("easymd.customThemeName");
      localStorage.setItem("easymd.theme", "night");
    }

    const savedTheme = localStorage.getItem("easymd.theme") as ThemeName | null;
    const builtInTheme = themes.some((item) => item.value === savedTheme);
    if (savedTheme && (builtInTheme || (savedTheme === "custom" && savedCustomCss && validateThemeCss(savedCustomCss)))) {
      setTheme(savedTheme);
    }
    void refreshUserThemes(savedTheme || "night");
  }, []);

  useEffect(() => {
    if (theme === "custom" && !customThemeName) return;
    localStorage.setItem("easymd.theme", theme);
  }, [theme, customThemeName]);

  useEffect(() => {
    window.easyMD.recentFiles().then(setRecentFiles).catch(() => undefined);
    const off = [
      window.easyMD.onMenu("menu:new", newFile),
      window.easyMD.onMenu("menu:open", openFile),
      window.easyMD.onMenu("menu:save", () => void saveFile(false)),
      window.easyMD.onMenu("menu:save-then-close", () => void saveFile(false, true)),
      window.easyMD.onMenu("menu:save-as", () => void saveFile(true)),
      window.easyMD.onMenu("menu:view", (mode) => setViewMode(mode as ViewMode)),
      window.easyMD.onMenu("menu:theme", (name) => setTheme(name as ThemeName)),
      window.easyMD.onMenu("menu:toggle-sidebar", () => setSidebarOpen((value) => !value)),
      window.easyMD.onMenu("menu:format", (command) => runFormat(command as FormatCommand))
    ];
    return () => off.forEach((dispose) => dispose());
  });

  useEffect(() => {
    window.easyMD.setDirty(dirty);
  }, [dirty]);

  useEffect(() => {
    const hide = () => setContextMenu(null);
    const onCopy = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest("[data-copy-code]");
      if (!button) return;
      const code = button.closest(".md-code-block")?.querySelector("code")?.textContent || "";
      void navigator.clipboard.writeText(code);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    };
    document.addEventListener("click", hide);
    document.addEventListener("click", onCopy);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("click", hide);
      document.removeEventListener("click", onCopy);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return (
    <div className={`app ${themeClass} ${theme === "custom" ? "custom-theme" : ""} ${showScrollbars ? "" : "hide-scrollbars"}`} onContextMenu={showContextMenu}>
      <div className="workspace">
        <aside className={sidebarOpen ? "sidebar" : "sidebar collapsed"}>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((value) => !value)} title={sidebarOpen ? zh.hideSidebar : zh.showSidebar}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          {sidebarOpen && (
            <>
              <div className="sidebar-tabs">
                <button className={sidebarTab === "files" ? "active" : ""} onClick={() => setSidebarTab("files")}>{zh.file}</button>
                <button className={sidebarTab === "outline" ? "active" : ""} onClick={() => setSidebarTab("outline")}>{zh.outline}</button>
              </div>
              {sidebarTab === "files" ? (
                <div className="file-list">
                  <button className="file-card active">
                    <small>{zh.currentDocument}</small>
                    <strong>{fileName(filePath)}</strong>
                    <span>{markdown.split("\n")[0]?.replace(/^#\s*/, "") || zh.blankDocument}</span>
                  </button>
                  {recentFiles.map((item) => (
                    <button className="file-card" key={item}>
                      <small>{zh.recentFile}</small>
                      <strong>{fileName(item)}</strong>
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <nav className="outline-list">
                  {outline.length ? outline.map((item) => (
                    <button
                      key={item.id}
                      style={{ paddingLeft: `${12 + (item.level - 1) * 14}px` }}
                      onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      {item.text}
                    </button>
                  )) : <p>{zh.noHeading}</p>}
                </nav>
              )}
            </>
          )}
        </aside>

        <main className="editor-shell">
          <div className="tool-row">
            <div className="tool-group">
              <button title={zh.open} onClick={openFile}><FileText size={16} /></button>
              <button title={zh.save} onClick={() => void saveFile(false)}><Save size={16} /></button>
            </div>
            <div className="tool-group">
              {toolbar.map((item) => (
                <button title={item.label} key={item.command} onClick={() => runFormat(item.command)}>{item.icon}</button>
              ))}
            </div>
            <div className="tool-group mode-group">
              <button className={showScrollbars ? "active" : ""} title="显示滚动条" onClick={() => setShowScrollbars((value) => !value)}><ScrollText size={16} /></button>
              <button className={sourceLineNumbers ? "active" : ""} title="源码行号" onClick={() => setSourceLineNumbers((value) => !value)}><ListOrdered size={16} /></button>
              <button className={codeLineNumbers ? "active" : ""} title="代码块行号" onClick={() => setCodeLineNumbers((value) => !value)}><Code2 size={16} /></button>
              <button className={viewMode === "source" ? "active" : ""} title={zh.source} onClick={() => setViewMode("source")}><FileCode2 size={16} /></button>
              <button className={viewMode === "preview" ? "active" : ""} title={zh.preview} onClick={() => setViewMode("preview")}><Eye size={16} /></button>
              <button className={viewMode === "split" ? "active" : ""} title={zh.split} onClick={() => setViewMode("split")}><SplitSquareHorizontal size={16} /></button>
            </div>
            <div className="theme-tools">
              <Palette size={15} />
              <select
                title={zh.theme}
                value={theme}
                onChange={(event) => chooseTheme(event.target.value as ThemeName)}
              >
                {themes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                {userThemes.length > 0 && <optgroup label="Themes Folder">
                  {userThemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </optgroup>}
                {theme === "custom" && <option value="custom">{customThemeName || "Custom Theme"}</option>}
              </select>
              <button title={zh.refreshThemes} onClick={() => void refreshUserThemes()}><RefreshCcw size={16} /></button>
              <button title={zh.uploadTheme} onClick={() => customThemeInputRef.current?.click()}><Upload size={16} /></button>
              <input
                ref={customThemeInputRef}
                type="file"
                accept=".css,text/css"
                hidden
                onChange={(event) => {
                  void importTheme(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          <section className={`document-grid mode-${viewMode}`}>
            {(viewMode === "source" || viewMode === "split") && (
              <div className={`source-wrap ${sourceLineNumbers ? "with-line-numbers" : ""}`}>
                {sourceLineNumbers && (
                  <div className="source-line-numbers" ref={sourceLinesRef} aria-hidden="true">
                    {Array.from({ length: sourceLineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
                  </div>
                )}
                <textarea
                  ref={editorRef}
                  className="source-pane"
                  value={markdown}
                  spellCheck={false}
                  onChange={(event) => {
                    setMarkdown(event.target.value);
                    setDirty(true);
                  }}
                  onScroll={(event) => {
                    syncSourceLineScroll(event.currentTarget.scrollTop);
                    if (previewRef.current) syncScroll(event.currentTarget, previewRef.current);
                  }}
                />
              </div>
            )}
            {(viewMode === "preview" || viewMode === "split") && (
              <div
                ref={previewRef}
                className="preview-pane markdown-body"
                dangerouslySetInnerHTML={{ __html: html }}
                onScroll={(event) => editorRef.current && syncScroll(event.currentTarget, editorRef.current)}
              />
            )}
          </section>
        </main>
      </div>

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <div className="context-icons">
            <button title={zh.cut} onClick={() => void nativeEdit("cut")}><Scissors size={16} /></button>
            <button title={zh.copy} onClick={() => void nativeEdit("copy")}><Copy size={16} /></button>
            <button title={zh.paste} onClick={() => void nativeEdit("paste")}><Clipboard size={16} /></button>
            <button title={zh.delete} onClick={() => void nativeEdit("delete")}><Trash2 size={16} /></button>
          </div>
          <button className="context-row" onClick={() => void nativeEdit("copy")}>{zh.copy}</button>
          <button className="context-row" onClick={() => void nativeEdit("paste")}>{zh.paste}</button>
          <div className="context-grid">
            <button title={zh.bold} onClick={() => runFormat("bold")}><Bold size={16} /></button>
            <button title={zh.italic} onClick={() => runFormat("italic")}><Italic size={16} /></button>
            <button title={zh.codeBlock} onClick={() => runFormat("code")}><Code2 size={16} /></button>
            <button title={zh.link} onClick={() => runFormat("link")}><Link size={16} /></button>
            <button title={zh.quote} onClick={() => runFormat("quote")}><Quote size={16} /></button>
            <button title={zh.orderedList} onClick={() => insertRaw("\n1. item\n")}><ListOrdered size={16} /></button>
            <button title={zh.unorderedList} onClick={() => runFormat("list")}><List size={16} /></button>
            <button title={zh.taskList} onClick={() => insertRaw("\n- [ ] task\n")}><CheckSquare size={16} /></button>
          </div>
          <button className="context-row" onClick={() => runFormat("h1")}>{zh.h1}</button>
          <button className="context-row" onClick={() => runFormat("h2")}>{zh.h2}</button>
          <button className="context-row" onClick={() => insertRaw("\n$$\nE = mc^2\n$$\n")}>{zh.formulaBlock}</button>
        </div>
      )}

      <footer className="status-bar">
        <span className="breadcrumb" title={filePath || "Untitled.md"}>{compactPath(filePath)}</span>
        <span>{dirty ? zh.unsaved : zh.saved}</span>
        <span>{words} {zh.words}</span>
        <span>{outline.length} {zh.headings}</span>
        <span>{viewMode === "split" ? zh.split : viewMode === "source" ? zh.source : zh.preview}</span>
        <span>{theme}</span>
      </footer>
    </div>
  );
}
