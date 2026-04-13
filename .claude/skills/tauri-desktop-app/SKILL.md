---
name: tauri-desktop-app
description: Expert guidance for building desktop apps with the tauri-app-starter template. Use when working with Tauri v2 + React + TypeScript desktop apps that use this template's patterns — native OS menus (data-driven menu.rs), resizable panel layouts, IPC between Rust and React, settings persistence, autosave/crash recovery, keyboard shortcuts, command palette, or toast notifications. Activate when modifying menus, adding panels, creating IPC commands, or customizing the app skeleton.
---

# Tauri Desktop App Starter

Template for production desktop apps: Tauri v2 (Rust) + React + TypeScript + Vite.

## Project Structure

```
src-tauri/src/
  lib.rs          # Entry, plugin registration, IPC handler wiring
  menu.rs         # Data-driven native OS menu system
  settings.rs     # Persistent settings (tauri-plugin-store)
  autosave.rs     # Background autosave + crash recovery
  commands.rs     # IPC: dialogs, app info, URL open
  recent_files.rs # MRU file list (max 10)

src/
  App.tsx                           # Main component, menu listeners, shortcuts
  components/layout/TabBar.tsx      # Workspace tab bar
  components/layout/PanelLayout.tsx # Resizable 4-panel layout
  components/layout/StatusBar.tsx   # Bottom status line
  components/ui/Toast.tsx           # Notification display
  components/ui/CommandPalette.tsx   # Cmd+Shift+P command menu
  hooks/useKeyboardShortcuts.ts     # Global shortcut registry
  hooks/useSettings.ts              # Settings IPC wrapper
  hooks/useToast.ts                 # Toast hook
  contexts/ToastContext.tsx         # Toast state management
  styles/theme.css                  # CSS custom properties (dark theme)
  styles/global.css                 # Resets, scrollbars, utilities
```

## Adding OS Menu Items

Menus are data-driven in `src-tauri/src/menu.rs`. Edit the config functions.

Add items to existing menus by editing `file_menu()`, `edit_menu()`, `view_menu()`, `window_menu()`, or `help_menu()`.

Add app-specific top-level menus via `custom_menus()` — inserted between View and Window automatically.

```rust
fn custom_menus() -> Vec<MenuConfig> {
    vec![MenuConfig {
        label: "MyMenu",
        items: vec![
            MenuDef::Item { id: "my_action", label: "Do Thing", accel: Some("CmdOrCtrl+D") },
            MenuDef::Separator,
            MenuDef::Submenu { id: "my_sub", label: "More", items: vec![
                MenuDef::Item { id: "my_sub_a", label: "Sub A", accel: None },
            ]},
        ],
    }]
}
```

Event routing is automatic: ID `"my_action"` emits `"menu:my:action"` to frontend. For Rust-side handling, add to `handle_native()`.

**MenuDef variants:** `Item { id, label, accel }` | `Separator` | `Native(NativeItem)` | `Submenu { id, label, items }`.

**NativeItem variants:** Undo, Redo, Cut, Copy, Paste, SelectAll, Minimize, Hide, HideOthers, ShowAll, Quit, Services, About, CloseWindow.

## Adding IPC Commands

1. Create in Rust:
```rust
#[tauri::command]
pub async fn my_command(name: String) -> Result<String, String> {
    Ok(format!("Hello, {name}"))
}
```

2. Register in `lib.rs` invoke_handler:
```rust
.invoke_handler(tauri::generate_handler![commands::my_command])
```

3. Call from React:
```typescript
import { invoke } from '@tauri-apps/api/core';
const result = await invoke<string>('my_command', { name: 'World' });
```

## Listening to Menu Events

```typescript
import { listen } from '@tauri-apps/api/event';
useEffect(() => {
    const unlisten = listen('menu:my:action', () => { /* handle */ });
    return () => { unlisten.then(u => u()); };
}, []);
```

## Workspace Tabs

Edit `tabs` array in `src/App.tsx`. Render per-tab content based on `activeTab`.

## Panel Layout

4 resizable panels (left, center, right, bottom). Collapse on double-click header. Sizes persist to localStorage. Pass content as ReactNode props.

## Settings

**Rust**: Add fields to `AppSettings` in settings.rs, update `init_settings()`.  
**React**: `const { settings, getSetting, setSetting } = useSettings();`

## Keyboard Shortcuts

```typescript
useKeyboardShortcuts([
    { key: 'n', modifiers: ['meta'], action: handleNew, description: 'New File' },
]);
```

`formatShortcut()` returns display string (⌘N on Mac, Ctrl+N on Windows).

## Toast Notifications

```typescript
const { toast } = useToast();
toast('Saved', 'success'); // Types: info, success, warning, error
```

## Autosave

Frontend sends state: `invoke('update_autosave_state', { state: JSON.stringify(data) })`.  
Listen for recovery: `listen('autosave:recovery-available', handler)`.

## Theme

CSS variables in `theme.css`: `--surface-*`, `--border-*`, `--text-*`, `--accent-*`, `--font-*`.

## New App Checklist

1. `tauri.conf.json` — productName, identifier, window title/size
2. `menu.rs` — Edit menus, add custom_menus()
3. `App.tsx` — Workspace tabs, menu listeners
4. `theme.css` — Accent colors
5. `package.json` — name, version
6. `Cargo.toml` — package name, authors
