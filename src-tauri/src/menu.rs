use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, Wry};

/// Tracks the current zoom level for the webview.
pub static ZOOM_LEVEL: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(100);
/// Tracks stay-on-top state.
pub static STAY_ON_TOP: AtomicBool = AtomicBool::new(false);

// =============================================================================
// MENU CONFIGURATION
// =============================================================================
//
// To customize menus for your app:
//
// 1. Edit the items in standard_menus() to add/remove/reorder items within
//    File, Edit, View, Window, or Help.
//
// 2. Call custom_menus() to add app-specific menus (e.g. "Clip", "Timeline",
//    "Markers"). These are inserted between View and Window automatically.
//
// 3. Menu events are emitted to the frontend as "menu:{menu}:{action}".
//    For example, id "file_new" emits "menu:file:new".
//    Listen in React: listen('menu:file:new', handler)
//
// 4. For items that should be handled natively in Rust (like fullscreen toggle,
//    window close), add them to NATIVE_HANDLERS below.
// =============================================================================

/// A menu item definition. Separator, a clickable item, a predefined OS item,
/// or a submenu containing more items.
pub enum MenuDef {
    /// Horizontal separator line
    Separator,
    /// Custom clickable item: (id, label, optional accelerator)
    Item { id: &'static str, label: &'static str, accel: Option<&'static str> },
    /// Checkbox menu item with an initial checked state
    Check { id: &'static str, label: &'static str, checked: bool, accel: Option<&'static str> },
    /// OS-native predefined items (Undo, Redo, Cut, Copy, Paste, etc.)
    Native(NativeItem),
    /// Submenu containing child items
    Submenu { id: &'static str, label: &'static str, items: Vec<MenuDef> },
}

/// Predefined native menu items the OS handles automatically.
pub enum NativeItem {
    Undo,
    Redo,
    Cut,
    Copy,
    Paste,
    SelectAll,
    Minimize,
    Hide,
    HideOthers,
    ShowAll,
    Quit,
    Services,
    About,
    CloseWindow,
}

/// A top-level menu (submenu in the menu bar).
pub struct MenuConfig {
    pub label: &'static str,
    pub items: Vec<MenuDef>,
}

// ---------------------------------------------------------------------------
// STANDARD MENUS -- Edit these to customize the built-in menus.
// ---------------------------------------------------------------------------

fn file_menu() -> MenuConfig {
    let mut items = vec![
        MenuDef::Item { id: "file_new", label: "New", accel: Some("CmdOrCtrl+N") },
        MenuDef::Item { id: "file_open", label: "Open...", accel: Some("CmdOrCtrl+O") },
        MenuDef::Submenu {
            id: "file_open_recent",
            label: "Open Recent",
            items: vec![
                MenuDef::Item { id: "recent_clear", label: "Clear Recent", accel: None },
            ],
        },
        MenuDef::Separator,
        MenuDef::Item { id: "file_save", label: "Save", accel: Some("CmdOrCtrl+S") },
        MenuDef::Item { id: "file_save_as", label: "Save As...", accel: Some("CmdOrCtrl+Shift+S") },
    ];

    // On Windows/Linux there's no macOS App menu, so put Settings in File menu
    if !cfg!(target_os = "macos") {
        items.push(MenuDef::Separator);
        items.push(MenuDef::Item { id: "app_preferences", label: "Settings...", accel: Some("CmdOrCtrl+,") });
    }

    items.push(MenuDef::Separator);
    items.push(MenuDef::Native(NativeItem::CloseWindow));

    MenuConfig {
        label: "File",
        items,
    }
}

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
            MenuDef::Separator,
            MenuDef::Item { id: "edit_find", label: "Find...", accel: Some("CmdOrCtrl+F") },
            MenuDef::Item { id: "edit_find-replace", label: "Find and Replace...", accel: Some("CmdOrCtrl+Shift+F") },
        ],
    }
}

