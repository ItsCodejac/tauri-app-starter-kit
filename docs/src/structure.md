# Project Structure

```
tauri-app-starter-kit/
├── src/                          # Frontend (framework-agnostic)
│   ├── main.js                   # Main window entry: branding, menu listeners, first-run, recovery
│   ├── changelog.json            # Structured changelog data (version history for What's New window)
│   ├── lib/
│   │   ├── ipc.js                # IPC facade: typed wrappers for all invoke() calls + event listeners
│   │   ├── window-utils.js       # Shared utilities for utility windows (close, branding, forms)
│   │   └── branding.js           # Single-source branding config (name, logo, colors, links)
│   ├── windows/
│   │   ├── splash.html + .js     # Splash screen with progress bar (first window on launch)
│   │   ├── about.html + .js      # About dialog (app info, version, links)
│   │   ├── settings.html + .js   # Settings / Preferences panel
│   │   ├── shortcuts.html + .js  # Interactive keyboard shortcut editor
│   │   ├── logs.html + .js       # Log viewer with level filtering
│   │   ├── update.html + .js     # Update checker and installer
│   │   ├── whatsnew.html + .js   # What's New / changelog dialog
│   │   └── welcome.html + .js    # First-run welcome / onboarding screen
│   └── styles/
│       └── shared.css            # Dark theme variables, reset, buttons, inputs, utility classes
├── src-tauri/                    # Rust backend
│   ├── tauri.conf.json           # App name, window config, bundle settings
│   ├── Cargo.toml                # Rust dependencies and crate config
│   └── src/
│       ├── main.rs               # Binary entry point, calls app_lib::run()
│       ├── lib.rs                # App setup: plugins, commands, menu, state, event handling
│       ├── menu.rs               # Declarative native menu bar builder
│       ├── commands.rs           # General IPC: dialogs, app info, open URL, logs, docs
│       ├── settings.rs           # Key-value settings store (tauri-plugin-store)
│       ├── shortcuts.rs          # Keyboard shortcut registry with presets
│       ├── windows.rs            # Utility window configuration and open/focus logic
│       ├── autosave.rs           # Background autosave loop + crash recovery
│       ├── crash_reporter.rs     # Panic hook + frontend error logging to disk
│       ├── diagnostics.rs        # System info collection for bug reports
│       ├── notifications.rs      # Native OS notification wrapper
│       ├── recent_files.rs       # Recent files list (MRU, max 10, validates paths)
│       ├── tray.rs               # System tray icon + context menu
│       └── updater.rs            # Update checking and installation
├── docs/                         # mdBook documentation (also in-app Help)
│   ├── book.toml                 # mdBook config
│   └── src/
│       ├── SUMMARY.md            # Table of contents
│       └── ...                   # Documentation pages
├── index.html                    # Main window HTML (template welcome page)
├── vite.config.js                # Vite config with multi-page build inputs
└── package.json                  # Node dependencies and scripts
```

## Rust backend

Each `.rs` file in `src-tauri/src/` has a single responsibility:

| File | Purpose |
|------|---------|
| `main.rs` | Binary entry point. Calls `app_lib::run()`. |
| `lib.rs` | Wires everything together: registers 18 plugins, IPC handlers, menu, managed state, splash-to-main window transition, quit confirmation, and cleanup. |
| `menu.rs` | Declarative menu system. Define menus as data (`MenuConfig` / `MenuDef`), the builder turns them into native menus. Events auto-forward to the frontend as `menu:{category}:{action}`. Includes dynamic menu state commands (`menu_set_enabled`, `menu_set_checked`, `menu_set_label`). |
| `commands.rs` | General IPC commands: native open/save dialogs, app info (name, version, paths), opening external URLs, reading log file contents, and opening bundled docs. |
| `settings.rs` | Persistent key-value settings using `tauri-plugin-store`. Centralizes all defaults in `all_defaults()`. Exposes `get_setting`, `set_setting`, `get_all_settings`, `reset_settings`. |
| `shortcuts.rs` | Keyboard shortcut registry with preset support. Stores bindings in `shortcuts.json`. Supports get/set/remove/reset per-binding, conflict detection, and named presets. Forward-compatible: new default bindings are merged on load. |
| `windows.rs` | Predefined utility window configurations (size, title, decorations, etc.). `open_window` IPC command creates or focuses windows by name. `open_window_internal` for Rust-side callers (menu handlers). |
| `autosave.rs` | Runs a background thread that periodically writes a recovery file. Uses atomic write (tmp + rename). On startup, checks for recovery data from a previous crash. Cleans up on normal exit. |
| `crash_reporter.rs` | Custom panic hook captures Rust panics to `.log` files in the crash-reports directory. Also handles frontend error logging via `log_frontend_error`. Includes `has_recent_crash` for startup detection. |
| `diagnostics.rs` | Collects app name, version, OS info, Rust/Tauri versions, memory usage (platform-specific), uptime, sanitized settings, and recent crash reports into a structured report or plain-text string. |
| `notifications.rs` | Thin wrapper around `tauri-plugin-notification` exposing a `send_notification` IPC command. |
| `recent_files.rs` | Manages a most-recently-used file list. Stores in the settings file. Auto-removes entries for files that no longer exist on disk. Maximum 10 entries. |
| `tray.rs` | Sets up a system tray icon with Show Window and Quit items. Left-click shows the window; right-click opens the menu. Supports minimize-to-tray via the `tray.minimize_to_tray` setting. |
| `updater.rs` | Wraps `tauri-plugin-updater` with an enabled/disabled guard. `check_for_updates` returns version info; `install_update` downloads, installs, and restarts. Commented out in `lib.rs` until configured. |

