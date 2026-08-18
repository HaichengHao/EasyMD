# EasyMD

EasyMD is a lightweight cross-platform desktop Markdown editor inspired by Typora.

## Features

- Markdown source, preview, and split editing modes
- Live preview with scroll sync
- LaTeX rendering with KaTeX
- Syntax highlighted code blocks
- File and outline sidebar
- Typora-style context menu
- Local file open/save support
- Theme presets
- Custom themes from the local `themes/` folder

## Run Locally

For normal local use on Windows, double-click:

```text
EasyMD.bat
```

For development:

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm start
```

## Custom Themes

EasyMD automatically reads custom CSS themes from the project root `themes/` folder.

1. Copy `example_theme/easymd-theme-template.css` into `themes/`.
2. Rename the copied file, for example `ocean-note.css`.
3. Edit the CSS variables and styles.
4. Restart EasyMD, or click the refresh button beside the theme selector.
5. Select the theme from the dropdown.

You can set the display name with a comment marker:

```css
/* @theme-name Ocean Note */
```

EasyMD validates theme CSS before applying it. If the current theme becomes invalid, EasyMD falls back to `Night`.

See the full guide: `docs/custom-themes.md`.

## Package

Windows packaging is configured with electron-builder:

```bash
npm run dist:win
```

The generated installer or portable app will be written to `release/`.

## Project Layout

```text
electron/        Electron main and preload processes
src/             React renderer application
assets/          Project assets such as icons
public/          Static web assets
example_theme/   Custom theme template
themes/          User-managed custom themes
dist/            Built renderer output
dist-electron/   Built Electron process output
```

## License

MIT
