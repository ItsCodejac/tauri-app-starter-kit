# TASK — Tauri App Starter Kit

A complete desktop app skeleton. Tauri v2 + Rust. Framework-agnostic.

Every feature users expect from a desktop app — menus, settings, crash recovery, keyboard shortcuts, system tray — built and working. Add your frontend framework and start building.

## What's Included

**Rust Backbone:**
- Native OS menus — data-driven, cross-platform, dynamic state
- Settings persistence — key-value store, single-source defaults
- Keyboard shortcut registry — editable, persistent, preset support
- Autosave + crash recovery — atomic writes, startup detection
- Crash reporting — panic handler, error logging, diagnostics collection
- System tray — minimize to tray, context menu, background mode
- Auto-updater infrastructure — check, download, install
- Single instance lock — focus existing window on relaunch
- Window state persistence — size, position, maximized
- Recent files, native notifications, autostart, secure keyring
- Browser shortcut prevention, file dialogs, quit confirmation

**Utility Windows (plain HTML, no framework):**
- Splash screen — appears before initialization, branded
- Settings / Preferences — sidebar nav, flat form layout, OK/Cancel
- Keyboard Shortcuts — visual keyboard, editable bindings, presets
- About — app info, version, diagnostics
- Log Viewer — filter, copy, colorized
- Check for Updates — status states, install
- What's New — changelog, version tracking
- Welcome — first-run onboarding

**Zero framework dependency.** Utility windows use `window.__TAURI__` globals — no npm packages required for the infrastructure. Works with React, Svelte, Vue, Solid, Leptos, or vanilla JS.

**16 Tauri plugins integrated.**

## Quick Start

Prerequisites: [Rust](https://rustup.rs/), [Node.js](https://nodejs.org/) (v18+), [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
git clone <your-repo-url>
cd tauri-app-starter-kit
npm install
cargo tauri dev
```

## Make It Yours

```
1. tauri.conf.json  →  productName, identifier
2. Cargo.toml       →  package name, authors
3. branding.js      →  name, logo, accent color, links
4. menu.rs          →  custom_menus()
5. index.html       →  replace with your frontend
6. shared.css       →  accent colors if needed
```

## Documentation

```bash
mdbook serve docs
```

24 pages covering every system: menus, IPC, settings, shortcuts, autosave, crash reporting, theming, shipping, and more. Also serves as in-app Help (Help → Documentation).

## Architecture

```
Rust backbone (framework-agnostic):
  menus, settings, shortcuts, autosave, crash reports, tray,
  updater, notifications, keyring, diagnostics, window management

Utility windows (plain HTML + vanilla JS):
  splash, settings, shortcuts, about, logs, update, whatsnew, welcome

Your workspace (add any framework):
  index.html → mount React, Svelte, Vue, or write vanilla JS
```

## License

[MIT](LICENSE)
