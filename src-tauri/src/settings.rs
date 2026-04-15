use std::sync::Arc;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "settings.json";

/// All setting keys and their defaults in one place.
/// When adding a new setting: add it here, and it automatically
/// works in init_settings, get_all_settings, and reset_settings.
fn all_defaults() -> Vec<(&'static str, serde_json::Value)> {
    vec![
        // General
        ("theme", serde_json::json!("dark")),
        ("locale", serde_json::json!("en")),
        ("autostart", serde_json::json!(false)),
        ("first_run", serde_json::json!(true)),
        ("updates.checkOnStartup", serde_json::json!(true)),
        ("updates.lastCheck", serde_json::json!(0u64)),
        ("app.lastSeenVersion", serde_json::json!("")),

        // Appearance
        ("view_zoom_level", serde_json::json!(100u32)),
        ("font_size", serde_json::json!("default")),  // small, default, large, extra-large
        ("show_statusbar", serde_json::json!(true)),
        ("show_tooltips", serde_json::json!(true)),
        ("reduce_motion", serde_json::json!(false)),
        ("high_contrast", serde_json::json!(false)),

        // Autosave
        ("autosave_enabled", serde_json::json!(true)),
        ("autosave_interval_secs", serde_json::json!(60u64)),

        // Performance
        ("performance.mode", serde_json::json!("balanced")),
        ("performance.hardwareAcceleration", serde_json::json!(true)),
        ("performance.gpuEnabled", serde_json::json!(true)),

        // Cache
        ("cache.maxCacheSize", serde_json::json!(10u32)),
        ("cache.cleanupOldCache", serde_json::json!(true)),

        // Startup
        ("startup_behavior", serde_json::json!("empty")),

        // Tray
        ("tray.minimize_to_tray", serde_json::json!(false)),
        ("tray.show_icon", serde_json::json!(true)),

        // Internal
        ("recent_files", serde_json::json!([])),
    ]
}

/// Get the store, creating it if needed.
fn get_store(app: &AppHandle) -> Result<Arc<tauri_plugin_store::Store<Wry>>, String> {
    app.store(STORE_FILENAME).map_err(|e| e.to_string())
}

/// Initialize settings with defaults for any missing keys.
pub fn init_settings(app: &AppHandle) -> Result<(), String> {
    let store = get_store(app)?;

    for (key, default) in all_defaults() {
        if !store.has(key) {
            store.set(key, default);
        }
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
    let mut map = serde_json::Map::new();

    for (key, default) in all_defaults() {
        let val = store.get(key).unwrap_or(default);
        map.insert(key.to_string(), val);
    }

    Ok(serde_json::Value::Object(map))
}

#[tauri::command]
pub fn reset_settings(app: AppHandle) -> Result<(), String> {
    let store = get_store(&app)?;

    for (key, default) in all_defaults() {
        store.set(key, default);
    }

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
