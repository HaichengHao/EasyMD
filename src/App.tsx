import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { history, redo, undo } from "@codemirror/commands";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import {
  AlignLeft,
  Bold,
  ChevronDown,
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
  PanelLeftClose,
  PanelLeftOpen,
  Quote,
  Save,
  Search,
  ScrollText,
  Settings,
  Scissors,
  SplitSquareHorizontal,
  Trash2,
  X
} from "lucide-react";
import { applyFormat, FormatCommand } from "./editorCommands";
import { demoMarkdown, getOutline, renderMarkdown } from "./markdown";

type ViewMode = "source" | "preview" | "split";
type BuiltInThemeName = "night" | "github" | "newsprint" | "pixyll" | "whitey" | "mypage-default" | "ink-graffiti";
type ThemeName = BuiltInThemeName | "custom" | `user:${string}`;
type ShortcutAction = "save" | "open" | "newFile" | "undo" | "redo" | "bold" | "italic" | "link" | "codeBlock" | "source" | "preview" | "split" | "toggleSidebar" | "settings" | "find" | "replace";
type Language = "zh-CN" | "en-US";

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
  undo: "\u64a4\u9500",
  redo: "\u91cd\u505a",
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
  themesFolder: "\u4e3b\u9898\u6587\u4ef6\u5939",
  customTheme: "\u81ea\u5b9a\u4e49\u4e3b\u9898",
  settings: "\u8bbe\u7f6e",
  find: "\u67e5\u627e",
  replace: "\u66ff\u6362",
  replaceWith: "\u66ff\u6362\u4e3a",
  previousMatch: "\u4e0a\u4e00\u4e2a",
  nextMatch: "\u4e0b\u4e00\u4e2a",
  replaceCurrent: "\u66ff\u6362\u5f53\u524d",
  replaceAll: "\u5168\u90e8\u66ff\u6362",
  noMatches: "\u65e0\u5339\u914d",
  about: "\u5173\u4e8e",
  version: "\u7248\u672c",
  updateAvailable: "\u53d1\u73b0 EasyMD \u65b0\u7248\u672c",
  updateNow: "\u7acb\u5373\u66f4\u65b0",
  later: "\u7a0d\u540e",
  shortcuts: "\u5feb\u6377\u952e",
  language: "\u8bed\u8a00",
  chinese: "\u7b80\u4f53\u4e2d\u6587",
  english: "English",
  showScrollbars: "\u663e\u793a\u6eda\u52a8\u6761",
  sourceLineNumbers: "\u6e90\u7801\u884c\u53f7",
  codeLineNumbers: "\u4ee3\u7801\u5757\u884c\u53f7",
  resetShortcuts: "\u6062\u590d\u9ed8\u8ba4",
  close: "\u5173\u95ed",
  zoom: "\u7f29\u653e",
  copied: "\u5df2\u590d\u5236",
  invalidTheme: "\u4e3b\u9898 CSS \u4e0d\u53ef\u7528\uff0c\u5df2\u5207\u56de Night\u3002"
};

