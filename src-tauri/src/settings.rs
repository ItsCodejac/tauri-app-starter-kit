use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "settings.json";

/// Default application settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub recent_files: Vec<String>,
    pub autosave_enabled: bool,
    pub autosave_interval_secs: u64,
    pub first_run: bool,
    pub locale: String,
    pub autostart: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            recent_files: Vec::new(),
            autosave_enabled: true,
            autosave_interval_secs: 60,
            first_run: true,
            locale: "en".to_string(),
            autostart: false,
        }
    }
}

/// Get the store, creating it if needed.
fn get_store(app: &AppHandle) -> Result<Arc<tauri_plugin_store::Store<Wry>>, String> {
    app.store(STORE_FILENAME).map_err(|e| e.to_string())
}

/// Initialize settings with defaults for any missing keys.
pub fn init_settings(app: &AppHandle) -> Result<(), String> {
    let store = get_store(app)?;
    let defaults = AppSettings::default();

    if !store.has("theme") {
        store.set("theme", serde_json::json!(defaults.theme));
    }
    if !store.has("recent_files") {
        store.set("recent_files", serde_json::json!(defaults.recent_files));
    }
    if !store.has("autosave_enabled") {
        store.set("autosave_enabled", serde_json::json!(defaults.autosave_enabled));
    }
    if !store.has("autosave_interval_secs") {
        store.set("autosave_interval_secs", serde_json::json!(defaults.autosave_interval_secs));
    }
    if !store.has("first_run") {
        store.set("first_run", serde_json::json!(defaults.first_run));
    }
    if !store.has("locale") {
        store.set("locale", serde_json::json!(defaults.locale));
    }
    if !store.has("tray.minimize_to_tray") {
        store.set("tray.minimize_to_tray", serde_json::json!(false));
    }
    if !store.has("autostart") {
        store.set("autostart", serde_json::json!(defaults.autostart));
    }
    if !store.has("view_zoom_level") {
        store.set("view_zoom_level", serde_json::json!(100u32));
    }
    if !store.has("updates.checkOnStartup") {
        store.set("updates.checkOnStartup", serde_json::json!(true));
    }
    if !store.has("updates.lastCheck") {
        store.set("updates.lastCheck", serde_json::json!(0u64));
    }
    if !store.has("app.lastSeenVersion") {
        store.set("app.lastSeenVersion", serde_json::json!(""));
    }

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_setting(app: AppHandle, key: String) -> Result<serde_json::Value, String> {
    let store = get_store(&app)?;
    match store.get(&key) {
        Some(val) => Ok(val),
        None => Err(format!("Setting '{}' not found", key)),
    }
}

#[tauri::command]
pub fn set_setting(app: AppHandle, key: String, value: serde_json::Value) -> Result<(), String> {
    let store = get_store(&app)?;
    store.set(&key, value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_settings(app: AppHandle) -> Result<serde_json::Value, String> {
    let store = get_store(&app)?;
    let defaults = AppSettings::default();

    let theme = store.get("theme").unwrap_or(serde_json::json!(defaults.theme));
    let recent_files = store.get("recent_files").unwrap_or(serde_json::json!(defaults.recent_files));
    let autosave_enabled = store.get("autosave_enabled").unwrap_or(serde_json::json!(defaults.autosave_enabled));
    let autosave_interval_secs = store.get("autosave_interval_secs").unwrap_or(serde_json::json!(defaults.autosave_interval_secs));
    let first_run = store.get("first_run").unwrap_or(serde_json::json!(defaults.first_run));
    let locale = store.get("locale").unwrap_or(serde_json::json!(defaults.locale));
    let minimize_to_tray = store.get("tray.minimize_to_tray").unwrap_or(serde_json::json!(false));
    let autostart = store.get("autostart").unwrap_or(serde_json::json!(defaults.autostart));
    let view_zoom_level = store.get("view_zoom_level").unwrap_or(serde_json::json!(100u32));
    let updates_check_on_startup = store.get("updates.checkOnStartup").unwrap_or(serde_json::json!(true));
    let updates_last_check = store.get("updates.lastCheck").unwrap_or(serde_json::json!(0u64));
    let app_last_seen_version = store.get("app.lastSeenVersion").unwrap_or(serde_json::json!(""));

    Ok(serde_json::json!({
        "theme": theme,
        "recent_files": recent_files,
        "autosave_enabled": autosave_enabled,
        "autosave_interval_secs": autosave_interval_secs,
        "first_run": first_run,
        "locale": locale,
        "tray.minimize_to_tray": minimize_to_tray,
        "autostart": autostart,
        "view_zoom_level": view_zoom_level,
        "updates.checkOnStartup": updates_check_on_startup,
        "updates.lastCheck": updates_last_check,
        "app.lastSeenVersion": app_last_seen_version,
    }))
}

#[tauri::command]
pub fn reset_settings(app: AppHandle) -> Result<(), String> {
    let store = get_store(&app)?;
    let defaults = AppSettings::default();

    store.set("theme", serde_json::json!(defaults.theme));
    store.set("recent_files", serde_json::json!(defaults.recent_files));
    store.set("autosave_enabled", serde_json::json!(defaults.autosave_enabled));
    store.set("autosave_interval_secs", serde_json::json!(defaults.autosave_interval_secs));
    store.set("first_run", serde_json::json!(defaults.first_run));
    store.set("locale", serde_json::json!(defaults.locale));
    store.set("tray.minimize_to_tray", serde_json::json!(false));
    store.set("autostart", serde_json::json!(defaults.autostart));
    store.set("view_zoom_level", serde_json::json!(100u32));
    store.set("updates.checkOnStartup", serde_json::json!(true));
    store.set("updates.lastCheck", serde_json::json!(0u64));
    store.set("app.lastSeenVersion", serde_json::json!(""));

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
