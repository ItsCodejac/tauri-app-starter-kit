# TASK — Tauri App Starter Kit

A complete desktop app skeleton. Tauri v2 + React + TypeScript.

Stop rebuilding the same boilerplate. TASK gives you every feature users expect from a desktop app so you can focus on what makes your app different.

## What's Included

**Backbone (Rust — framework-agnostic):**
- Native OS menus — data-driven, customizable, cross-platform (macOS App menu, File, Edit, View, Window, Help)
- Dynamic menu state — enable/disable items, checkmarks, label updates at runtime
- Settings persistence — key-value store with typed defaults
- Autosave + crash recovery — periodic saves, atomic writes, restore on launch
- Crash reporting — Rust panic handler, frontend error boundary, startup detection, diagnostics collection
- Recent files — MRU list with validation
- Quit confirmation — "unsaved changes" interception flow
- Single instance lock — focuses existing window, forwards file args
- Window state persistence — size, position, maximized state
- System tray — minimize to tray, tray context menu, background running
- Auto-updater — check for updates, download, install with UI
- Native notifications — OS-level notifications
- Autostart — launch at login
- Secure secret storage — OS keychain via keyring (API keys, tokens, passwords)
- File dialogs — open, save with filters
- Diagnostics — collect system info, crash logs, sanitized settings for bug reports
- Browser shortcut prevention — blocks Cmd+L, F5, etc. in production
- Localization infrastructure — i18n with locale files

**Frontend (React — swappable):**
- Resizable panel layout — drag splitters, collapse panels, persisted sizes
- Tab bar — workspace switching
- Context menus — per-component right-click menus
- Command palette — Cmd+Shift+P fuzzy search
- Keyboard shortcuts — cross-platform, formatted display
- Undo/redo — generic command stack with labels
- Toast notifications — info, success, warning, error with auto-dismiss
- Drag and drop — file drop with overlay feedback and filtering
- Error boundary — graceful crash UI with reload + copy error
- Dark theme — CSS custom properties throughout
- Typed IPC facade — single file wrapping all backend calls
- Localization — useTranslation hook, locale selector, EN/ES included

**Panels & Dialogs:**
- Settings panel — 6 sections (General, Appearance, Autosave, Cache, Tray, Security)
- About dialog — app icon, name, version, links
- Keyboard shortcuts viewer — searchable, grouped by category
- Update dialog — check, download, install with progress
- Log viewer — filter by level, copy, clear
- What's New dialog — changelog shown after updates
- Welcome overlay — first-run onboarding

**16 Official Tauri Plugins Integrated:**
dialog, fs, shell, opener, store, window-state, log, single-instance, notification, process, clipboard-manager, os, autostart, prevent-default, updater, keyring

## Quick Start

Prerequisites: [Rust](https://rustup.rs/), [Node.js](https://nodejs.org/) (v18+), [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/youruser/tauri-app-starter-kit.git
cd tauri-app-starter-kit
npm install
cargo tauri dev
```

## Documentation

Full guides and API reference built with mdBook:

```bash
cd docs && mdbook serve
```

The docs folder serves triple duty: developer documentation, in-app Help content (Help > Documentation), and Claude Code AI agent reference.

| Guide | What it covers |
|-------|---------------|
| [Menus](docs/src/guides/menus.md) | Data-driven menu system, custom menus, event routing |
| [IPC Commands](docs/src/guides/ipc-commands.md) | Rust ↔ React communication patterns |
| [Panels](docs/src/guides/panels.md) | Resizable layout, presets, conditional panels |
| [Settings](docs/src/guides/settings.md) | Persistence, adding new settings |
| [Autosave](docs/src/guides/autosave.md) | Background saves, crash recovery flow |
| [Shortcuts](docs/src/guides/shortcuts.md) | Keyboard shortcuts, command palette |
| [Undo/Redo](docs/src/guides/undo-redo.md) | Generic command stack |
| [Crash Reporting](docs/src/guides/crash-reporting.md) | Panic handling, error boundary, diagnostics |
| [Drag & Drop](docs/src/guides/drag-drop.md) | File drop with filtering and overlay |
| [Theming](docs/src/guides/theming.md) | CSS variables, dark/light |
| [Shipping](docs/src/guides/shipping.md) | Building, signing, branding checklist |

## Making It Yours

```
1. tauri.conf.json    →  productName, identifier, window title
2. Cargo.toml         →  package name, authors
3. package.json       →  name, version
4. menu.rs            →  edit menus, add custom_menus()
5. App.tsx            →  workspace tabs, panel content
6. theme.css          →  accent colors
7. locales/en.json    →  UI strings for your app
```

See the [Branding Checklist](docs/src/guides/shipping.md) for the full list.

## Architecture

```
Rust backend (framework-agnostic):
  menus, settings, autosave, crash reports, tray, updater,
  notifications, keyring, diagnostics, IPC, window state

React frontend (swappable):
  panels, tabs, toasts, shortcuts, undo, context menus,
  settings UI, about, log viewer, update dialog, i18n
```

The Rust backend works with any frontend framework. If you prefer Svelte, Vue, or Solid, keep `src-tauri/` and replace `src/`.

## Screenshots

<!-- Add screenshots here: -->
<!-- ![Main window](docs/assets/screenshot-main.png) -->
<!-- ![Settings](docs/assets/screenshot-settings.png) -->
<!-- ![Command palette](docs/assets/screenshot-palette.png) -->

## License

[MIT](LICENSE)
