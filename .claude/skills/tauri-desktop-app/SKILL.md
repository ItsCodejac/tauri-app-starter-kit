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
  lib/ipc.js        # IPC facade (wraps all invoke/listen calls)
  lib/window-utils.js # Shared utilities for all windows
  lib/branding.js   # App identity config (name, logo, colors)
  styles/shared.css # Dark theme CSS variables + base styles
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

## Adding a New Utility Window

1. Create `src/windows/mywindow.html` + `src/windows/mywindow.js`
2. Add config to `get_window_config()` in `src-tauri/src/windows.rs`
3. Open via: `window.__TAURI__.core.invoke('open_window', { name: 'mywindow' })`
4. Add to Vite multi-page config in `vite.config.js`

## Branding

Edit `src/lib/branding.js`: name, tagline, logo, accentColor, copyright, links.
All utility windows read from this via `applyBranding()`.

## Keyboard Shortcuts

Registry in `shortcuts.rs` with 10 IPC commands: get/set/remove/reset shortcuts, conflict detection, preset management. Interactive editor window with visual keyboard.