fn view_menu() -> MenuConfig {
    let mut items = vec![
        MenuDef::Item { id: "view_fullscreen", label: "Toggle Fullscreen", accel: Some("Ctrl+CmdOrCtrl+F") },
        MenuDef::Separator,
        MenuDef::Item { id: "view_zoom_in", label: "Zoom In", accel: Some("CmdOrCtrl+=") },
        MenuDef::Item { id: "view_zoom_out", label: "Zoom Out", accel: Some("CmdOrCtrl+-") },
        MenuDef::Item { id: "view_actual_size", label: "Actual Size", accel: Some("CmdOrCtrl+0") },
        MenuDef::Separator,
        MenuDef::Check { id: "view_status_bar", label: "Show Status Bar", checked: true, accel: None },
    ];

    if cfg!(debug_assertions) {
        items.push(MenuDef::Separator);
        items.push(MenuDef::Item { id: "view_devtools", label: "Developer Tools", accel: Some("CmdOrCtrl+Alt+I") });
    }

    MenuConfig {
        label: "View",
        items,
    }
}

fn window_menu() -> MenuConfig {
    MenuConfig {
        label: "Window",
        items: vec![
            MenuDef::Native(NativeItem::Minimize),
            MenuDef::Item { id: "window_zoom", label: "Zoom", accel: None },
            MenuDef::Check { id: "window_stay-on-top", label: "Stay on Top", checked: false, accel: None },
            MenuDef::Separator,
            MenuDef::Item { id: "window_settings", label: "Settings", accel: None },
            MenuDef::Separator,
            MenuDef::Item { id: "window_bring_all", label: "Bring All to Front", accel: None },
        ],
    }
}

fn help_menu() -> MenuConfig {
    MenuConfig {
        label: "Help",
        items: vec![
            MenuDef::Item { id: "help_docs", label: "Documentation", accel: None },
            MenuDef::Item { id: "help_report_issue", label: "Report Issue", accel: None },
            MenuDef::Separator,
            MenuDef::Item { id: "help_shortcuts", label: "Keyboard Shortcuts", accel: None },
            MenuDef::Item { id: "help_view-logs", label: "View Logs...", accel: None },
            MenuDef::Separator,
            MenuDef::Item { id: "help_check-for-updates", label: "Check for Updates...", accel: None },
            MenuDef::Item { id: "help_whats-new", label: "What's New", accel: None },
        ],
    }
}

// ---------------------------------------------------------------------------
// CUSTOM MENUS -- Add your app-specific menus here.
// These are inserted between View and Window in the menu bar.
//
// Example A -- Image editor:
//
//   fn custom_menus() -> Vec<MenuConfig> {
//       vec![
//           MenuConfig {
//               label: "Image",
//               items: vec![
//                   MenuDef::Item { id: "image_resize", label: "Resize...", accel: Some("CmdOrCtrl+Alt+I") },
//                   MenuDef::Item { id: "image_crop", label: "Crop", accel: Some("CmdOrCtrl+Shift+X") },
//                   MenuDef::Separator,
//                   MenuDef::Item { id: "image_rotate_cw", label: "Rotate 90° CW", accel: None },
//                   MenuDef::Item { id: "image_rotate_ccw", label: "Rotate 90° CCW", accel: None },
//               ],
//           },
//           MenuConfig {
//               label: "Filter",
//               items: vec![
//                   MenuDef::Item { id: "filter_blur", label: "Blur...", accel: None },
//                   MenuDef::Item { id: "filter_sharpen", label: "Sharpen", accel: None },
//               ],
//           },
//       ]
//   }
//
// Example B -- Project management tool:
//
//   fn custom_menus() -> Vec<MenuConfig> {
//       vec![
//           MenuConfig {
//               label: "Project",
//               items: vec![
//                   MenuDef::Item { id: "project_add_task", label: "Add Task", accel: Some("CmdOrCtrl+T") },
//                   MenuDef::Item { id: "project_archive", label: "Archive Completed", accel: None },
//               ],
//           },
//       ]
//   }
//
fn custom_menus() -> Vec<MenuConfig> {
    vec![]
}

