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
dist/            Built renderer output
dist-electron/   Built Electron process output
```

## License

MIT
