import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItKatex from "markdown-it-katex";
import markdownItTaskLists from "markdown-it-task-lists";
import hljs from "highlight.js";

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  line: number;
}

export interface RenderOptions {
  codeLineNumbers?: boolean;
  copyLabel?: string;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function getOutline(markdown: string): OutlineItem[] {
  const seen = new Map<string, number>();
  return markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (!match) return null;
      const base = slugify(match[2]) || `heading-${index + 1}`;
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return {
        id: count ? `${base}-${count + 1}` : base,
        level: match[1].length,
        text: match[2].replace(/[*_`~]/g, ""),
        line: index + 1
      };
    })
    .filter(Boolean) as OutlineItem[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function languageLabel(lang: string) {
  const labels: Record<string, string> = {
    py: "Python",
    python: "Python",
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    java: "Java",
    bash: "Shell",
    sh: "Shell",
    shell: "Shell",
    html: "HTML",
    css: "CSS",
    sql: "SQL",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    text: "Text"
  };
  return labels[lang] || lang.toUpperCase();
}

function normalizeLang(lang: string) {
  return (lang || "text").trim().toLowerCase().replace(/[^a-z0-9#+-]/g, "") || "text";
}

function trimCodeBlock(code: string) {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 1 && !lines[0].trim()) lines.shift();
  while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join("\n");
}

function renderMermaidBlock(code: string) {
  const compactCode = trimCodeBlock(code);
  return `<figure class="md-code-block md-mermaid-block lang-mermaid" data-mermaid>
      <pre class="mermaid-source">${escapeHtml(compactCode)}</pre>
      <div class="mermaid-render" aria-live="polite"></div>
      <figcaption><span>Mermaid</span><button type="button" data-copy-code>Copy</button></figcaption>
    </figure>`;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, lang): string {
    const normalized = normalizeLang(lang);
    const compactCode = trimCodeBlock(code);
    const highlighted = normalized !== "text" && hljs.getLanguage(normalized)
      ? hljs.highlight(compactCode, { language: normalized, ignoreIllegals: true }).value
      : escapeHtml(compactCode);
    return `<figure class="md-code-block lang-${normalized}" data-lang="${normalized}">
      <pre><code class="hljs language-${normalized}">${highlighted}</code></pre>
      <figcaption><span>${languageLabel(normalized)}</span><button type="button" data-copy-code>Copy</button></figcaption>
    </figure>`;
  }
})
  .use(markdownItAnchor, {
    slugify,
    permalink: false
  })
  .use(markdownItFootnote)
  .use(markdownItKatex)
  .use(markdownItTaskLists, { enabled: true, label: true });

const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const lang = normalizeLang(token.info.split(/\s+/)[0] || "");
  if (lang === "mermaid") return renderMermaidBlock(token.content);
  return defaultFence ? defaultFence(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
};

function addCodeLineNumbers(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll(".md-code-block:not(.md-mermaid-block) code").forEach((code) => {
    const lines = code.innerHTML.split("\n");
    while (lines.length > 1 && !lines[0].trim()) lines.shift();
    while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
    code.innerHTML = lines
      .map((line) => `<span class="code-line"><span class="code-line-number"></span><span class="code-line-content">${line || " "}</span></span>`)
      .join("");
  });
  return container.innerHTML;
}

function normalizeMermaidBlocks(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll<HTMLElement>(".md-code-block").forEach((block) => {
    const lang = block.dataset.lang || "";
    const code = block.querySelector("code.language-mermaid, code.language-mmd");
    if (lang !== "mermaid" && !code) return;
    block.outerHTML = renderMermaidBlock(code?.textContent || "");
  });
  return container.innerHTML;
}

export function renderMarkdown(source: string, options: RenderOptions = {}) {
  const copyLabel = options.copyLabel || "Copy";
  const html = normalizeMermaidBlocks(md.render(source || ""))
    .replaceAll("data-copy-code>Copy</button>", `data-copy-code>${escapeHtml(copyLabel)}</button>`);
  return options.codeLineNumbers ? addCodeLineNumbers(html) : html;
}

export function demoMarkdown() {
  return `# EasyMD 快速开始

这是一个面向桌面的 Markdown 编辑器雏形，支持 **源码**、**预览** 和 **双栏同步**。

## LaTeX

行内公式：$E = mc^2$

块公式：

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

## 代码块

\`\`\`python
def hello(name: str) -> None:
    print(f"hello, {name}")

hello("EasyMD")
\`\`\`

## Mermaid

\`\`\`mermaid
sequenceDiagram
    participant User as 用户
    participant EasyMD as EasyMD
    participant Mermaid as Mermaid

    User->>EasyMD: 输入 Markdown
    EasyMD->>Mermaid: 渲染图表源码
    Mermaid-->>EasyMD: 返回 SVG
    EasyMD-->>User: 在预览区显示图表
\`\`\`

## 任务

- [x] Electron 桌面壳
- [x] Typora 风格侧边栏
- [x] 漂亮代码块色条
- [x] Mermaid 图表
- [x] 导出 PDF
`;
}