// ---------------------------------------------------------------------------
// macOS APP MENU -- The leftmost menu with the app name.
// Includes About, Settings, Services, Hide, Quit.
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
fn macos_app_menu() -> MenuConfig {
    MenuConfig {
        label: "__APP__", // replaced with actual app name at build time
        items: vec![
            MenuDef::Item { id: "app_about", label: "About", accel: None },
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

// =============================================================================
// NATIVE EVENT HANDLERS
// =============================================================================
//
// Items listed here are handled in Rust instead of being forwarded to the
// frontend. Everything else is auto-forwarded as "menu:{category}:{action}".
//
// The id format convention: "{category}_{action}" (e.g. "file_close",
// "view_fullscreen"). The auto-forward converts underscores to colons and
// splits on the first underscore: "file_close" -> "menu:file:close".

fn handle_native(app: &AppHandle, id: &str) -> bool {
    match id {
        // -- Window-opening menu items (handled natively, not forwarded to frontend) --
        "app_about" => {
            crate::windows::open_window_internal(app, "about");
            return true;
        }
        "app_preferences" | "window_settings" => {
            crate::windows::open_window_internal(app, "settings");
            return true;
        }
        "help_shortcuts" => {
            crate::windows::open_window_internal(app, "shortcuts");
            return true;
        }
        "help_view-logs" => {
            crate::windows::open_window_internal(app, "logs");
            return true;
        }
        "help_check-for-updates" => {
            crate::windows::open_window_internal(app, "update");
            return true;
        }
        "help_whats-new" => {
            crate::windows::open_window_internal(app, "whatsnew");
            return true;
        }
        "help_docs" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = crate::commands::open_docs(handle).await {
                    log::error!("Failed to open docs: {}", e);
                }
            });
            true
        }
        "file_close" => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.close();
            }
            true
        }
        "view_devtools" => {
            if let Some(w) = app.get_webview_window("main") {
                if w.is_devtools_open() {
                    w.close_devtools();
                } else {
                    w.open_devtools();
                }
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
        "window_zoom" => {
            if let Some(w) = app.get_webview_window("main") {
                let is_max = w.is_maximized().unwrap_or(false);
                if is_max { let _ = w.unmaximize(); } else { let _ = w.maximize(); }
            }
            true
        }
        "window_bring_all" => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            true
        }
        "window_stay-on-top" => {
            let current = STAY_ON_TOP.load(Ordering::SeqCst);
            let new_val = !current;
            STAY_ON_TOP.store(new_val, Ordering::SeqCst);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_always_on_top(new_val);
            }
            // Update the check state on the menu item
            if let Some(menu) = app.menu() {
                if let Some(item) = find_menu_item(&menu, "window_stay-on-top") {
                    if let MenuItemKind::Check(check) = item {
                        let _ = check.set_checked(new_val);
                    }
                }
            }
            true
        }
        "view_zoom_in" => {
            let current = ZOOM_LEVEL.load(Ordering::SeqCst);
            let new_level = (current + 10).min(200);
            ZOOM_LEVEL.store(new_level, Ordering::SeqCst);
            if let Some(w) = app.get_webview_window("main") {
                let scale = new_level as f64 / 100.0;
                let _ = w.eval(&format!("document.documentElement.style.zoom = '{}'", scale));
            }
            // Persist zoom to settings
            let handle = app.clone();
            let _ = crate::settings::set_setting(handle, "view_zoom_level".to_string(), serde_json::json!(new_level));
            true
        }
        "view_zoom_out" => {
            let current = ZOOM_LEVEL.load(Ordering::SeqCst);
            let new_level = if current > 50 { current - 10 } else { 50 };
            ZOOM_LEVEL.store(new_level, Ordering::SeqCst);
            if let Some(w) = app.get_webview_window("main") {
                let scale = new_level as f64 / 100.0;
                let _ = w.eval(&format!("document.documentElement.style.zoom = '{}'", scale));
            }
            let handle = app.clone();
            let _ = crate::settings::set_setting(handle, "view_zoom_level".to_string(), serde_json::json!(new_level));
            true
        }
        "view_actual_size" => {
            ZOOM_LEVEL.store(100, Ordering::SeqCst);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.eval("document.documentElement.style.zoom = '1'");
            }
            let handle = app.clone();
            let _ = crate::settings::set_setting(handle, "view_zoom_level".to_string(), serde_json::json!(100u32));
            true
        }
        _ => false,
    }
}

