# Project Structure

```
tauri-app-starter/
├── src/                          # React frontend (renderer)
│   ├── main.tsx                  # Entry point, wraps App in ToastProvider
│   ├── App.tsx                   # Root component: tabs, panels, menu listeners, shortcuts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── PanelLayout.tsx   # Resizable 4-panel layout with drag handles
│   │   │   ├── TabBar.tsx        # Workspace tab bar
│   │   │   └── StatusBar.tsx     # Bottom status bar
│   │   └── ui/
│   │       ├── CommandPalette.tsx # Fuzzy-search command launcher
│   │       └── Toast.tsx         # Toast notification renderer
│   ├── contexts/
│   │   └── ToastContext.tsx      # Toast state provider
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts  # Register keyboard shortcuts
│   │   ├── useSettings.ts          # Read/write settings via IPC
│   │   └── useToast.ts             # Toast hook (show/dismiss)
│   └── styles/
│       ├── theme.css             # CSS custom properties (colors, fonts)
│       └── global.css            # Reset and root layout
├── src-tauri/                    # Rust backend (main process)
│   ├── tauri.conf.json           # App name, window config, bundle settings
│   ├── Cargo.toml                # Rust dependencies and crate config
│   └── src/
│       ├── main.rs               # Entry point, calls lib::run()
│       ├── lib.rs                # App setup: plugins, commands, menu, autosave
│       ├── menu.rs               # Declarative native menu bar builder
│       ├── commands.rs           # IPC commands: dialogs, app info, open URL
│       ├── settings.rs           # Key-value settings store (tauri-plugin-store)
│       ├── autosave.rs           # Background autosave loop + crash recovery
│       └── recent_files.rs       # Recent files list (MRU, max 10, validates paths)
├── docs/                         # mdBook documentation (also in-app Help)
│   └── src/
│       ├── SUMMARY.md            # mdBook table of contents
│       └── ...                   # Doc pages
├── index.html                    # Vite HTML entry
├── vite.config.ts                # Vite config
├── package.json                  # Node dependencies and scripts
└── tsconfig.json                 # TypeScript config
```

## Rust backend

Each `.rs` file in `src-tauri/src/` has a single responsibility:

| File | Purpose |
|------|---------|
| `main.rs` | Binary entry point. Calls `app_lib::run()`. |
| `lib.rs` | Wires everything together: registers plugins, IPC handlers, menu, autosave state, and window cleanup. |
| `menu.rs` | Declarative menu system. Define menus as data (`MenuConfig` / `MenuDef`), the builder turns them into native menus. Events auto-forward to the frontend as `menu:{category}:{action}`. |
| `commands.rs` | General IPC commands: native open/save dialogs, app info (name, version, paths), and opening external URLs. |
| `settings.rs` | Persistent key-value settings using `tauri-plugin-store`. Initializes defaults on first run. Exposes `get_setting`, `set_setting`, `get_all_settings`, `reset_settings`. |
| `autosave.rs` | Runs a background thread that periodically writes a recovery file. Uses atomic write (tmp + rename). On startup, checks for recovery data from a previous crash. Cleans up on normal exit. |
| `recent_files.rs` | Manages a most-recently-used file list. Stores in the settings file. Auto-removes entries for files that no longer exist on disk. |

### Tauri plugins used

- `tauri-plugin-dialog` -- Native open/save file dialogs
- `tauri-plugin-fs` -- Filesystem access
- `tauri-plugin-shell` -- Shell command execution
- `tauri-plugin-opener` -- Open URLs in default browser
- `tauri-plugin-store` -- Persistent JSON key-value store
- `tauri-plugin-window-state` -- Remember window position/size
- `tauri-plugin-log` -- Structured logging

## React frontend

### Components

- **`PanelLayout`** -- The main layout engine. Accepts up to 4 panels (left, center, right, bottom). Panels are resizable via drag handles and collapsible via double-click. Sizes persist to `localStorage`.
- **`TabBar`** -- Horizontal tab bar for workspace switching. Each tab has an `id`, `label`, and optional `icon`.
- **`StatusBar`** -- Fixed-height bar at the bottom. Takes `statusText` (left) and `rightContent` (right) props.
- **`CommandPalette`** -- Modal overlay with fuzzy text search over a list of commands. Keyboard navigable (arrows + Enter). Triggered by Cmd+Shift+P.
- **`Toast`** -- Renders stacked toast notifications in the bottom-right corner. Auto-dismisses after 4 seconds.

### Hooks

- **`useKeyboardShortcuts(shortcuts)`** -- Registers global `keydown` listeners. Each shortcut defines `key`, `modifiers`, `action`, and `description`. The `meta` modifier maps to Cmd on macOS and Ctrl on other platforms.
- **`useSettings()`** -- Loads all settings from the Rust backend on mount. Returns `getSetting(key)` and `setSetting(key, value)`. Optimistically updates local state, then persists via IPC.
- **`useToast()`** -- Returns `toast(message, type?, duration?)` and `dismiss(id)`. Types: `info`, `success`, `warning`, `error`.

### Contexts

- **`ToastProvider`** -- Wraps the app in `main.tsx`. Manages toast state and auto-dismiss timers.

## How Rust and React communicate

### Frontend calls Rust (IPC invoke)

React calls Rust functions using `invoke` from `@tauri-apps/api/core`:

```tsx
import { invoke } from '@tauri-apps/api/core';

// Call a Rust #[tauri::command] function
const info = await invoke<AppInfo>('get_app_info');
const value = await invoke('get_setting', { key: 'theme' });
await invoke('set_setting', { key: 'theme', value: 'dark' });
```

Each `invoke` maps to a `#[tauri::command]` function registered in `lib.rs`.

### Rust calls React (Tauri events)

Rust emits events that React listens to with `listen`:

```rust
// Rust side
app.emit("autosave:saved", ()).unwrap();
```

```tsx
// React side
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('autosave:saved', () => {
  console.log('Autosave completed');
});
```

Menu events use this pattern automatically. The menu handler converts the item ID `file_save` into the event `menu:file:save`.

## Where to add new files

| What you're adding | Where to put it |
|--------------------|-----------------|
| New IPC command | Create or extend a `.rs` file in `src-tauri/src/`, register in `lib.rs` `invoke_handler` |
| New React component | `src/components/layout/` for layout, `src/components/ui/` for UI widgets |
| New React hook | `src/hooks/` |
| New context provider | `src/contexts/`, wrap in `main.tsx` |
| New native menu | Add to `custom_menus()` in `src-tauri/src/menu.rs` |
| New Tauri plugin | Add to `Cargo.toml` dependencies, register in `lib.rs` builder |
| Static assets | `public/` (copied as-is to build output) |
