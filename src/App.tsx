import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { autocompletion, CompletionContext, startCompletion } from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { history, redo, undo } from "@codemirror/commands";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import {
  AlignLeft,
  AlertTriangle,
  Bold,
  Bot,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Clipboard,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileText,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Quote,
  Save,
  Search,
  ScrollText,
  Send,
  Settings,
  Scissors,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { applyFormat, FormatCommand } from "./editorCommands";
import { demoMarkdown, getOutline, renderMarkdown } from "./markdown";

type ViewMode = "source" | "preview" | "split";
type BuiltInThemeName = "night" | "github" | "newsprint" | "pixyll" | "whitey" | "mypage-default" | "ink-graffiti";
type ThemeName = BuiltInThemeName | "custom" | `user:${string}`;
type ShortcutAction = "save" | "open" | "newFile" | "undo" | "redo" | "bold" | "italic" | "link" | "codeBlock" | "source" | "preview" | "split" | "toggleSidebar" | "settings" | "find" | "replace" | "aiAssistant";
type Language = "zh-CN" | "en-US";
type ToastTone = "success" | "warning" | "error" | "info";
type AiMessage = {
  role: "user" | "assistant";
  content: string;
  actionTitle?: string;
  mode?: "insert" | "replace";
  from?: number;
  to?: number;
};
type AiResultState = {
  title: string;
  content: string;
  mode: "insert" | "replace";
  from?: number;
  to?: number;
};
type AiMemorySettings = {
  enabled: boolean;
  preference: string;
};
type AiAppliedDraft = {
  messageIndex: number;
  before: string;
};

const AI_SECRET_RESET_VERSION = "0.2.1";
let aiSecretsResetChecked = false;

interface ToastState {
  id: number;
  title: string;
  detail?: string;
  fullDetail?: string;
  tone: ToastTone;
}

interface ConfirmState {
  title: string;
  detail: string;
  primary: string;
  secondary?: string;
  cancel: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

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
  image: "\u56fe\u7247",
  insertImage: "\u63d2\u5165\u56fe\u7247",
  imageAlt: "\u56fe\u7247\u8bf4\u660e",
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
  exportPdf: "\u5bfc\u51fa PDF",
  exportPdfDone: "PDF \u5df2\u5bfc\u51fa",
  exportPdfCancelled: "\u5df2\u53d6\u6d88 PDF \u5bfc\u51fa",
  exportPdfFailed: "PDF \u5bfc\u51fa\u5931\u8d25",
  imageLoadFailed: "\u56fe\u7247\u52a0\u8f7d\u5931\u8d25",
  fileOpened: "\u6587\u4ef6\u5df2\u6253\u5f00",
  fileSaved: "\u6587\u6863\u5df2\u4fdd\u5b58",
  themeImported: "\u4e3b\u9898\u5df2\u5bfc\u5165",
  themesRefreshed: "\u4e3b\u9898\u5217\u8868\u5df2\u5237\u65b0",
  aboutTitle: "\u5173\u4e8e EasyMD",
  currentVersion: "\u5f53\u524d\u7248\u672c",
  noUpdate: "\u5df2\u662f\u6700\u65b0\u7248\u672c",
  unsavedTitle: "\u6587\u6863\u8fd8\u6ca1\u6709\u4fdd\u5b58",
  unsavedDetail: "\u5173\u95ed\u524d\u8981\u4fdd\u5b58\u5f53\u524d Markdown \u6587\u6863\u5417\uff1f",
  dontSave: "\u4e0d\u4fdd\u5b58",
  resetShortcuts: "\u6062\u590d\u9ed8\u8ba4",
  close: "\u5173\u95ed",
  cancel: "\u53d6\u6d88",
  zoom: "\u7f29\u653e",
  copied: "\u5df2\u590d\u5236",
  invalidTheme: "\u4e3b\u9898 CSS \u4e0d\u53ef\u7528\uff0c\u5df2\u5207\u56de Night\u3002",
  aiAssistant: "AI \u52a9\u624b",
  openAiAssistant: "\u6253\u5f00 AI \u52a9\u624b",
  aiSettings: "AI \u8bbe\u7f6e",
  aiApiKey: "API Key",
  aiBaseUrl: "Base URL",
  aiModel: "\u6a21\u578b",
  aiFetchModels: "\u83b7\u53d6\u6a21\u578b",
  aiModelsLoaded: "\u6a21\u578b\u5217\u8868\u5df2\u66f4\u65b0",
  aiModelsFallback: "\u5df2\u4f7f\u7528\u5185\u7f6e\u6a21\u578b\u5019\u9009",
  aiModelsEmpty: "\u6ca1\u6709\u8bfb\u53d6\u5230\u53ef\u7528\u6a21\u578b",
  aiModelFetchFailed: "\u83b7\u53d6\u6a21\u578b\u5931\u8d25",
  aiAskPlaceholder: "\u8be2\u95ee\u5f53\u524d Markdown \u6587\u6863...",
  aiSend: "\u53d1\u9001",
  aiNoApiKey: "\u8bf7\u5148\u5728\u8bbe\u7f6e\u91cc\u586b\u5199 AI API Key\u3002",
  aiNoBaseUrl: "\u8bf7\u5148\u5728\u8bbe\u7f6e\u91cc\u586b\u5199 AI Base URL\u3002",
  aiNoModel: "\u8bf7\u5148\u5728\u8bbe\u7f6e\u91cc\u586b\u5199 AI \u6a21\u578b\u3002",
  aiWorking: "AI \u6b63\u5728\u601d\u8003...",
  aiFailed: "AI \u8bf7\u6c42\u5931\u8d25",
  errorDetails: "\u9519\u8bef\u8be6\u60c5",
  details: "\u8be6\u60c5",
  copyDetails: "\u590d\u5236\u8be6\u60c5",
  aiChatIntro: "\u6211\u53ef\u4ee5\u5e2e\u4f60\u603b\u7ed3\u3001\u6539\u5199\u3001\u7ffb\u8bd1\u6216\u68c0\u67e5\u5f53\u524d Markdown\u3002",
  aiPrivacyHint: "API Key \u4ec5\u4fdd\u5b58\u5728\u672c\u673a localStorage\uff0c\u8bf7\u786e\u8ba4\u4f60\u4f7f\u7528\u7684\u63a5\u53e3\u4fe1\u4efb\u5f53\u524d\u6587\u6863\u5185\u5bb9\u3002",
  aiMemory: "AI \u8bb0\u5fc6",
  aiMemoryEnabled: "\u4fdd\u5b58 AI \u5bf9\u8bdd\u8bb0\u5f55",
  aiMemoryPreference: "\u5168\u5c40\u504f\u597d",
  aiMemoryPlaceholder: "\u4f8b\u5982\uff1a\u9ed8\u8ba4\u7ffb\u8bd1\u6210\u7b80\u4f53\u4e2d\u6587\uff0c\u56de\u7b54\u7b80\u6d01\uff0c\u4fdd\u7559 Markdown \u7ed3\u6784\u3002",
  aiMemoryHint: "AI \u8bb0\u5fc6\u4ec5\u4fdd\u5b58\u5728\u672c\u673a localStorage\uff0c\u53ef\u968f\u65f6\u6e05\u9664\u3002",
  aiMemoryCleared: "AI \u8bb0\u5fc6\u5df2\u6e05\u9664",
  clearAiMemory: "\u6e05\u9664 AI \u8bb0\u5fc6",
  aiSummarizeSelection: "AI \u603b\u7ed3\u9009\u4e2d",
  aiPolishSelection: "AI \u6da6\u8272\u9009\u4e2d",
  aiTranslateSelection: "AI \u7ffb\u8bd1\u9009\u4e2d",
  aiNoSelection: "\u8bf7\u5148\u5728\u6e90\u7801\u533a\u9009\u4e2d\u8981\u5904\u7406\u7684\u6587\u672c\u3002",
  aiResult: "AI \u7ed3\u679c",
  aiReplaceSelection: "\u66ff\u6362\u9009\u4e2d",
  aiInsertAtCursor: "\u63d2\u5165\u5230\u5149\u6807",
  aiApplyToEditor: "\u5e94\u7528\u5230\u7f16\u8f91\u533a",
  aiReplaceDocument: "\u66ff\u6362\u5168\u6587",
  aiUndoApply: "\u64a4\u9500\u5e94\u7528",
  apply: "\u5e94\u7528",
  discard: "\u4e22\u5f03"
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
  image: "Image",
  insertImage: "Insert Image",
  imageAlt: "Image description",
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
  exportPdf: "Export PDF",
  exportPdfDone: "PDF Exported",
  exportPdfCancelled: "PDF export cancelled",
  exportPdfFailed: "PDF export failed",
  imageLoadFailed: "Image failed to load",
  fileOpened: "File Opened",
  fileSaved: "Document Saved",
  themeImported: "Theme Imported",
  themesRefreshed: "Theme List Refreshed",
  aboutTitle: "About EasyMD",
  currentVersion: "Current Version",
  noUpdate: "EasyMD is up to date",
  unsavedTitle: "Document has unsaved changes",
  unsavedDetail: "Do you want to save the current Markdown document before closing?",
  dontSave: "Don't Save",
  resetShortcuts: "Reset Defaults",
  close: "Close",
  cancel: "Cancel",
  zoom: "Zoom",
  copied: "Copied",
  invalidTheme: "Theme CSS is invalid. EasyMD has switched back to Night.",
  aiAssistant: "AI Assistant",
  openAiAssistant: "Open AI Assistant",
  aiSettings: "AI Settings",
  aiApiKey: "API Key",
  aiBaseUrl: "Base URL",
  aiModel: "Model",
  aiFetchModels: "Fetch Models",
  aiModelsLoaded: "Model list updated",
  aiModelsFallback: "Using built-in model suggestions",
  aiModelsEmpty: "No available models were returned",
  aiModelFetchFailed: "Failed to fetch models",
  aiAskPlaceholder: "Ask about the current Markdown document...",
  aiSend: "Send",
  aiNoApiKey: "Add an AI API key in Settings first.",
  aiNoBaseUrl: "Add an AI Base URL in Settings first.",
  aiNoModel: "Add an AI model in Settings first.",
  aiWorking: "AI is thinking...",
  aiFailed: "AI request failed",
  errorDetails: "Error Details",
  details: "Details",
  copyDetails: "Copy Details",
  aiChatIntro: "I can summarize, rewrite, translate, or review the current Markdown document.",
  aiPrivacyHint: "The API key is stored only in localStorage. Make sure your endpoint is trusted before sending document content.",
  aiMemory: "AI Memory",
  aiMemoryEnabled: "Save AI conversation history",
  aiMemoryPreference: "Global Preference",
  aiMemoryPlaceholder: "For example: translate to Simplified Chinese by default, keep answers concise, and preserve Markdown structure.",
  aiMemoryHint: "AI memory is stored only in localStorage and can be cleared anytime.",
  aiMemoryCleared: "AI memory cleared",
  clearAiMemory: "Clear AI Memory",
  aiSummarizeSelection: "AI Summarize Selection",
  aiPolishSelection: "AI Polish Selection",
  aiTranslateSelection: "AI Translate Selection",
  aiNoSelection: "Select text in the source editor first.",
  aiResult: "AI Result",
  aiReplaceSelection: "Replace Selection",
  aiInsertAtCursor: "Insert at Cursor",
  aiApplyToEditor: "Apply to Editor",
  aiReplaceDocument: "Replace Document",
  aiUndoApply: "Undo Apply",
  apply: "Apply",
  discard: "Discard"
};

const lightMermaidThemes: ThemeName[] = ["github", "newsprint", "pixyll", "whitey"];

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

const codeLanguageCompletions = [
  "mermaid",
  "markdown",
  "math",
  "python",
  "javascript",
  "typescript",
  "java",
  "json",
  "yaml",
  "bash",
  "shell",
  "sql",
  "html",
  "css",
  "dockerfile",
  "makefile",
  "toml",
  "xml",
  "rust",
  "go",
  "cpp",
  "c",
  "csharp",
  "php",
  "ruby",
  "swift",
  "kotlin"
].map((label) => ({ label, type: label === "mermaid" ? "keyword" : "constant" }));

function codeFenceLanguageCompletion(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const match = before.match(/^\s*```([\w#+-]*)$/);
  if (!match) return null;
  const fenceStart = before.lastIndexOf("```");
  return {
    from: line.from + fenceStart + 3,
    options: codeLanguageCompletions,
    validFor: /^[\w#+-]*$/
  };
}

function shouldStartCodeFenceCompletion(view: EditorView) {
  const position = view.state.selection.main.head;
  const line = view.state.doc.lineAt(position);
  const before = line.text.slice(0, position - line.from);
  return /^\s*```[\w#+-]*$/.test(before);
}

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
  replace: "Ctrl+H",
  aiAssistant: "Ctrl+Alt+A"
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
  replace: "replace",
  aiAssistant: "aiAssistant"
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

function pathDirname(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : "";
}

function normalizePathForMarkdown(value: string) {
  return value.replace(/\\/g, "/");
}

function relativeImagePath(fromFile: string | undefined, imagePath: string) {
  if (!fromFile) return normalizePathForMarkdown(imagePath);
  const baseParts = pathDirname(fromFile).replace(/\\/g, "/").split("/").filter(Boolean);
  const imageParts = imagePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const baseRoot = baseParts[0]?.toLowerCase();
  const imageRoot = imageParts[0]?.toLowerCase();
  if (/^[a-z]:$/i.test(baseParts[0] || "") && baseRoot !== imageRoot) return normalizePathForMarkdown(imagePath);
  let common = 0;
  while (common < baseParts.length && common < imageParts.length && baseParts[common].toLowerCase() === imageParts[common].toLowerCase()) {
    common += 1;
  }
  const up = Array(Math.max(0, baseParts.length - common)).fill("..");
  const down = imageParts.slice(common);
  const relative = [...up, ...down].join("/") || imageParts[imageParts.length - 1] || imagePath;
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function markdownImageSource(value: string) {
  return /[\s()[\]<>]/.test(value) ? `<${value}>` : value;
}

function truncateForAi(value: string, maxLength = 18000) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n\n...[truncated by EasyMD]`;
}

function cleanErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();
}

function shortErrorMessage(message: string) {
  return message.length > 180 ? `${message.slice(0, 180)}...` : message;
}

function cleanAiContent(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/^\s*```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function loadAiMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem("easymd.ai.messages") || "[]") as AiMessage[];
    return Array.isArray(saved) ? saved.slice(-40) : [];
  } catch {
    return [];
  }
}

function loadAiMemorySettings(): AiMemorySettings {
  return {
    enabled: localStorage.getItem("easymd.ai.memory.enabled") === "true",
    preference: localStorage.getItem("easymd.ai.memory.preference") || ""
  };
}

function clearPersistedAiCredentials() {
  localStorage.removeItem("easymd.ai.apiKey");
  localStorage.removeItem("easymd.ai.baseUrl");
  localStorage.removeItem("easymd.ai.model");
  localStorage.removeItem("easymd.ai.models");
}

function ensureAiCredentialReset() {
  if (aiSecretsResetChecked) return;
  aiSecretsResetChecked = true;
  if (localStorage.getItem("easymd.ai.credentialsResetVersion") === AI_SECRET_RESET_VERSION) return;
  clearPersistedAiCredentials();
  localStorage.setItem("easymd.ai.credentialsResetVersion", AI_SECRET_RESET_VERSION);
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
  ensureAiCredentialReset();
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
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [errorDetail, setErrorDetail] = useState<{ title: string; detail: string } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem("easymd.ai.apiKey") || "");
  const [aiBaseUrl, setAiBaseUrl] = useState(() => localStorage.getItem("easymd.ai.baseUrl") || "");
  const [aiModel, setAiModel] = useState(() => localStorage.getItem("easymd.ai.model") || "");
  const [aiModels, setAiModels] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("easymd.ai.models") || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiModelsBusy, setAiModelsBusy] = useState(false);
  const [aiMemory, setAiMemory] = useState<AiMemorySettings>(() => loadAiMemorySettings());
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(() => loadAiMemorySettings().enabled ? loadAiMessages() : []);
  const [aiAppliedDraft, setAiAppliedDraft] = useState<AiAppliedDraft | null>(null);
  const [aiResult, setAiResult] = useState<AiResultState | null>(null);
  const customThemeInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const lineNumberCompartmentRef = useRef(new Compartment());
  const previewRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const t = language === "zh-CN" ? zh : en;
  const html = useMemo(() => renderMarkdown(markdown, { codeLineNumbers, copyLabel: t.copy, basePath: filePath }), [markdown, codeLineNumbers, t.copy, filePath]);
  const outline = useMemo(() => getOutline(markdown), [markdown]);
  const words = useMemo(() => markdown.trim() ? markdown.trim().split(/\s+/).length : 0, [markdown]);
  const languageOptions = useMemo<Array<SelectOption<Language>>>(() => [
    { value: "zh-CN", label: t.chinese },
    { value: "en-US", label: t.english }
  ], [t.chinese, t.english]);
  const aiModelOptions = useMemo<Array<SelectOption<string>>>(() => aiModels.map((model) => ({ value: model, label: model })), [aiModels]);
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

  function notify(title: string, detail?: string, tone: ToastTone = "info", fullDetail?: string) {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-3), { id, title, detail, tone, fullDetail }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, tone === "error" ? 9000 : 3400);
  }

  function notifyError(title: string, error: unknown) {
    const detail = cleanErrorMessage(error);
    notify(title, shortErrorMessage(detail), "error", detail);
  }

  function dismissToast(id: number) {
    setToasts((items) => items.filter((item) => item.id !== id));
  }

  async function openFile() {
    const result = await window.easyMD.openFile();
    if (!result) return;
    setMarkdown(result.content || "");
    setFilePath(result.filePath);
    setRecentFiles(result.recentFiles);
    setDirty(false);
    notify(t.fileOpened, compactPath(result.filePath), "success");
  }

  async function saveFile(forceSaveAs = false, closeAfterSave = false, quiet = false) {
    const result = await window.easyMD.saveFile({ filePath: forceSaveAs ? undefined : filePath, content: markdown });
    if (!result) return;
    setFilePath(result.filePath);
    setRecentFiles(result.recentFiles);
    setDirty(false);
    if (!quiet) notify(t.fileSaved, compactPath(result.filePath), "success");
    if (closeAfterSave) window.easyMD.closeAfterSave();
  }

  async function exportPdf() {
    const previousMode = viewMode;
    if (viewMode === "source") setViewMode("preview");
    requestAnimationFrame(() => {
      void window.easyMD.exportPdf(fileName(filePath))
        .then((result) => {
          if (result?.filePath) {
            notify(t.exportPdfDone, compactPath(result.filePath), "success");
          } else {
            notify(t.exportPdfCancelled, undefined, "info");
          }
        })
        .catch((error) => {
          notify(t.exportPdfFailed, error instanceof Error ? error.message : String(error), "error");
        })
        .finally(() => {
          if (previousMode === "source") setViewMode(previousMode);
        });
    });
  }

  function requestCloseDocument() {
    if (!dirty) {
      window.easyMD.closeAfterSave();
      return;
    }
    setConfirmState({
      title: t.unsavedTitle,
      detail: t.unsavedDetail,
      primary: t.save,
      secondary: t.dontSave,
      cancel: t.cancel,
      onPrimary: () => void saveFile(false, true, true),
      onSecondary: () => window.easyMD.closeAfterSave()
    });
  }

  function newFile() {
    setMarkdown("");
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

  async function insertImage() {
    const imagePath = await window.easyMD.selectImage();
    if (!imagePath) return;
    const targetPath = markdownImageSource(relativeImagePath(filePath, imagePath));
    insertRaw(`![${t.imageAlt}](${targetPath})`);
  }

  function selectedTextRange() {
    const editor = editorViewRef.current;
    if (!editor) return null;
    const selection = editor.state.selection.main;
    if (selection.empty) return null;
    return {
      from: selection.from,
      to: selection.to,
      text: editor.state.sliceDoc(selection.from, selection.to)
    };
  }

  async function callAi(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
    if (!aiApiKey.trim()) {
      setSettingsOpen(true);
      notify(t.aiNoApiKey, undefined, "warning");
      throw new Error(t.aiNoApiKey);
    }
    if (!aiBaseUrl.trim()) {
      setSettingsOpen(true);
      notify(t.aiNoBaseUrl, undefined, "warning");
      throw new Error(t.aiNoBaseUrl);
    }
    if (!aiModel.trim()) {
      setSettingsOpen(true);
      notify(t.aiNoModel, undefined, "warning");
      throw new Error(t.aiNoModel);
    }
    const preference = aiMemory.preference.trim();
    const preparedMessages = preference
      ? [
        {
          role: "system" as const,
          content: `User's persistent EasyMD preference:\n${preference}`
        },
        ...messages
      ]
      : messages;
    setAiBusy(true);
    try {
      const result = await window.easyMD.aiChat({
        apiKey: aiApiKey,
        baseUrl: aiBaseUrl,
        model: aiModel,
        messages: preparedMessages,
        temperature: 0.3
      });
      return cleanAiContent(result.content);
    } finally {
      setAiBusy(false);
    }
  }

  async function runAiSelectionAction(action: "summarize" | "polish" | "translate") {
    const range = selectedTextRange();
    if (!range) {
      notify(t.aiNoSelection, undefined, "warning");
      return;
    }
    setContextMenu(null);
    setAiOpen(true);
    const instruction = {
      summarize: language === "zh-CN" ? "\u7528\u7b80\u6d01\u7684 Markdown \u8981\u70b9\u603b\u7ed3\u9009\u4e2d\u5185\u5bb9\u3002" : "Summarize the selected content as concise Markdown bullet points.",
      polish: language === "zh-CN" ? "\u5728\u4fdd\u7559 Markdown \u7ed3\u6784\u7684\u524d\u63d0\u4e0b\uff0c\u6da6\u8272\u9009\u4e2d\u5185\u5bb9\uff0c\u76f4\u63a5\u8fd4\u56de\u6539\u5199\u540e\u7684 Markdown\u3002" : "Polish the selected content while preserving Markdown structure. Return only the revised Markdown.",
      translate: language === "zh-CN" ? "\u5c06\u9009\u4e2d\u5185\u5bb9\u7ffb\u8bd1\u4e3a\u7b80\u4f53\u4e2d\u6587\uff0c\u4fdd\u7559 Markdown \u7ed3\u6784\u3002" : "Translate the selected content into English while preserving Markdown structure."
    }[action];
    const title = action === "summarize" ? t.aiSummarizeSelection : action === "polish" ? t.aiPolishSelection : t.aiTranslateSelection;
    const mode = action === "summarize" ? "insert" : "replace";
    setAiMessages((items) => [...items, { role: "user", content: `${title}\n\n${range.text}` }]);
    try {
      const content = await callAi([
        { role: "system", content: "You are EasyMD's writing assistant. Return the final Markdown answer only. Do not include reasoning, analysis, hidden thoughts, or <think> tags. Do not wrap the answer in code fences unless the user content requires code fences." },
        { role: "user", content: `${instruction}\n\nSelected Markdown:\n\n${range.text}` }
      ]);
      setAiMessages((items) => [...items, {
        role: "assistant",
        actionTitle: title,
        content,
        mode,
        from: range.from,
        to: range.to
      }]);
    } catch (error) {
      notifyError(t.aiFailed, error);
    }
  }

  async function sendAiChat() {
    const question = aiInput.trim();
    if (!question || aiBusy) return;
    const nextMessages: AiMessage[] = [...aiMessages, { role: "user", content: question }];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiOpen(true);
    try {
      const answer = await callAi([
        { role: "system", content: "You are EasyMD's Markdown assistant. Answer in the user's UI language. Be concise, practical, and preserve Markdown syntax when proposing edits. If the user asks you to generate, rewrite, expand, or replace document content, return directly usable Markdown. Return the final answer only; do not include reasoning, analysis, hidden thoughts, or <think> tags." },
        { role: "user", content: `Current file: ${filePath || "Untitled.md"}\n\nCurrent Markdown document:\n\n${truncateForAi(markdown)}` },
        ...nextMessages.map((message) => ({ role: message.role, content: message.content }))
      ]);
      setAiMessages((items) => [...items, { role: "assistant", content: answer, mode: "insert" }]);
    } catch (error) {
      notifyError(t.aiFailed, error);
    }
  }

  function applyAiResult() {
    if (!aiResult) return;
    const editor = editorViewRef.current;
    const from = aiResult.mode === "replace" && typeof aiResult.from === "number" ? aiResult.from : editor?.state.selection.main.from ?? markdown.length;
    const to = aiResult.mode === "replace" && typeof aiResult.to === "number" ? aiResult.to : from;
    setMarkdown(markdown.slice(0, from) + aiResult.content + markdown.slice(to));
    setDirty(true);
    setAiResult(null);
    requestAnimationFrame(() => {
      editor?.focus();
      editor?.dispatch({ selection: { anchor: from + aiResult.content.length } });
    });
  }

  function applyAiMessage(message: AiMessage, messageIndex: number, target: "auto" | "document" = "auto") {
    if (message.role !== "assistant") return;
    const editor = editorViewRef.current;
    const from = target === "document" ? 0 : message.mode === "replace" && typeof message.from === "number" ? message.from : editor?.state.selection.main.from ?? markdown.length;
    const to = target === "document" ? markdown.length : message.mode === "replace" && typeof message.to === "number" ? message.to : from;
    setAiAppliedDraft({ messageIndex, before: markdown });
    setMarkdown(markdown.slice(0, from) + message.content + markdown.slice(to));
    setDirty(true);
    requestAnimationFrame(() => {
      editor?.focus();
      editor?.dispatch({ selection: { anchor: from + message.content.length } });
    });
  }

  function undoAiApply() {
    if (!aiAppliedDraft) return;
    setMarkdown(aiAppliedDraft.before);
    setDirty(true);
    setAiAppliedDraft(null);
    requestAnimationFrame(() => editorViewRef.current?.focus());
  }

  function saveAiSetting(kind: "apiKey" | "baseUrl" | "model", value: string) {
    if (kind === "apiKey") setAiApiKey(value);
    if (kind === "baseUrl") setAiBaseUrl(value);
    if (kind === "model") setAiModel(value);
    localStorage.setItem(`easymd.ai.${kind}`, value);
  }

  function updateAiMemory(next: Partial<AiMemorySettings>) {
    const merged = { ...aiMemory, ...next };
    setAiMemory(merged);
    localStorage.setItem("easymd.ai.memory.enabled", String(merged.enabled));
    localStorage.setItem("easymd.ai.memory.preference", merged.preference);
    if (merged.enabled) {
      localStorage.setItem("easymd.ai.messages", JSON.stringify(aiMessages.slice(-40)));
    }
  }

  function clearAiMemory() {
    setAiMessages([]);
    localStorage.removeItem("easymd.ai.messages");
    notify(t.aiMemoryCleared, undefined, "success");
  }

  async function fetchAiModels() {
    if (!aiApiKey.trim()) {
      notify(t.aiNoApiKey, undefined, "warning");
      return;
    }
    if (!aiBaseUrl.trim()) {
      notify(t.aiNoBaseUrl, undefined, "warning");
      return;
    }
    setAiModelsBusy(true);
    try {
      const result = await window.easyMD.aiListModels({ apiKey: aiApiKey, baseUrl: aiBaseUrl });
      const models = Array.from(new Set(result.models)).filter(Boolean);
      if (!models.length) {
        notify(t.aiModelsEmpty, undefined, "warning");
        return;
      }
      setAiModels(models);
      localStorage.setItem("easymd.ai.models", JSON.stringify(models));
      if (!models.includes(aiModel)) saveAiSetting("model", models[0]);
      notify(result.fallback ? t.aiModelsFallback : t.aiModelsLoaded, models.join(", "), result.fallback ? "info" : "success");
    } catch (error) {
      notifyError(t.aiModelFetchFailed, error);
    } finally {
      setAiModelsBusy(false);
    }
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
      notify(t.invalidTheme, undefined, "warning");
    }
  }

  function applyImportedTheme(cssText: string, nextName: string) {
    if (!validateThemeCss(cssText)) {
      document.getElementById("custom-theme")?.remove();
      setCustomThemeName(undefined);
      setTheme("night");
      localStorage.removeItem("easymd.customThemeCss");
      localStorage.removeItem("easymd.customThemeName");
      localStorage.setItem("easymd.theme", "night");
      notify(t.invalidTheme, undefined, "warning");
      return;
    }
    document.getElementById("directory-theme")?.remove();
    applyThemeStyle("custom-theme", cssText);
    setCustomThemeName(nextName);
    localStorage.setItem("easymd.customThemeCss", cssText);
    localStorage.setItem("easymd.customThemeName", nextName);
    localStorage.setItem("easymd.theme", "custom");
    setTheme("custom");
    notify(t.themeImported, nextName, "success");
  }

  async function importTheme(file?: File) {
    if (!file) return;
    applyImportedTheme(await file.text(), file.name.replace(/\.css$/i, ""));
  }

  async function importThemeFromMenu() {
    const themeFile = await window.easyMD.importThemeFile();
    if (!themeFile) return;
    applyImportedTheme(themeFile.cssText, themeFile.name);
    await window.easyMD.refreshThemeMenu();
    await refreshUserThemes(themeFile.id as ThemeName);
    notify(t.themesRefreshed, undefined, "success");
  }

  function chooseTheme(nextTheme: ThemeName) {
    if (nextTheme.startsWith("user:")) {
      const userTheme = userThemes.find((item) => item.id === nextTheme);
      if (!userTheme || !validateThemeCss(userTheme.cssText)) {
        document.getElementById("directory-theme")?.remove();
        setTheme("night");
        localStorage.setItem("easymd.theme", "night");
        notify(t.invalidTheme, undefined, "warning");
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
    if (action === "aiAssistant") setAiOpen((value) => !value);
  }

  async function checkUpdates(showWhenCurrent = false) {
    const result = await window.easyMD.checkForUpdates();
    if (result.hasUpdate && result.latestVersion && result.releaseUrl) {
      const dismissed = localStorage.getItem("easymd.dismissedUpdate");
      if (showWhenCurrent || dismissed !== result.latestVersion) {
        setUpdateInfo({ latestVersion: result.latestVersion, releaseUrl: result.releaseUrl });
      }
    } else if (showWhenCurrent) {
      notify(t.noUpdate, `${t.currentVersion}: EasyMD ${result.currentVersion}`, "info");
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
  }, [shortcuts, markdown, filePath, viewMode, sidebarOpen, aiOpen]);

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
            autocompletion({
              activateOnTyping: true,
              override: [codeFenceLanguageCompletion]
            }),
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
                if (shouldStartCodeFenceCompletion(update.view)) {
                  startCompletion(update.view);
                }
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
    const preview = previewRef.current;
    if (!preview) return;
    const blocks = Array.from(preview.querySelectorAll<HTMLElement>(".md-mermaid-block"));
    if (!blocks.length) return;
    let cancelled = false;
    const mermaidTheme = lightMermaidThemes.includes(theme) ? "default" : "dark";

    void import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: mermaidTheme
      });

      blocks.forEach((block, index) => {
        const source = block.querySelector<HTMLElement>(".mermaid-source")?.textContent || "";
        const target = block.querySelector<HTMLElement>(".mermaid-render");
        if (!target || !source.trim()) return;
        const id = `easymd-mermaid-${Date.now()}-${index}`;
        target.innerHTML = "";
        mermaid.render(id, source)
          .then(({ svg }) => {
            if (cancelled) return;
            target.innerHTML = svg;
            block.classList.remove("mermaid-error");
          })
          .catch((error) => {
            if (cancelled) return;
            block.classList.add("mermaid-error");
            target.textContent = error instanceof Error ? error.message : String(error);
          });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [html, theme]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    let cancelled = false;
    const images = Array.from(preview.querySelectorAll<HTMLImageElement>(".md-image[data-local-image]"));
    images.forEach((image) => {
      const localPath = image.dataset.localImage;
      if (!localPath) return;
      image.classList.remove("image-error");
      image.title = image.title || localPath;
      void window.easyMD.imageDataUrl(localPath)
        .then((dataUrl) => {
          if (cancelled || !dataUrl) return;
          image.src = dataUrl;
          image.removeAttribute("data-local-image");
        })
        .catch(() => {
          if (cancelled) return;
          image.classList.add("image-error");
          image.alt = image.alt || t.imageLoadFailed;
          image.title = `${t.imageLoadFailed}: ${localPath}`;
        });
    });
    return () => {
      cancelled = true;
    };
  }, [html, t.imageLoadFailed]);

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
      window.easyMD.onMenu("menu:export-pdf", () => void exportPdf()),
      window.easyMD.onMenu("menu:view", (mode) => setViewMode(mode as ViewMode)),
      window.easyMD.onMenu("menu:theme", (name) => chooseTheme(name as ThemeName)),
      window.easyMD.onMenu("menu:refresh-themes", () => void refreshUserThemes().then(() => notify(t.themesRefreshed, undefined, "success"))),
      window.easyMD.onMenu("menu:import-theme", () => void importThemeFromMenu()),
      window.easyMD.onMenu("menu:toggle-sidebar", () => setSidebarOpen((value) => !value)),
      window.easyMD.onMenu("menu:undo", runUndo),
      window.easyMD.onMenu("menu:redo", runRedo),
      window.easyMD.onMenu("menu:format", (command) => runFormat(command as FormatCommand)),
      window.easyMD.onMenu("menu:insert-image", () => void insertImage()),
      window.easyMD.onMenu("menu:check-updates", () => void checkUpdates(true)),
      window.easyMD.onMenu("menu:about", () => {
        setSettingsOpen(true);
        notify(t.aboutTitle, `${t.currentVersion}: ${appInfo.version}`, "info");
      }),
      window.easyMD.onMenu("app:request-close", requestCloseDocument)
    ];
    return () => off.forEach((dispose) => dispose());
  });

  useEffect(() => {
    window.easyMD.setDirty(dirty);
  }, [dirty]);

  useEffect(() => {
    if (!aiMemory.enabled) return;
    localStorage.setItem("easymd.ai.messages", JSON.stringify(aiMessages.slice(-40)));
  }, [aiMessages, aiMemory.enabled]);

  useEffect(() => {
    const hide = () => setContextMenu(null);
    const onCopy = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest("[data-copy-code]");
      if (!button) return;
      const block = button.closest(".md-code-block");
      const code = block?.querySelector("code")?.textContent || block?.querySelector(".mermaid-source")?.textContent || "";
      void navigator.clipboard.writeText(code);
      button.textContent = t.copied;
      notify(t.copied, undefined, "success");
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
    <div className={`app ${themeClass} ${theme === "custom" ? "custom-theme" : ""} ${showScrollbars ? "" : "hide-scrollbars"} ${aiOpen ? "ai-open" : ""}`} onContextMenu={showContextMenu}>
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
              <button title={t.insertImage} onClick={() => void insertImage()}><Image size={16} /></button>
            </div>
            <div className="tool-group mode-group">
              <button className={showScrollbars ? "active" : ""} title={t.showScrollbars} onClick={() => setShowScrollbars((value) => !value)}><ScrollText size={16} /></button>
              <button className={sourceLineNumbers ? "active" : ""} title={t.sourceLineNumbers} onClick={() => setSourceLineNumbers((value) => !value)}><ListOrdered size={16} /></button>
              <button className={codeLineNumbers ? "active" : ""} title={t.codeLineNumbers} onClick={() => setCodeLineNumbers((value) => !value)}><Code2 size={16} /></button>
              <button className={viewMode === "source" ? "active" : ""} title={t.source} onClick={() => setViewMode("source")}><FileCode2 size={16} /></button>
              <button className={viewMode === "preview" ? "active" : ""} title={t.preview} onClick={() => setViewMode("preview")}><Eye size={16} /></button>
              <button className={viewMode === "split" ? "active" : ""} title={t.split} onClick={() => setViewMode("split")}><SplitSquareHorizontal size={16} /></button>
              <button className={aiOpen ? "active" : ""} title={t.openAiAssistant} onClick={() => setAiOpen((value) => !value)}><Bot size={16} /></button>
              <button className={findOpen ? "active" : ""} title={t.find} onClick={() => openFindPanel(false)}><Search size={16} /></button>
              <button className={settingsOpen ? "active" : ""} title={t.settings} onClick={() => setSettingsOpen(true)}><Settings size={16} /></button>
              <button title={t.exportPdf} onClick={() => void exportPdf()}><Download size={16} /></button>
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
          <button className="context-row" onClick={() => void insertImage()}><Image size={16} />{t.insertImage}</button>
          <div className="context-ai">
            <button onClick={() => void runAiSelectionAction("summarize")}><Sparkles size={15} />{t.aiSummarizeSelection}</button>
            <button onClick={() => void runAiSelectionAction("polish")}><Wand2 size={15} />{t.aiPolishSelection}</button>
            <button onClick={() => void runAiSelectionAction("translate")}><Bot size={15} />{t.aiTranslateSelection}</button>
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

      {aiOpen && (
        <aside className="ai-panel">
          <header>
            <div>
              <strong>{t.aiAssistant}</strong>
              <span>{aiModel}</span>
            </div>
            <button title={t.close} onClick={() => setAiOpen(false)}><X size={15} /></button>
          </header>
          <div className="ai-quick-actions">
            <button onClick={() => void runAiSelectionAction("summarize")}><Sparkles size={15} />{t.aiSummarizeSelection}</button>
            <button onClick={() => void runAiSelectionAction("polish")}><Wand2 size={15} />{t.aiPolishSelection}</button>
            <button onClick={() => void runAiSelectionAction("translate")}><Bot size={15} />{t.aiTranslateSelection}</button>
          </div>
          <div className="ai-messages">
            {!aiMessages.length && (
              <div className="ai-empty">
                <Bot size={22} />
                <p>{t.aiChatIntro}</p>
              </div>
            )}
            {aiMessages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`ai-message ${message.role}`}>
                <small>{message.actionTitle || (message.role === "user" ? "You" : "EasyMD AI")}</small>
                <div
                  className="ai-message-content markdown-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content, { codeLineNumbers, copyLabel: t.copy, basePath: filePath }) }}
                />
                {message.role === "assistant" && (
                  <div className="ai-message-actions">
                    {aiAppliedDraft?.messageIndex === index ? (
                      <button onClick={undoAiApply}>{t.aiUndoApply}</button>
                    ) : (
                      <>
                        <button onClick={() => applyAiMessage(message, index)}>{message.mode === "replace" ? t.aiReplaceSelection : t.aiApplyToEditor}</button>
                        {message.mode !== "replace" && <button onClick={() => applyAiMessage(message, index, "document")}>{t.aiReplaceDocument}</button>}
                      </>
                    )}
                    <button onClick={() => void navigator.clipboard.writeText(message.content).then(() => notify(t.copied, undefined, "success"))}>{t.copy}</button>
                  </div>
                )}
              </article>
            ))}
            {aiBusy && <div className="ai-thinking">{t.aiWorking}</div>}
          </div>
          <form className="ai-input-row" onSubmit={(event) => {
            event.preventDefault();
            void sendAiChat();
          }}>
            <textarea
              value={aiInput}
              placeholder={t.aiAskPlaceholder}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendAiChat();
                }
              }}
            />
            <button type="submit" disabled={aiBusy || !aiInput.trim()} title={t.aiSend}><Send size={16} /></button>
          </form>
        </aside>
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

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <section key={toast.id} className={`app-toast toast-${toast.tone}`}>
            {toast.tone === "success" ? <CheckCircle2 size={18} /> : toast.tone === "warning" || toast.tone === "error" ? <AlertTriangle size={18} /> : <Info size={18} />}
            <div>
              <strong>{toast.title}</strong>
              {toast.detail && <span>{toast.detail}</span>}
            </div>
            {toast.fullDetail && (
              <button
                className="toast-detail-button"
                onClick={() => setErrorDetail({ title: toast.title, detail: toast.fullDetail || toast.detail || "" })}
                title={t.details}
              >
                {t.details}
              </button>
            )}
            <button onClick={() => dismissToast(toast.id)} title={t.close}><X size={14} /></button>
          </section>
        ))}
      </div>

      {confirmState && (
        <div className="confirm-backdrop" onMouseDown={() => setConfirmState(null)}>
          <section className="confirm-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="confirm-icon"><AlertTriangle size={22} /></div>
            <div className="confirm-copy">
              <h2 id="confirm-title">{confirmState.title}</h2>
              <p>{confirmState.detail}</p>
            </div>
            <div className="confirm-actions">
              <button onClick={() => setConfirmState(null)}>{confirmState.cancel}</button>
              {confirmState.secondary && confirmState.onSecondary && (
                <button onClick={() => {
                  const action = confirmState.onSecondary;
                  setConfirmState(null);
                  action?.();
                }}>{confirmState.secondary}</button>
              )}
              <button className="primary" onClick={() => {
                const action = confirmState.onPrimary;
                setConfirmState(null);
                action();
              }}>{confirmState.primary}</button>
            </div>
          </section>
        </div>
      )}

      {errorDetail && (
        <div className="ai-result-backdrop" onMouseDown={() => setErrorDetail(null)}>
          <section className="ai-result-panel error-detail-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <strong>{errorDetail.title || t.errorDetails}</strong>
              <button title={t.close} onClick={() => setErrorDetail(null)}><X size={15} /></button>
            </header>
            <pre>{errorDetail.detail}</pre>
            <footer>
              <button onClick={() => void navigator.clipboard.writeText(errorDetail.detail).then(() => notify(t.copied, undefined, "success"))}>{t.copyDetails}</button>
              <button className="primary" onClick={() => setErrorDetail(null)}>{t.close}</button>
            </footer>
          </section>
        </div>
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
              <h3>{t.aiSettings}</h3>
              <label className="settings-field">
                <span>{t.aiApiKey}</span>
                <input
                  type="password"
                  value={aiApiKey}
                  placeholder="sk-..."
                  onChange={(event) => saveAiSetting("apiKey", event.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>{t.aiBaseUrl}</span>
                <input
                  value={aiBaseUrl}
                  placeholder="https://api.example.com/v1"
                  onChange={(event) => saveAiSetting("baseUrl", event.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>{t.aiModel}</span>
                {aiModelOptions.length ? (
                  <CustomSelect
                    title={t.aiModel}
                    value={aiModelOptions.some((item) => item.value === aiModel) ? aiModel : aiModelOptions[0].value}
                    options={aiModelOptions}
                    onChange={(value) => saveAiSetting("model", value)}
                    className="settings-select model-select"
                  />
                ) : (
                  <input
                    value={aiModel}
                    placeholder="model-name"
                    onChange={(event) => saveAiSetting("model", event.target.value)}
                  />
                )}
              </label>
              <div className="settings-actions">
                <button className="settings-secondary" onClick={() => void fetchAiModels()} disabled={aiModelsBusy}>
                  {aiModelsBusy ? t.aiWorking : t.aiFetchModels}
                </button>
                <button className="settings-secondary" onClick={() => {
                  setAiOpen(true);
                  setSettingsOpen(false);
                }}>{t.openAiAssistant}</button>
              </div>
              <p className="settings-hint">{t.aiPrivacyHint}</p>
              <div className="ai-memory-box">
                <h4>{t.aiMemory}</h4>
                <label className="settings-check">
                  <input
                    type="checkbox"
                    checked={aiMemory.enabled}
                    onChange={(event) => updateAiMemory({ enabled: event.target.checked })}
                  />
                  <span>{t.aiMemoryEnabled}</span>
                </label>
                <label className="settings-field">
                  <span>{t.aiMemoryPreference}</span>
                  <textarea
                    value={aiMemory.preference}
                    placeholder={t.aiMemoryPlaceholder}
                    onChange={(event) => updateAiMemory({ preference: event.target.value })}
                  />
                </label>
                <div className="settings-actions">
                  <button className="settings-secondary" onClick={clearAiMemory}>{t.clearAiMemory}</button>
                </div>
                <p className="settings-hint">{t.aiMemoryHint}</p>
              </div>
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

      {aiResult && (
        <div className="ai-result-backdrop" onMouseDown={() => setAiResult(null)}>
          <section className="ai-result-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <strong>{aiResult.title}</strong>
              <button title={t.close} onClick={() => setAiResult(null)}><X size={15} /></button>
            </header>
            <pre>{aiResult.content}</pre>
            <footer>
              <button onClick={() => void navigator.clipboard.writeText(aiResult.content).then(() => notify(t.copied, undefined, "success"))}>{t.copy}</button>
              <button onClick={() => setAiResult(null)}>{t.discard}</button>
              <button className="primary" onClick={applyAiResult}>{aiResult.mode === "replace" ? t.aiReplaceSelection : t.aiInsertAtCursor}</button>
            </footer>
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