// =============================================================================
// BUILDER -- You shouldn't need to edit below this line.
// =============================================================================

/// Build a Tauri submenu from a MenuConfig.
fn build_submenu(app: &AppHandle, config: &MenuConfig) -> tauri::Result<tauri::menu::Submenu<Wry>> {
    let label = if config.label == "__APP__" {
        app.config().product_name.clone().unwrap_or_else(|| "App".into())
    } else {
        config.label.to_string()
    };

    let mut builder = SubmenuBuilder::new(app, &label);

    for item in &config.items {
        builder = append_item(app, builder, item)?;
    }

    builder.build()
}

/// Append a single MenuDef item to a SubmenuBuilder.
fn append_item<'a>(
    app: &'a AppHandle,
    builder: SubmenuBuilder<'a, Wry, AppHandle>,
    item: &MenuDef,
) -> tauri::Result<SubmenuBuilder<'a, Wry, AppHandle>> {
    Ok(match item {
        MenuDef::Separator => builder.separator(),
        MenuDef::Item { id, label, accel } => {
            let mut item_builder = MenuItemBuilder::with_id(*id, *label);
            if let Some(a) = accel {
                item_builder = item_builder.accelerator(*a);
            }
            builder.item(&item_builder.build(app)?)
        }
        MenuDef::Check { id, label, checked, accel } => {
            let mut item_builder = CheckMenuItemBuilder::with_id(*id, *label).checked(*checked);
            if let Some(a) = accel {
                item_builder = item_builder.accelerator(*a);
            }
            builder.item(&item_builder.build(app)?)
        }
        MenuDef::Native(native) => match native {
            NativeItem::Undo => builder.undo(),
            NativeItem::Redo => builder.redo(),
            NativeItem::Cut => builder.cut(),
            NativeItem::Copy => builder.copy(),
            NativeItem::Paste => builder.paste(),
            NativeItem::SelectAll => builder.select_all(),
            NativeItem::Minimize => builder.minimize(),
            NativeItem::Hide => builder.hide(),
            NativeItem::HideOthers => builder.hide_others(),
            NativeItem::ShowAll => builder.show_all(),
            NativeItem::Quit => builder.quit(),
            NativeItem::Services => builder.services(),
            NativeItem::About => builder.about(None),
            NativeItem::CloseWindow => builder.close_window(),
        },
        MenuDef::Submenu { id, label, items } => {
            let mut sub = SubmenuBuilder::with_id(app, *id, *label);
            for child in items {
                sub = append_item(app, sub, child)?;
            }
            builder.item(&sub.build()?)
        }
    })
}

/// Build the complete application menu bar.
///
/// Menu order: [macOS App] | File | Edit | View | [custom...] | Window | Help
pub fn build_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<Wry>> {
    let mut builder = MenuBuilder::new(app);

    // macOS app menu (About, Settings, Quit)
    #[cfg(target_os = "macos")]
    {
        let app_submenu = build_submenu(app, &macos_app_menu())?;
        builder = builder.item(&app_submenu);
    }

    // Standard menus: File, Edit, View
    for config in [file_menu(), edit_menu(), view_menu()] {
        let submenu = build_submenu(app, &config)?;
        builder = builder.item(&submenu);
    }

    // Custom app-specific menus (inserted between View and Window)
    for config in custom_menus() {
        let submenu = build_submenu(app, &config)?;
        builder = builder.item(&submenu);
    }

    // Standard menus: Window, Help
    for config in [window_menu(), help_menu()] {
        let submenu = build_submenu(app, &config)?;
        builder = builder.item(&submenu);
    }

    builder.build()
}

