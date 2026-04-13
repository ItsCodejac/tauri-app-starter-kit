# System Tray

Optional system tray icon with a context menu. Defined in `src-tauri/src/tray.rs`.

## How It Works

`setup_tray()` is called during app startup in `lib.rs`. It creates a tray icon using the app's default window icon, with a tooltip set to the product name from `tauri.conf.json`.

**Left-click** shows and focuses the main window. **Right-click** opens the context menu.

## Default Menu Items

The tray ships with two items:

| ID | Label | Action |
|----|-------|--------|
| `tray_show` | Show Window | Show, unminimize, and focus the main window |
| `tray_quit` | Quit | Close the window (triggers the unsaved-changes flow) |

## Minimize to Tray

When the `tray.minimize_to_tray` setting is `true`, closing the window hides it instead of quitting. The user can quit via the tray menu or Cmd+Q.

The setting defaults to `false` and is stored in `settings.json`. Toggle it from React:

```ts
import { ipc } from '../lib/ipc';

await ipc.setSetting('tray.minimize_to_tray', true);
```

The `CloseRequested` handler in `lib.rs` checks this setting:

```rust
tauri::WindowEvent::CloseRequested { api, .. } => {
    if tray::should_minimize_to_tray(app) {
        api.prevent_close();
        let _ = window.hide();
        return;
    }
    // ... unsaved-changes flow
}
```

## Customizing the Tray Icon

The tray uses the app's default icon. To change it, replace `src-tauri/icons/icon.png` or set a custom icon:

```rust
let _tray = TrayIconBuilder::new()
    .icon(tauri::image::Image::from_path("path/to/tray-icon.png")?)
    // ...
    .build(app)?;
```

## Adding Custom Menu Items

Add items in `setup_tray()`:

```rust
let prefs_item = MenuItemBuilder::with_id("tray_prefs", "Preferences...").build(app)?;

let menu = MenuBuilder::new(app)
    .item(&show_item)
    .item(&separator)
    .item(&prefs_item)       // new item
    .item(&quit_item)
    .build()?;
```

Then handle the event:

```rust
.on_menu_event(|app: &AppHandle, event: MenuEvent| {
    match event.id().0.as_str() {
        "tray_show" => show_main_window(app),
        "tray_prefs" => { /* open preferences */ }
        "tray_quit" => request_quit(app),
        _ => {}
    }
})
```

## Disabling the Tray

Remove the `tray::setup_tray(&app_handle)` call in `lib.rs`. No other systems depend on it. The `minimize_to_tray` setting will simply have no effect.
