# Menus

The menu system is defined entirely in `src-tauri/src/menu.rs` using a data-driven approach. You describe menus as data structures; the builder converts them into native OS menus automatically.

## Core Types

```rust
/// A menu item definition.
pub enum MenuDef {
    Separator,
    Item { id: &'static str, label: &'static str, accel: Option<&'static str> },
    Check { id: &'static str, label: &'static str, checked: bool, accel: Option<&'static str> },
    Native(NativeItem),
    Submenu { id: &'static str, label: &'static str, items: Vec<MenuDef> },
}

/// A top-level menu in the menu bar.
pub struct MenuConfig {
    pub label: &'static str,
    pub items: Vec<MenuDef>,
}
```

## MenuDef Variants

### Separator

Horizontal divider line between items.

```rust
MenuDef::Separator,
```

### Item

Custom clickable menu item with an ID, label, and optional keyboard accelerator.

```rust
MenuDef::Item { id: "file_new", label: "New", accel: Some("CmdOrCtrl+N") },
MenuDef::Item { id: "help_docs", label: "Documentation", accel: None },
```

Accelerator format uses Tauri's cross-platform syntax: `CmdOrCtrl`, `Shift`, `Alt`, `Ctrl`, combined with `+`. Examples: `"CmdOrCtrl+S"`, `"CmdOrCtrl+Shift+S"`, `"Ctrl+CmdOrCtrl+F"`.

### Check

Checkbox menu item with an initial checked state. Displays a checkmark when checked. The checked state can be updated at runtime from Rust or from the frontend.

```rust
MenuDef::Check { id: "view_status_bar", label: "Show Status Bar", checked: true, accel: None },
MenuDef::Check { id: "window_stay-on-top", label: "Stay on Top", checked: false, accel: None },
```

#### Updating Check State from the Frontend

Use `ipc.menuSetChecked()`:

```javascript
import { ipc } from './lib/ipc.js';

await ipc.menuSetChecked('view_status_bar', false);
await ipc.menuSetChecked('window_stay-on-top', true);
```

#### Updating Check State from Rust

In a native handler, find the menu item and call `set_checked`:

```rust
if let Some(menu) = app.menu() {
    if let Some(item) = find_menu_item(&menu, "view_status_bar") {
        if let MenuItemKind::Check(check) = item {
            let _ = check.set_checked(new_value);
        }
    }
}
```

The `window_stay-on-top` handler in the starter kit demonstrates this pattern -- it toggles the always-on-top window state and updates the check menu item in a single native handler.

### Native

OS-handled items that work automatically without custom event handling.

```rust
MenuDef::Native(NativeItem::Undo),
```

### Submenu

Nested submenu containing child items.

```rust
MenuDef::Submenu {
    id: "file_open_recent",
    label: "Open Recent",
    items: vec![
        MenuDef::Item { id: "recent_clear", label: "Clear Recent", accel: None },
    ],
},
```

## NativeItem Variants

| Variant | Description |
|---------|-------------|
| `Undo` | Edit > Undo |
| `Redo` | Edit > Redo |
| `Cut` | Edit > Cut |
| `Copy` | Edit > Copy |
| `Paste` | Edit > Paste |
| `SelectAll` | Edit > Select All |
| `Minimize` | Window > Minimize |
| `Hide` | macOS hide app |
| `HideOthers` | macOS hide others |
| `ShowAll` | macOS show all |
| `Quit` | Quit application |
| `Services` | macOS Services submenu |
| `CloseWindow` | Close current window |

These are handled entirely by the OS. No event is emitted.

## Customizing Standard Menus

Each standard menu is defined by a function in `menu.rs`: `file_menu()`, `edit_menu()`, `view_menu()`, `window_menu()`, and `help_menu()`. You can freely edit, remove, or replace items in any of them.

### Removing items

Delete the `MenuDef::Item` or `MenuDef::Check` line (and any adjacent `MenuDef::Separator` that no longer makes sense). For example, to remove Find from the Edit menu:

```rust
fn edit_menu() -> MenuConfig {
    MenuConfig {
        label: "Edit",
        items: vec![
            MenuDef::Native(NativeItem::Undo),
            MenuDef::Native(NativeItem::Redo),
            MenuDef::Separator,
            MenuDef::Native(NativeItem::Cut),
            MenuDef::Native(NativeItem::Copy),
            MenuDef::Native(NativeItem::Paste),
            MenuDef::Separator,
            MenuDef::Native(NativeItem::SelectAll),
            // Find and Find & Replace removed
        ],
    }
}
```

### Replacing items

Change the `id`, `label`, and `accel` fields. If your app doesn't use files, you could simplify the File menu:

```rust
fn file_menu() -> MenuConfig {
    MenuConfig {
        label: "File",
        items: vec![
            MenuDef::Item { id: "file_new-project", label: "New Project...", accel: Some("CmdOrCtrl+N") },
            MenuDef::Item { id: "file_open-project", label: "Open Project...", accel: Some("CmdOrCtrl+O") },
            MenuDef::Separator,
            MenuDef::Native(NativeItem::CloseWindow),
        ],
    }
}
```

If you add a new `id` that should be handled natively in Rust, add a case to `handle_native()`. Otherwise it is automatically forwarded to the frontend as a `menu:{category}:{action}` event.

### Renaming a menu

Change the `label` field in the returned `MenuConfig`:

```rust
fn file_menu() -> MenuConfig {
    MenuConfig {
        label: "Project",  // was "File"
        items: vec![ /* ... */ ],
    }
}
```

## Adding Items to Existing Menus

Edit the corresponding function in `menu.rs`. Each standard menu is defined by a function returning `MenuConfig`:

- `file_menu()` -- File menu (includes Open Recent submenu, Save/Save As, and Settings on non-macOS)
- `edit_menu()` -- Edit menu (native undo/redo/cut/copy/paste/select-all, plus Find and Find & Replace)
- `view_menu()` -- View menu (fullscreen, zoom in/out/actual size, show status bar, devtools in debug)
- `window_menu()` -- Window menu (minimize, zoom, stay on top, settings, bring all to front)
- `help_menu()` -- Help menu (docs, report issue, shortcuts, logs, check for updates, what's new)

Example -- add "Export" to the File menu:

```rust
MenuDef::Item { id: "file_export", label: "Export...", accel: Some("CmdOrCtrl+E") },
```

## Adding Custom Top-Level Menus

Edit `custom_menus()` to return your app-specific menus. These are inserted between View and Window in the menu bar.

```rust
fn custom_menus() -> Vec<MenuConfig> {
    vec![
        MenuConfig {
            label: "Image",
            items: vec![
                MenuDef::Item { id: "image_resize", label: "Resize...", accel: Some("CmdOrCtrl+Alt+I") },
                MenuDef::Item { id: "image_crop", label: "Crop", accel: Some("CmdOrCtrl+Shift+X") },
                MenuDef::Separator,
                MenuDef::Item { id: "image_rotate_cw", label: "Rotate 90 CW", accel: None },
            ],
        },
        MenuConfig {
            label: "Filter",
            items: vec![
                MenuDef::Item { id: "filter_blur", label: "Blur...", accel: None },
                MenuDef::Item { id: "filter_sharpen", label: "Sharpen", accel: None },
            ],
        },
    ]
}
```

Final menu bar order: **[macOS App] | File | Edit | View | Image | Filter | Window | Help**

## Event Routing

When a menu item is clicked:

1. `handle_menu_event()` is called with the item's `id`
2. It checks `handle_native()` first -- if matched, the action runs in Rust and stops
3. Otherwise, the `id` is converted to an event name and emitted to the frontend

### ID Format to Event Name

The `id` uses the pattern `{category}_{action}`. The first underscore splits category from action. Remaining underscores become hyphens.

| ID | Event Name |
|----|------------|
| `file_new` | `menu:file:new` |
| `file_save_as` | `menu:file:save-as` |
| `view_zoom_in` | `menu:view:zoom-in` |
| `image_rotate_cw` | `menu:image:rotate-cw` |
| `app_preferences` | `menu:app:preferences` |

## Handling Events Natively in Rust

Add cases to `handle_native()` for actions that should not reach the frontend:

```rust
fn handle_native(app: &AppHandle, id: &str) -> bool {
    match id {
        "file_close" => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.close();
            }
            true
        }
        // Add your native handlers here...
        _ => false, // return false to forward to frontend
    }
}
```

Return `true` to consume the event (stops forwarding). Return `false` to let it forward to the frontend.

### Current native handlers

The following menu items are handled natively and are **not** forwarded to the frontend:

| Menu Item ID | Action |
|-------------|--------|
| `app_about` | Opens the About window |
| `app_preferences` / `window_settings` | Opens the Settings window |
| `help_shortcuts` | Opens the Keyboard Shortcuts window |
| `help_view-logs` | Opens the Log Viewer window |
| `help_check-for-updates` | Opens the Update window |
| `help_whats-new` | Opens the What's New window |
| `help_docs` | Opens bundled docs in the default browser |
| `file_close` | Closes the main window |
| `view_devtools` | Toggles developer tools (debug builds only) |
| `view_fullscreen` | Toggles fullscreen on the main window |
| `view_zoom_in` | Zooms in by 10% (persists to settings) |
| `view_zoom_out` | Zooms out by 10% (persists to settings) |
| `view_actual_size` | Resets zoom to 100% (persists to settings) |
| `window_zoom` | Toggles maximize/restore |
| `window_stay-on-top` | Toggles always-on-top and updates the check menu item |
| `window_bring_all` | Unminimizes, shows, and focuses the main window |

## Listening for Menu Events in the Frontend

Use the IPC facade:

```javascript
import { events } from './lib/ipc.js';

events.onMenuEvent('menu:file:new', () => console.debug('New file'));
events.onMenuEvent('menu:file:save', () => console.debug('Save'));
events.onMenuEvent('menu:image:resize', () => console.debug('Resize image'));
```

Or use `listen()` directly from `window.__TAURI__`:

```javascript
const { listen } = window.__TAURI__.event;

listen('menu:file:new', () => console.debug('New file'));
```

## Dynamic Menu State

Three IPC commands let you modify menu items at runtime from the frontend:

```javascript
import { ipc } from './lib/ipc.js';

// Enable or disable a menu item
await ipc.menuSetEnabled('file_save', false);

// Set checked state of a Check item
await ipc.menuSetChecked('view_status_bar', true);

// Change label text
await ipc.menuSetLabel('file_save', 'Save Project');
```

## macOS App Menu

On macOS, the leftmost menu shows the app name and is defined by `macos_app_menu()`. It includes About, Settings, Services, Hide/Show, and Quit. The `"__APP__"` label is automatically replaced with your app's `productName` from `tauri.conf.json`.

This menu only compiles on macOS (`#[cfg(target_os = "macos")]`). On Windows and Linux, Settings is placed in the File menu instead.

## Cross-Platform Notes

- `CmdOrCtrl` resolves to Cmd on macOS, Ctrl on Windows/Linux
- The macOS app menu is automatically excluded on other platforms via `#[cfg(target_os = "macos")]`
- On non-macOS platforms, Settings is added to the File menu automatically
- `NativeItem::Hide`, `HideOthers`, `ShowAll`, and `Services` are macOS-only concepts but won't cause errors on other platforms -- they simply won't appear
- `CloseWindow` uses the platform's native close behavior