/// Handle menu events.
///
/// Native actions (close, fullscreen, etc.) are handled in Rust.
/// Everything else is auto-forwarded to the frontend as an event.
///
/// ID format: "category_action" -> emits "menu:category:action"
/// Example: "file_new" -> "menu:file:new", "clip_split" -> "menu:clip:split"
pub fn handle_menu_event(app: &AppHandle, event: &tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();
    log::info!("Menu event: {}", id);

    // Try native handler first
    if handle_native(app, id) {
        return;
    }

    // Auto-forward to frontend: convert "category_action" to "menu:category:action"
    let event_name = if let Some(pos) = id.find('_') {
        format!("menu:{}:{}", &id[..pos], id[pos + 1..].replace('_', "-"))
    } else {
        format!("menu:{}", id)
    };

    let _ = app.emit(&event_name, ());
}

// =============================================================================
// DYNAMIC MENU STATE -- IPC commands to modify menu items at runtime.
// =============================================================================

use tauri::menu::MenuItemKind;

/// Recursively search all menu items for one matching `target_id`.
fn find_menu_item(menu: &tauri::menu::Menu<Wry>, target_id: &str) -> Option<MenuItemKind<Wry>> {
    for item in menu.items().unwrap_or_default() {
        if let Some(found) = find_in_kind(&item, target_id) {
            return Some(found);
        }
    }
    None
}

fn find_in_kind(kind: &MenuItemKind<Wry>, target_id: &str) -> Option<MenuItemKind<Wry>> {
    match kind {
        MenuItemKind::MenuItem(item) => {
            if item.id().0 == target_id {
                return Some(kind.clone());
            }
        }
        MenuItemKind::Check(item) => {
            if item.id().0 == target_id {
                return Some(kind.clone());
            }
        }
        MenuItemKind::Submenu(sub) => {
            if sub.id().0 == target_id {
                return Some(kind.clone());
            }
            for child in sub.items().unwrap_or_default() {
                if let Some(found) = find_in_kind(&child, target_id) {
                    return Some(found);
                }
            }
        }
        _ => {}
    }
    None
}

/// Enable or disable a menu item by its id.
#[tauri::command]
pub fn menu_set_enabled(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let menu = app.menu().ok_or("No menu found")?;
    let item = find_menu_item(&menu, &id).ok_or(format!("Menu item '{}' not found", id))?;
    match item {
        MenuItemKind::MenuItem(m) => m.set_enabled(enabled).map_err(|e| e.to_string()),
        MenuItemKind::Check(m) => m.set_enabled(enabled).map_err(|e| e.to_string()),
        MenuItemKind::Submenu(m) => m.set_enabled(enabled).map_err(|e| e.to_string()),
        _ => Err(format!("Cannot set enabled on menu item '{}'", id)),
    }
}

/// Set the checked state of a checkbox menu item by its id.
#[tauri::command]
pub fn menu_set_checked(app: AppHandle, id: String, checked: bool) -> Result<(), String> {
    let menu = app.menu().ok_or("No menu found")?;
    let item = find_menu_item(&menu, &id).ok_or(format!("Menu item '{}' not found", id))?;
    match item {
        MenuItemKind::Check(m) => m.set_checked(checked).map_err(|e| e.to_string()),
        _ => Err(format!("Menu item '{}' is not a check item", id)),
    }
}

/// Update the label of a menu item by its id.
#[tauri::command]
pub fn menu_set_label(app: AppHandle, id: String, label: String) -> Result<(), String> {
    let menu = app.menu().ok_or("No menu found")?;
    let item = find_menu_item(&menu, &id).ok_or(format!("Menu item '{}' not found", id))?;
    match item {
        MenuItemKind::MenuItem(m) => m.set_text(label).map_err(|e| e.to_string()),
        MenuItemKind::Check(m) => m.set_text(label).map_err(|e| e.to_string()),
        MenuItemKind::Submenu(m) => m.set_text(label).map_err(|e| e.to_string()),
        _ => Err(format!("Cannot set label on menu item '{}'", id)),
    }
}