const en: typeof zh = {
  saved: "Saved",
  unsaved: "Unsaved",
  file: "Files",
  outline: "Outline",
  currentDocument: "Current Document",
  blankDocument: "Blank Document",
  recentFile: "Recent File",
  noHeading: "No headings",
  open: "Open",
  save: "Save",
  undo: "Undo",
  redo: "Redo",
  source: "Source",
  preview: "Preview",
  split: "Source and Preview",
  hideSidebar: "Hide Sidebar",
  showSidebar: "Show Sidebar",
  bold: "Bold",
  italic: "Italic",
  heading: "Heading",
  quote: "Quote",
  list: "List",
  codeBlock: "Code Block",
  link: "Link",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  delete: "Delete",
  orderedList: "Ordered List",
  unorderedList: "Unordered List",
  taskList: "Task List",
  h1: "Heading 1",
  h2: "Heading 2",
  formulaBlock: "Formula Block",
  words: "words",
  headings: "headings",
  theme: "Theme",
  uploadTheme: "Import Theme",
  refreshThemes: "Refresh Theme Folder",
  themesFolder: "Themes Folder",
  customTheme: "Custom Theme",
  settings: "Settings",
  find: "Find",
  replace: "Replace",
  replaceWith: "Replace with",
  previousMatch: "Previous",
  nextMatch: "Next",
  replaceCurrent: "Replace",
  replaceAll: "Replace All",
  noMatches: "No matches",
  about: "About",
  version: "Version",
  updateAvailable: "A new EasyMD version is available",
  updateNow: "Update Now",
  later: "Later",
  shortcuts: "Shortcuts",
  language: "Language",
  chinese: "Simplified Chinese",
  english: "English",
  showScrollbars: "Show Scrollbars",
  sourceLineNumbers: "Source Line Numbers",
  codeLineNumbers: "Code Block Line Numbers",
  resetShortcuts: "Reset Defaults",
  close: "Close",
  zoom: "Zoom",
  copied: "Copied",
  invalidTheme: "Theme CSS is invalid. EasyMD has switched back to Night."
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

interface SelectOption<T extends string> {
  value: T;
  label: string;
  group?: string;
}

function CustomSelect<T extends string>({
  title,
  value,
  options,
  onChange,
  className = ""
}: {
  title: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((item) => item.value === value) || options[0];
  const groups = options.reduce<Array<{ name?: string; items: Array<SelectOption<T>> }>>((acc, item) => {
    const last = acc[acc.length - 1];
    if (last && last.name === item.group) {
      last.items.push(item);
    } else {
      acc.push({ name: item.group, items: [item] });
    }
    return acc;
  }, []);

  return (
    <div className={`custom-select ${open ? "open" : ""} ${className}`} onBlur={() => setOpen(false)} tabIndex={-1}>
      <button type="button" title={title} className="custom-select-trigger" onClick={() => setOpen((value) => !value)}>
        <span>{active?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="custom-select-menu">
          {groups.map((group, groupIndex) => (
            <div className="custom-select-group" key={`${group.name || "default"}-${groupIndex}`}>
              {group.name && <div className="custom-select-label">{group.name}</div>}
              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={item.value === value ? "selected" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const toolbar: Array<{ command: FormatCommand; labelKey: keyof typeof zh; icon: JSX.Element }> = [
  { command: "bold", labelKey: "bold", icon: <Bold size={16} /> },
  { command: "italic", labelKey: "italic", icon: <Italic size={16} /> },
  { command: "h2", labelKey: "heading", icon: <AlignLeft size={16} /> },
  { command: "quote", labelKey: "quote", icon: <Quote size={16} /> },
  { command: "list", labelKey: "list", icon: <List size={16} /> },
  { command: "code", labelKey: "codeBlock", icon: <Code2 size={16} /> },
  { command: "link", labelKey: "link", icon: <Link size={16} /> }
];

const defaultShortcuts: Record<ShortcutAction, string> = {
  save: "Ctrl+S",
  open: "Ctrl+O",
  newFile: "Ctrl+N",
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z",
  bold: "Ctrl+B",
  italic: "Ctrl+I",
  link: "Ctrl+K",
  codeBlock: "Ctrl+Shift+K",
  source: "Ctrl+/",
  preview: "Ctrl+Shift+/",
  split: "Ctrl+Alt+/",
  toggleSidebar: "Ctrl+Shift+L",
  settings: "Ctrl+,",
  find: "Ctrl+F",
  replace: "Ctrl+H"
};

const shortcutLabelKeys: Record<ShortcutAction, keyof typeof zh> = {
  save: "save",
  open: "open",
  newFile: "blankDocument",
  undo: "undo",
  redo: "redo",
  bold: "bold",
  italic: "italic",
  link: "link",
  codeBlock: "codeBlock",
  source: "source",
  preview: "preview",
  split: "split",
  toggleSidebar: "hideSidebar",
  settings: "settings",
  find: "find",
  replace: "replace"
};

const sourceHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "#f9d5ff", fontWeight: "700" },
  { tag: tags.strong, color: "#f8fafc", fontWeight: "700" },
  { tag: tags.emphasis, color: "#c4b5fd", fontStyle: "italic" },
  { tag: tags.monospace, color: "#93c5fd" },
  { tag: tags.link, color: "#7dd3fc" },
  { tag: tags.url, color: "#67e8f9" },
  { tag: tags.quote, color: "#a7f3d0" },
  { tag: tags.list, color: "#facc15" },
  { tag: tags.keyword, color: "#fb7185" },
  { tag: tags.string, color: "#93c5fd" },
  { tag: tags.number, color: "#facc15" },
  { tag: tags.comment, color: "#94a3b8", fontStyle: "italic" }
]);

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

function loadShortcuts() {
  try {
    const saved = JSON.parse(localStorage.getItem("easymd.shortcuts") || "{}") as Partial<Record<ShortcutAction, string>>;
    return { ...defaultShortcuts, ...saved };
  } catch {
    return defaultShortcuts;
  }
}

function eventToShortcut(event: KeyboardEvent | React.KeyboardEvent) {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  const rawKey = event.key === " " ? "Space" : event.key;
  const key = rawKey.length === 1 ? rawKey.toUpperCase() : rawKey[0].toUpperCase() + rawKey.slice(1);
  if (!["Control", "Shift", "Alt", "Meta"].includes(key)) parts.push(key);
  return parts.join("+");
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [appInfo, setAppInfo] = useState<{ name: string; version: string; repository: string }>({ name: "EasyMD", version: "0.0.0", repository: "https://github.com/HaichengHao/EasyMD" });
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion: string; releaseUrl: string } | null>(null);
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem("easymd.language") as Language) || "zh-CN");
  const [shortcuts, setShortcuts] = useState<Record<ShortcutAction, string>>(() => loadShortcuts());
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem("easymd.zoom") || 100));
  const [splitRatio, setSplitRatio] = useState(() => Number(localStorage.getItem("easymd.splitRatio") || 50));
  const [draggingSplit, setDraggingSplit] = useState(false);
  const [customThemeName, setCustomThemeName] = useState<string>();
  const [userThemes, setUserThemes] = useState<EasyMDUserTheme[]>([]);
  const customThemeInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const lineNumberCompartmentRef = useRef(new Compartment());
  const previewRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const t = language === "zh-CN" ? zh : en;
  const html = useMemo(() => renderMarkdown(markdown, { codeLineNumbers, copyLabel: t.copy }), [markdown, codeLineNumbers, t.copy]);
  const outline = useMemo(() => getOutline(markdown), [markdown]);
  const words = useMemo(() => markdown.trim() ? markdown.trim().split(/\s+/).length : 0, [markdown]);
  const languageOptions = useMemo<Array<SelectOption<Language>>>(() => [
    { value: "zh-CN", label: t.chinese },
    { value: "en-US", label: t.english }
  ], [t.chinese, t.english]);
  const findMatches = useMemo(() => {
    if (!findQuery) return [];
    const matches: Array<{ from: number; to: number }> = [];
    const lowerSource = markdown.toLocaleLowerCase();
    const lowerQuery = findQuery.toLocaleLowerCase();
    let index = lowerSource.indexOf(lowerQuery);
    while (index >= 0) {
      matches.push({ from: index, to: index + findQuery.length });
      index = lowerSource.indexOf(lowerQuery, index + Math.max(1, findQuery.length));
    }
    return matches;
  }, [findQuery, markdown]);
  const themeClass = theme.startsWith("user:") ? "theme-user" : `theme-${theme}`;
  const documentStyle = {
    "--content-zoom": zoom / 100,
    "--split-left": `${splitRatio}%`
  } as CSSProperties;

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
    const editor = editorViewRef.current;
    if (!editor) return;
    const selection = editor.state.selection.main;
    const result = applyFormat(markdown, command, selection.from, selection.to);
    setMarkdown(result.value);
    setDirty(true);
    setContextMenu(null);
    requestAnimationFrame(() => {
      editor.focus();
      editor.dispatch({ selection: { anchor: result.selectionStart, head: result.selectionEnd } });
    });
  }

  function runUndo() {
    const editor = editorViewRef.current;
    if (editor) undo(editor);
  }

  function runRedo() {
    const editor = editorViewRef.current;
    if (editor) redo(editor);
  }

  function revealMatch(index: number) {
    const match = findMatches[index];
    const editor = editorViewRef.current;
    if (!match || !editor) return;
    editor.focus();
    editor.dispatch({
      selection: { anchor: match.from, head: match.to },
      effects: EditorView.scrollIntoView(match.from, { y: "center" })
    });
  }

  function openFindPanel(showReplace = false) {
    if (viewMode === "preview") setViewMode("split");
    setFindOpen(true);
    setReplaceOpen(showReplace);
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>(".find-input")?.focus();
      document.querySelector<HTMLInputElement>(".find-input")?.select();
    });
  }

  function moveMatch(direction: 1 | -1) {
    if (!findMatches.length) return;
    const next = (matchIndex + direction + findMatches.length) % findMatches.length;
    setMatchIndex(next);
    revealMatch(next);
  }

  function replaceCurrentMatch() {
    const match = findMatches[matchIndex];
    if (!match) return;
    const next = markdown.slice(0, match.from) + replaceText + markdown.slice(match.to);
    setMarkdown(next);
    setDirty(true);
    requestAnimationFrame(() => {
      const nextIndex = Math.min(matchIndex, Math.max(0, findMatches.length - 2));
      setMatchIndex(nextIndex);
    });
  }

  function replaceAllMatches() {
    if (!findQuery || !findMatches.length) return;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setMarkdown(markdown.replace(new RegExp(escaped, "gi"), replaceText));
    setDirty(true);
    setMatchIndex(0);
  }

  function insertRaw(text: string) {
    const editor = editorViewRef.current;
    if (!editor) return;
    const selection = editor.state.selection.main;
    const start = selection.from;
    const end = selection.to;
    setMarkdown(markdown.slice(0, start) + text + markdown.slice(end));
    setDirty(true);
    setContextMenu(null);
    requestAnimationFrame(() => {
      editor.focus();
      editor.dispatch({ selection: { anchor: start + text.length } });
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

  function showContextMenu(event: React.MouseEvent) {
    if (!(event.target as HTMLElement).closest(".source-pane, .preview-pane")) return;
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 284),
      y: Math.min(event.clientY, window.innerHeight - 336)
    });
  }

  async function nativeEdit(command: "cut" | "copy" | "paste" | "delete") {
    const editor = editorViewRef.current;
    editor?.focus();
    if (command === "paste") {
      const text = await navigator.clipboard.readText().catch(() => "");
      insertRaw(text);
      return;
    }
    if (!editor) return;
    const selection = editor.state.selection.main;
    const selectedText = editor.state.sliceDoc(selection.from, selection.to);
    if (command === "copy" || command === "cut") {
      await navigator.clipboard.writeText(selectedText).catch(() => undefined);
    }
    if (command === "cut" || command === "delete") {
      editor.dispatch({
        changes: { from: selection.from, to: selection.to, insert: "" },
        selection: { anchor: selection.from }
      });
    }
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
      window.alert(t.invalidTheme);
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
      window.alert(t.invalidTheme);
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
        window.alert(t.invalidTheme);
        return;
      }
      document.getElementById("custom-theme")?.remove();
      applyThemeStyle("directory-theme", userTheme.cssText);
    } else {
      document.getElementById("directory-theme")?.remove();
    }
    setTheme(nextTheme);
  }

  function updateShortcut(action: ShortcutAction, value: string) {
    const next = { ...shortcuts, [action]: value };
    setShortcuts(next);
    localStorage.setItem("easymd.shortcuts", JSON.stringify(next));
  }

  function resetShortcuts() {
    setShortcuts(defaultShortcuts);
    localStorage.removeItem("easymd.shortcuts");
  }

  function setZoomLevel(nextZoom: number) {
    const normalized = Math.min(160, Math.max(70, nextZoom));
    setZoom(normalized);
    localStorage.setItem("easymd.zoom", String(normalized));
  }

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    localStorage.setItem("easymd.language", nextLanguage);
  }

  function runShortcutAction(action: ShortcutAction) {
    if (action === "save") void saveFile(false);
    if (action === "open") void openFile();
    if (action === "newFile") newFile();
    if (action === "undo") runUndo();
    if (action === "redo") runRedo();
    if (action === "bold") runFormat("bold");
    if (action === "italic") runFormat("italic");
    if (action === "link") runFormat("link");
    if (action === "codeBlock") runFormat("code");
    if (action === "source") setViewMode("source");
    if (action === "preview") setViewMode("preview");
    if (action === "split") setViewMode("split");
    if (action === "toggleSidebar") setSidebarOpen((value) => !value);
    if (action === "settings") setSettingsOpen(true);
    if (action === "find") openFindPanel(false);
    if (action === "replace") openFindPanel(true);
  }

  async function checkUpdates(showWhenCurrent = false) {
    const result = await window.easyMD.checkForUpdates();
    if (result.hasUpdate && result.latestVersion && result.releaseUrl) {
      const dismissed = localStorage.getItem("easymd.dismissedUpdate");
      if (showWhenCurrent || dismissed !== result.latestVersion) {
        setUpdateInfo({ latestVersion: result.latestVersion, releaseUrl: result.releaseUrl });
      }
    } else if (showWhenCurrent) {
      window.alert(`EasyMD ${result.currentVersion}`);
    }
  }

  useEffect(() => {
    const savedCustomCss = localStorage.getItem("easymd.customThemeCss");
    const savedCustomName = localStorage.getItem("easymd.customThemeName");
    if (savedCustomCss && validateThemeCss(savedCustomCss)) {
      applyThemeStyle("custom-theme", savedCustomCss);
      setCustomThemeName(savedCustomName || t.customTheme);
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
    if (!findOpen || !findMatches.length) {
      setMatchIndex(0);
      return;
    }
    const normalized = Math.min(matchIndex, findMatches.length - 1);
    if (normalized !== matchIndex) {
      setMatchIndex(normalized);
      return;
    }
    revealMatch(normalized);
  }, [findOpen, findMatches.length, matchIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = eventToShortcut(event);
      const match = (Object.entries(shortcuts) as Array<[ShortcutAction, string]>).find(([, value]) => value === shortcut);
      if (!match) return;
      event.preventDefault();
      runShortcutAction(match[0]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts, markdown, filePath, viewMode, sidebarOpen]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      if (!(event.target as HTMLElement).closest(".editor-shell")) return;
      event.preventDefault();
      setZoomLevel(zoom + (event.deltaY < 0 ? 5 : -5));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoom]);

  useEffect(() => {
    if (!draggingSplit) return;
    const onMouseMove = (event: MouseEvent) => {
      const grid = document.querySelector(".document-grid.mode-split");
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      const normalized = Math.min(75, Math.max(25, next));
      setSplitRatio(normalized);
      localStorage.setItem("easymd.splitRatio", String(normalized));
    };
    const onMouseUp = () => setDraggingSplit(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingSplit]);

  useEffect(() => {
    if (viewMode === "preview") {
      editorViewRef.current?.destroy();
      editorViewRef.current = null;
      return;
    }
    if (!editorRef.current || editorViewRef.current) return;
    const lineNumberCompartment = lineNumberCompartmentRef.current;
    const view = new EditorView({
      parent: editorRef.current,
      state: EditorState.create({
        doc: markdown,
        extensions: [
          markdownLanguage(),
          syntaxHighlighting(sourceHighlightStyle),
          history(),
          lineNumberCompartment.of(sourceLineNumbers ? lineNumbers() : []),
          EditorView.lineWrapping,
          EditorView.domEventHandlers({
            scroll: (_event, view) => {
              if (previewRef.current) syncScroll(view.scrollDOM, previewRef.current);
            }
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setMarkdown(update.state.doc.toString());
              setDirty(true);
            }
          })
        ]
      })
    });
    editorViewRef.current = view;
    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [viewMode]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === markdown) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: markdown }
    });
  }, [markdown]);

  useEffect(() => {
    editorViewRef.current?.dispatch({
      effects: lineNumberCompartmentRef.current.reconfigure(sourceLineNumbers ? lineNumbers() : [])
    });
  }, [sourceLineNumbers]);

  useEffect(() => {
    window.easyMD.appInfo().then(setAppInfo).catch(() => undefined);
    void checkUpdates(false);
  }, []);

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
      window.easyMD.onMenu("menu:refresh-themes", () => void refreshUserThemes()),
      window.easyMD.onMenu("menu:import-theme", () => customThemeInputRef.current?.click()),
      window.easyMD.onMenu("menu:toggle-sidebar", () => setSidebarOpen((value) => !value)),
      window.easyMD.onMenu("menu:undo", runUndo),
      window.easyMD.onMenu("menu:redo", runRedo),
      window.easyMD.onMenu("menu:format", (command) => runFormat(command as FormatCommand)),
      window.easyMD.onMenu("menu:check-updates", () => void checkUpdates(true))
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
      button.textContent = t.copied;
      window.setTimeout(() => {
        button.textContent = t.copy;
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
  }, [t.copy, t.copied]);

  return (
    <div className={`app ${themeClass} ${theme === "custom" ? "custom-theme" : ""} ${showScrollbars ? "" : "hide-scrollbars"}`} onContextMenu={showContextMenu}>
      <div className="workspace">
        <aside className={sidebarOpen ? "sidebar" : "sidebar collapsed"}>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((value) => !value)} title={sidebarOpen ? t.hideSidebar : t.showSidebar}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          {sidebarOpen && (
            <>
              <div className="sidebar-tabs">
                <button className={sidebarTab === "files" ? "active" : ""} onClick={() => setSidebarTab("files")}>{t.file}</button>
                <button className={sidebarTab === "outline" ? "active" : ""} onClick={() => setSidebarTab("outline")}>{t.outline}</button>
              </div>
              {sidebarTab === "files" ? (
                <div className="file-list">
                  <button className="file-card active">
                    <small>{t.currentDocument}</small>
                    <strong>{fileName(filePath)}</strong>
                    <span>{markdown.split("\n")[0]?.replace(/^#\s*/, "") || t.blankDocument}</span>
                  </button>
                  {recentFiles.map((item) => (
                    <button className="file-card" key={item}>
                      <small>{t.recentFile}</small>
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
                  )) : <p>{t.noHeading}</p>}
                </nav>
              )}
            </>
          )}
        </aside>

        <main className="editor-shell">
          <div className="tool-row">
            <div className="tool-group">
              <button title={t.open} onClick={openFile}><FileText size={16} /></button>
              <button title={t.save} onClick={() => void saveFile(false)}><Save size={16} /></button>
            </div>
            <div className="tool-group">
              {toolbar.map((item) => (
                <button title={t[item.labelKey]} key={item.command} onClick={() => runFormat(item.command)}>{item.icon}</button>
              ))}
            </div>
            <div className="tool-group mode-group">
              <button className={showScrollbars ? "active" : ""} title={t.showScrollbars} onClick={() => setShowScrollbars((value) => !value)}><ScrollText size={16} /></button>
              <button className={sourceLineNumbers ? "active" : ""} title={t.sourceLineNumbers} onClick={() => setSourceLineNumbers((value) => !value)}><ListOrdered size={16} /></button>
              <button className={codeLineNumbers ? "active" : ""} title={t.codeLineNumbers} onClick={() => setCodeLineNumbers((value) => !value)}><Code2 size={16} /></button>
              <button className={viewMode === "source" ? "active" : ""} title={t.source} onClick={() => setViewMode("source")}><FileCode2 size={16} /></button>
              <button className={viewMode === "preview" ? "active" : ""} title={t.preview} onClick={() => setViewMode("preview")}><Eye size={16} /></button>
              <button className={viewMode === "split" ? "active" : ""} title={t.split} onClick={() => setViewMode("split")}><SplitSquareHorizontal size={16} /></button>
              <button className={findOpen ? "active" : ""} title={t.find} onClick={() => openFindPanel(false)}><Search size={16} /></button>
              <button className={settingsOpen ? "active" : ""} title={t.settings} onClick={() => setSettingsOpen(true)}><Settings size={16} /></button>
            </div>
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

          <section className={`document-grid mode-${viewMode}`} style={documentStyle}>
            {(viewMode === "source" || viewMode === "split") && (
              <div className={`source-wrap ${sourceLineNumbers ? "with-line-numbers" : ""}`}>
                <div ref={editorRef} className="source-pane" />
              </div>
            )}
            {viewMode === "split" && (
              <div
                className={draggingSplit ? "split-resizer dragging" : "split-resizer"}
                role="separator"
                aria-orientation="vertical"
                onMouseDown={() => setDraggingSplit(true)}
              />
            )}
            {(viewMode === "preview" || viewMode === "split") && (
              <div
                ref={previewRef}
                className="preview-pane markdown-body"
                dangerouslySetInnerHTML={{ __html: html }}
                onScroll={(event) => editorViewRef.current && syncScroll(event.currentTarget, editorViewRef.current.scrollDOM)}
              />
            )}
          </section>
        </main>
      </div>

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <div className="context-icons">
            <button title={t.cut} onClick={() => void nativeEdit("cut")}><Scissors size={16} /></button>
            <button title={t.copy} onClick={() => void nativeEdit("copy")}><Copy size={16} /></button>
            <button title={t.paste} onClick={() => void nativeEdit("paste")}><Clipboard size={16} /></button>
            <button title={t.delete} onClick={() => void nativeEdit("delete")}><Trash2 size={16} /></button>
          </div>
          <button className="context-row" onClick={() => void nativeEdit("copy")}>{t.copy}</button>
          <button className="context-row" onClick={() => void nativeEdit("paste")}>{t.paste}</button>
          <div className="context-grid">
            <button title={t.bold} onClick={() => runFormat("bold")}><Bold size={16} /></button>
            <button title={t.italic} onClick={() => runFormat("italic")}><Italic size={16} /></button>
            <button title={t.codeBlock} onClick={() => runFormat("code")}><Code2 size={16} /></button>
            <button title={t.link} onClick={() => runFormat("link")}><Link size={16} /></button>
            <button title={t.quote} onClick={() => runFormat("quote")}><Quote size={16} /></button>
            <button title={t.orderedList} onClick={() => insertRaw("\n1. item\n")}><ListOrdered size={16} /></button>
            <button title={t.unorderedList} onClick={() => runFormat("list")}><List size={16} /></button>
            <button title={t.taskList} onClick={() => insertRaw("\n- [ ] task\n")}><CheckSquare size={16} /></button>
          </div>
          <button className="context-row" onClick={() => runFormat("h1")}>{t.h1}</button>
          <button className="context-row" onClick={() => runFormat("h2")}>{t.h2}</button>
          <button className="context-row" onClick={() => insertRaw("\n$$\nE = mc^2\n$$\n")}>{t.formulaBlock}</button>
        </div>
      )}

      {findOpen && (
        <section className="find-panel">
          <div className="find-row">
            <input
              className="find-input"
              value={findQuery}
              placeholder={t.find}
              onChange={(event) => {
                setFindQuery(event.target.value);
                setMatchIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  moveMatch(event.shiftKey ? -1 : 1);
                }
                if (event.key === "Escape") setFindOpen(false);
              }}
            />
            <span className="find-count">{findQuery ? (findMatches.length ? `${matchIndex + 1}/${findMatches.length}` : t.noMatches) : ""}</span>
            <button title={t.previousMatch} onClick={() => moveMatch(-1)}>{t.previousMatch}</button>
            <button title={t.nextMatch} onClick={() => moveMatch(1)}>{t.nextMatch}</button>
            <button className={replaceOpen ? "active" : ""} title={t.replace} onClick={() => setReplaceOpen((value) => !value)}>{t.replace}</button>
            <button title={t.close} onClick={() => setFindOpen(false)}><X size={15} /></button>
          </div>
          {replaceOpen && (
            <div className="find-row replace-row">
              <input
                value={replaceText}
                placeholder={t.replaceWith}
                onChange={(event) => setReplaceText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setFindOpen(false);
                }}
              />
              <button onClick={replaceCurrentMatch}>{t.replaceCurrent}</button>
              <button onClick={replaceAllMatches}>{t.replaceAll}</button>
            </div>
          )}
        </section>
      )}

      {updateInfo && (
        <section className="update-toast">
          <div>
            <strong>{t.updateAvailable}</strong>
            <span>{`EasyMD ${appInfo.version} -> ${updateInfo.latestVersion}`}</span>
          </div>
          <button onClick={() => void window.easyMD.openExternal(updateInfo.releaseUrl)}>{t.updateNow}</button>
          <button onClick={() => {
            localStorage.setItem("easymd.dismissedUpdate", updateInfo.latestVersion);
            setUpdateInfo(null);
          }}>{t.later}</button>
        </section>
      )}

      {settingsOpen && (
        <div className="settings-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-panel" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <strong>{t.settings}</strong>
              <button onClick={() => setSettingsOpen(false)}>{t.close}</button>
            </header>
            <div className="settings-section">
              <h3>{t.language}</h3>
              <CustomSelect
                title={t.language}
                value={language}
                options={languageOptions}
                onChange={setLanguage}
                className="settings-select"
              />
            </div>
            <div className="settings-section">
              <h3>{t.shortcuts}</h3>
              <div className="shortcut-list">
                {(Object.keys(defaultShortcuts) as ShortcutAction[]).map((action) => (
                  <label key={action} className="shortcut-row">
                    <span>{t[shortcutLabelKeys[action]]}</span>
                    <input
                      value={shortcuts[action]}
                      readOnly
                      onKeyDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const next = eventToShortcut(event);
                        if (next) updateShortcut(action, next);
                      }}
                    />
                  </label>
                ))}
              </div>
              <button className="settings-secondary" onClick={resetShortcuts}>{t.resetShortcuts}</button>
            </div>
            <div className="settings-section">
              <h3>{t.zoom}</h3>
              <input
                type="range"
                min="70"
                max="160"
                step="5"
                value={zoom}
                onChange={(event) => setZoomLevel(Number(event.target.value))}
              />
              <span>{zoom}%</span>
            </div>
            <div className="settings-section about-section">
              <h3>{t.about}</h3>
              <p>{appInfo.name} {t.version} {appInfo.version}</p>
              <button className="settings-secondary" onClick={() => void window.easyMD.openExternal(appInfo.repository)}>GitHub</button>
              <button className="settings-secondary" onClick={() => void checkUpdates(true)}>{t.updateNow}</button>
            </div>
          </section>
        </div>
      )}

      <footer className="status-bar">
        <span className="breadcrumb" title={filePath || "Untitled.md"}>{compactPath(filePath)}</span>
        <span>{dirty ? t.unsaved : t.saved}</span>
        <span>{words} {t.words}</span>
        <span>{outline.length} {t.headings}</span>
        <span>{zoom}%</span>
        <span>{viewMode === "split" ? t.split : viewMode === "source" ? t.source : t.preview}</span>
        <span>{theme}</span>
      </footer>
    </div>
  );
}
