---
name: tauri-desktop-app
description: Expert guidance for TASK (Tauri App Starter Kit). Use when working with Tauri v2 desktop apps built on this template — native OS menus (data-driven menu.rs), utility windows (plain HTML), IPC between Rust and frontend, settings persistence, keyboard shortcut registry, autosave/crash recovery, system tray, or branding. Framework-agnostic (no React/Vue/Svelte assumed).
---

# TASK — Tauri App Starter Kit

Desktop app skeleton: Tauri v2 + Rust backbone + plain HTML utility windows. Framework-agnostic.

## Project Structure

```
src-tauri/src/
  lib.rs            # Entry, plugin setup, splash→main window flow
  menu.rs           # Data-driven native OS menu system
  settings.rs       # Settings persistence (all_defaults pattern)
  shortcuts.rs      # Keyboard shortcut registry with presets
  autosave.rs       # Background autosave + crash recovery
  crash_reporter.rs # Panic handler, error logging
  diagnostics.rs    # System info collection for bug reports
  notifications.rs  # Native OS notifications
  recent_files.rs   # MRU file list
  tray.rs           # System tray setup
  updater.rs        # Auto-update (disabled by default)
  windows.rs        # Utility window creation/management
  commands.rs       # File dialogs, app info, docs, logs

src/
  main.js           # Main window entry (menu listeners, init)
  changelog.json    # Structured changelog data (used by What's New window)
  lib/ipc.js        # IPC facade (wraps all invoke/listen calls)
  lib/window-utils.js # Shared utilities for all windows (close, branding, escape-to-close, file drop prevention)
  lib/branding.js   # App identity config (name, logo, colors)
  styles/shared.css # Dark theme CSS variables + base styles (color-scheme: dark, user-select: none)
  windows/*.html+js # Utility windows (splash, settings, shortcuts, etc.)
```

Uses `window.__TAURI__` globals (not npm imports) for framework agnosticism.

## Adding a Custom Menu

Edit `custom_menus()` in `src-tauri/src/menu.rs`:
```rust
fn custom_menus() -> Vec<MenuConfig> {
    vec![MenuConfig {
        label: "Project",
        items: vec![
            MenuDef::Item { id: "project_build", label: "Build", accel: Some("CmdOrCtrl+B") },
        ],
    }]
}
```
Custom menus insert between View and Window. Event `project_build` auto-forwards as `menu:project:build`.

## Adding a New IPC Command

1. Rust: `#[tauri::command] pub fn my_cmd() -> Result<String, String> { Ok("hi".into()) }`
2. Register in `lib.rs` invoke_handler
3. Frontend: `const result = await window.__TAURI__.core.invoke('my_cmd');`
4. Or use the facade: add to `src/lib/ipc.js`

## Adding a New Setting

Add one line to `all_defaults()` in `settings.rs`:
```rust
("my_feature.enabled", serde_json::json!(true)),
```
Automatically works in get_all_settings, reset_settings, and init.

### Built-in Appearance & Accessibility Settings

- `font_size` (string, default `"default"`) -- Small/Default/Large/Extra Large. Applied via `--font-size-base` CSS variable.
- `reduce_motion` (boolean, default `false`) -- Disables animations app-wide.
- `high_contrast` (boolean, default `false`) -- Increases contrast for better visibility.

## Adding a New Utility Window

1. Create `src/windows/mywindow.html` + `src/windows/mywindow.js`
2. Add config to `get_window_config()` in `src-tauri/src/windows.rs`
3. Open via: `window.__TAURI__.core.invoke('open_window', { name: 'mywindow' })`
4. Add to Vite multi-page config in `vite.config.js`

## Branding

Edit `src/lib/branding.js`: name, tagline, logo, accentColor, copyright, links.
All utility windows read from this via `applyBranding()`.

## Keyboard Shortcuts

Registry in `shortcuts.rs` with 10 IPC commands: get/set/remove/reset shortcuts, conflict detection, preset management. Interactive editor window with canvas-based keyboard visualization (not DOM elements). The shortcuts window is fixed-size (800x680, non-resizable) with a modifier toggle bar for filtering by Cmd/Shift/Alt/Ctrl, collapsible categories, right-click context menu to reset individual shortcuts, and record-search mode (press keys to search by binding). Command labels are displayed directly on assigned keys.

## Window Utilities

`window-utils.js` provides shared behavior for all utility windows:

- **Escape-to-close:** `setupEscapeToClose()` wires the Escape key to close the current window.
- **File drop prevention:** Prevents accidental file drops from navigating away from the window.
- **Branding application:** Applies app name, logo, and accent color from `branding.js`.

## CSS Conventions

- Cross-platform normalization is handled by `tauri-plugin-normalize` (registered first in `lib.rs`). It injects CSS on every page load for box-sizing, font rendering, form controls, and adds `.webview-webkit` / `.webview-chromium` classes to `<html>`.
- `color-scheme: dark` in `shared.css` -- tells the browser to render native controls (scrollbars, form elements) in dark mode.
- `user-select: none` by default on `body` -- prevents accidental text selection. Use `.selectable` class to override.
- `--font-size-base` CSS variable -- dynamically set from the `font_size` setting.

## Settings Window Navigation

The settings sidebar supports arrow key navigation for keyboard-first interaction.

## Security
- CSP restricts script/style/img sources to 'self' in tauri.conf.json
- Asset protocol scoped to $APPDATA and $RESOURCE (not filesystem-wide)
- open_external_url validates URL scheme (http/https only)
- Keyring read access not in default permissions (Rust proxies sensitive ops)
- .sr-only CSS class for screen reader text
- ARIA labels on interactive elements across all utility windows
