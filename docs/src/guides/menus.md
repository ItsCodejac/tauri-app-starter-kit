# Menus

The menu system is defined entirely in `src-tauri/src/menu.rs` using a data-driven approach. You describe menus as data structures; the builder converts them into native OS menus automatically.

## Core Types

```rust
/// A menu item definition.
pub enum MenuDef {
    Separator,
    Item { id: &'static str, label: &'static str, accel: Option<&'static str> },
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
| `About` | About dialog |
| `CloseWindow` | Close current window |

These are handled entirely by the OS. No event is emitted.

## Adding Items to Existing Menus

Edit the corresponding function in `menu.rs`. Each standard menu is defined by a function returning `MenuConfig`:

- `file_menu()` -- File menu
- `edit_menu()` -- Edit menu
- `view_menu()` -- View menu
- `window_menu()` -- Window menu
- `help_menu()` -- Help menu

Example -- add "Export" to the File menu:

```rust
fn file_menu() -> MenuConfig {
    MenuConfig {
        label: "File",
        items: vec![
            MenuDef::Item { id: "file_new", label: "New", accel: Some("CmdOrCtrl+N") },
            MenuDef::Item { id: "file_open", label: "Open...", accel: Some("CmdOrCtrl+O") },
            MenuDef::Separator,
            MenuDef::Item { id: "file_save", label: "Save", accel: Some("CmdOrCtrl+S") },
            MenuDef::Item { id: "file_save_as", label: "Save As...", accel: Some("CmdOrCtrl+Shift+S") },
            MenuDef::Separator,
            MenuDef::Item { id: "file_export", label: "Export...", accel: Some("CmdOrCtrl+E") }, // new
            MenuDef::Separator,
            MenuDef::Native(NativeItem::CloseWindow),
        ],
    }
}
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
                MenuDef::Item { id: "image_rotate_cw", label: "Rotate 90° CW", accel: None },
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
        "view_fullscreen" => {
            if let Some(w) = app.get_webview_window("main") {
                let is_full = w.is_fullscreen().unwrap_or(false);
                let _ = w.set_fullscreen(!is_full);
            }
            true
        }
        // Add your native handlers here...
        _ => false, // return false to forward to frontend
    }
}
```

Return `true` to consume the event (stops forwarding). Return `false` to let it forward to the frontend.

## Listening for Menu Events in React

Use `listen()` from `@tauri-apps/api/event`:

```tsx
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

function App() {
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    const menuEvents = [
      { event: 'menu:file:new', handler: () => console.log('New file') },
      { event: 'menu:file:open', handler: () => console.log('Open file') },
      { event: 'menu:file:save', handler: () => console.log('Save') },
      { event: 'menu:file:export', handler: () => console.log('Export') },
      { event: 'menu:image:resize', handler: () => console.log('Resize image') },
    ];

    menuEvents.forEach(({ event, handler }) => {
      listen(event, handler).then((unlisten) => unlisteners.push(unlisten));
    });

    return () => { unlisteners.forEach((u) => u()); };
  }, []);

  return <div>...</div>;
}
```

## macOS App Menu

On macOS, the leftmost menu shows the app name and is defined by `macos_app_menu()`. It includes About, Settings, Services, Hide/Show, and Quit. The `"__APP__"` label is automatically replaced with your app's `productName` from `tauri.conf.json`.

```rust
#[cfg(target_os = "macos")]
fn macos_app_menu() -> MenuConfig {
    MenuConfig {
        label: "__APP__",
        items: vec![
            MenuDef::Native(NativeItem::About),
            MenuDef::Separator,
            MenuDef::Item { id: "app_preferences", label: "Settings...", accel: Some("CmdOrCtrl+,") },
            MenuDef::Separator,
            MenuDef::Native(NativeItem::Services),
            MenuDef::Separator,
            MenuDef::Native(NativeItem::Hide),
            MenuDef::Native(NativeItem::HideOthers),
            MenuDef::Native(NativeItem::ShowAll),
            MenuDef::Separator,
            MenuDef::Native(NativeItem::Quit),
        ],
    }
}
```

This menu only compiles on macOS (`#[cfg(target_os = "macos")]`). On Windows and Linux, there is no app-name menu.

## Cross-Platform Notes

- `CmdOrCtrl` resolves to Cmd on macOS, Ctrl on Windows/Linux
- The macOS app menu is automatically excluded on other platforms via `#[cfg(target_os = "macos")]`
- `NativeItem::Hide`, `HideOthers`, `ShowAll`, and `Services` are macOS-only concepts but won't cause errors on other platforms -- they simply won't appear
- `CloseWindow` uses the platform's native close behavior
