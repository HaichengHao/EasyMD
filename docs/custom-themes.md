# EasyMD Custom Theme Guide

EasyMD supports Typora-like local CSS themes. A theme is a normal `.css` file placed in the project root `themes/` folder.

EasyMD 支持类似 Typora 的本地 CSS 主题。主题就是放在项目根目录 `themes/` 文件夹下的 `.css` 文件。

## Quick Start

1. Copy `example_theme/easymd-theme-template.css`.
2. Paste it into `themes/`.
3. Rename it, for example `ocean-note.css`.
4. Edit colors, spacing, fonts, and component styles.
5. Restart EasyMD, or click the refresh button beside the theme selector.
6. Select your theme in the theme dropdown.

## Theme Name

Add this marker near the top of your CSS file:

```css
/* @theme-name Ocean Note */
```

EasyMD will show `Ocean Note` in the theme dropdown. If this marker is missing, EasyMD uses the file name.

## Required Selector

Use `.app.theme-user` as the root selector for custom themes:

```css
.app.theme-user {
  --title: #10151f;
  --top: #131a26;
  --sidebar: #17202d;
  --sidebar-active: #202c3d;
  --canvas: #101722;
  --paper: #141d2a;
  --text: #edf4ff;
  --muted: #93a4b8;
  --line: rgba(147, 164, 184, .22);
  --brand: #67e8f9;
}
```

These variables are the main contract between EasyMD and a theme.

这些变量是 EasyMD 和主题之间的主要约定。

## Common Areas

```css
/* Main editor and preview surfaces / 主编辑区和预览区 */
.app.theme-user .workspace,
.app.theme-user .tool-row,
.app.theme-user .source-wrap,
.app.theme-user .source-pane,
.app.theme-user .preview-pane {
  background: var(--paper);
}

/* Markdown preview typography / Markdown 预览排版 */
.app.theme-user .markdown-body h1,
.app.theme-user .markdown-body h2,
.app.theme-user .markdown-body h3 {
  color: var(--text);
}

.app.theme-user .markdown-body a {
  color: var(--brand);
}

/* Source editor syntax colors / 源码编辑区语法颜色 */
.app.theme-user .cm-heading {
  color: #f9d5ff;
}

/* Code block card / 代码块卡片 */
.app.theme-user .md-code-block {
  background: #0f1623;
  border-color: var(--line);
}

.app.theme-user .md-code-block figcaption span::after {
  background: linear-gradient(90deg, var(--brand), #a78bfa 52%, #facc15);
}
```

## Validation Rules

EasyMD checks custom themes before applying them:

- The file must be valid CSS.
- The file must not be empty.
- The file must be smaller than 240 KB.
- The CSS should include theme-related selectors or variables such as `.app`, `:root`, `--canvas`, `--paper`, `--text`, or `--brand`.

If validation fails, EasyMD does not apply the theme. If the active theme becomes invalid, EasyMD falls back to `Night`.

## Design Tips

- Keep editor text readable before adding decorative backgrounds.
- Avoid very high contrast grid backgrounds behind long-form writing.
- Use `--brand` for active states, line accents, links, and code-block color bars.
- Keep code block padding compact so large code snippets remain scannable.
- Test source, preview, and split modes before sharing a theme.

