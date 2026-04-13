use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{MenuBuilder, MenuEvent, MenuItemBuilder};
use tauri::{AppHandle, Manager};

/// Set up the system tray icon with a context menu.
///
/// This is **optional** -- remove the `tray::setup_tray()` call in `lib.rs`
/// if your app doesn't need a tray icon. No other systems depend on it.
///
/// Behaviour:
/// - Left-click: show and focus the main window
/// - Right-click: shows the context menu (Show Window / Quit)
/// - On macOS, closing the window hides it (if `tray.minimize_to_tray` setting
///   is true) so the app stays alive in the tray.
pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItemBuilder::with_id("tray_show", "Show Window").build(app)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItemBuilder::with_id("tray_quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&separator)
        .item(&quit_item)
        .build()?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().expect("app must have a default icon"))
        .tooltip(
            app.config()
                .product_name
                .clone()
                .unwrap_or_else(|| "App".into()),
        )
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app: &AppHandle, event: MenuEvent| {
            let id = event.id().0.as_str();
            match id {
                "tray_show" => show_main_window(app),
                "tray_quit" => request_quit(app),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Show and focus the main window (un-hide if it was hidden to tray).
fn show_main_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Request app quit through the normal quit-confirmation flow.
///
/// If the frontend has unsaved changes the `CloseRequested` handler will
/// intercept and show a confirmation dialog.  Otherwise the app exits.
fn request_quit(app: &AppHandle) {
    // Emit a close request so the unsaved-changes flow runs
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.close();
    } else {
        // No window open -- just exit
        app.exit(0);
    }
}

/// Check whether the "minimize to tray" setting is enabled.
///
/// Reads `tray.minimize_to_tray` from the settings store.  Falls back to
/// `false` if the setting is missing or the store can't be read.
pub fn should_minimize_to_tray(app: &AppHandle) -> bool {
    use tauri_plugin_store::StoreExt;
    if let Ok(store) = app.store("settings.json") {
        if let Some(val) = store.get("tray.minimize_to_tray") {
            return val.as_bool().unwrap_or(false);
        }
    }
    false
}