### Tauri plugins used

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-dialog` | Native open/save file dialogs |
| `tauri-plugin-fs` | Filesystem access |
| `tauri-plugin-shell` | Shell command execution |
| `tauri-plugin-opener` | Open URLs in default browser |
| `tauri-plugin-store` | Persistent JSON key-value store |
| `tauri-plugin-window-state` | Remember window position/size |
| `tauri-plugin-single-instance` | Prevent multiple app instances |
| `tauri-plugin-notification` | Native OS notifications |
| `tauri-plugin-prevent-default` | Block browser shortcuts (Ctrl+R, F5, etc.) |
| `tauri-plugin-os` | OS information |
| `tauri-plugin-process` | Restart/exit app |
| `tauri-plugin-clipboard-manager` | Clipboard read/write |
| `tauri-plugin-autostart` | Launch at login |
| `tauri-plugin-updater` | Auto-update (commented out until configured) |
| `tauri-plugin-keyring` | OS keychain access |
| `tauri-plugin-normalize` | Cross-platform CSS normalization (WebKit/Chromium) |
| `tauri-plugin-log` | Structured logging to file |

## Frontend

### Architecture

The frontend is **framework-agnostic**. The main window (`index.html`) loads vanilla JS via `src/main.js`. Utility windows are plain HTML files in `src/windows/`, each with a corresponding `.js` file. All windows share `src/styles/shared.css` for consistent theming.

You can add React, Svelte, Vue, or any other framework to `index.html` without affecting the utility windows.

### Shared modules (`src/lib/`)

| Module | Purpose |
|--------|---------|
| `ipc.js` | IPC facade. Every backend command is wrapped here so frontend code never calls `invoke()` directly. Also provides typed event listeners via the `events` object. |
| `window-utils.js` | Shared utilities for utility windows: close button wiring, branding application, form helpers (`setChecked`, `getValue`, etc.), external link handling, button feedback. Re-exports `invoke`, `listen`, and `branding`. |
| `branding.js` | Single-source branding configuration. All brand-aware windows read from here: app name, tagline, logo, accent color, copyright, website, GitHub URL, and license info. |

### Utility windows (`src/windows/`)

| Window | HTML + JS | Opens from |
|--------|-----------|------------|
| Splash | `splash.html` + `splash.js` | Auto on startup (first window in `tauri.conf.json`) |
| About | `about.html` + `about.js` | macOS App menu > About, or programmatically |
| Settings | `settings.html` + `settings.js` | App menu > Settings (Cmd+,), Window > Settings |
| Shortcuts | `shortcuts.html` + `shortcuts.js` | Help > Keyboard Shortcuts |
| Logs | `logs.html` + `logs.js` | Help > View Logs |
| Update | `update.html` + `update.js` | Help > Check for Updates |
| What's New | `whatsnew.html` + `whatsnew.js` | Help > What's New |
| Welcome | `welcome.html` + `welcome.js` | Automatically on first run (when `first_run` setting is `true`) |

### How Rust and the frontend communicate

**Frontend calls Rust (IPC invoke):**

```javascript
import { ipc } from './lib/ipc.js';

const info = await ipc.getAppInfo();
const value = await ipc.getSetting('theme');
await ipc.setSetting('theme', 'dark');
```

Each call maps to a `#[tauri::command]` function registered in `lib.rs`.

**Rust calls frontend (Tauri events):**

```rust
// Rust side
app.emit("autosave:saved", ()).unwrap();
```

```javascript
// Frontend side
import { events } from './lib/ipc.js';

events.onAutosaveSaved(() => {
  console.debug('Autosave completed');
});
```

Menu events use this pattern automatically. The menu handler converts the item ID `file_save` into the event `menu:file:save`.

## Where to add new files

| What you're adding | Where to put it |
|--------------------|-----------------|
| New IPC command | Create or extend a `.rs` file in `src-tauri/src/`, register in `lib.rs` `invoke_handler` |
| New utility window | Add `.html` + `.js` in `src/windows/`, add config in `windows.rs`, add entry in `vite.config.js` |
| New frontend module | `src/lib/` |
| New native menu | Add to `custom_menus()` in `src-tauri/src/menu.rs` |
| New Tauri plugin | Add to `Cargo.toml` dependencies, register in `lib.rs` builder |
| Static assets | `public/` (copied as-is to build output) |
| New setting | Add to `all_defaults()` in `settings.rs` |
