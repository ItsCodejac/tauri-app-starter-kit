use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "settings.json";
const MAX_RECENT_FILES: usize = 10;

fn get_store(app: &AppHandle) -> Result<Arc<tauri_plugin_store::Store<Wry>>, String> {
    app.store(STORE_FILENAME).map_err(|e| e.to_string())
}

fn read_recent_list(store: &tauri_plugin_store::Store<Wry>) -> Vec<String> {
    store
        .get("recent_files")
        .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
        .unwrap_or_default()
}

fn write_recent_list(store: &tauri_plugin_store::Store<Wry>, files: &[String]) -> Result<(), String> {
    store.set("recent_files", serde_json::json!(files));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Get recent files, filtering out files that no longer exist.
#[tauri::command]
pub fn get_recent_files(app: AppHandle) -> Result<Vec<String>, String> {
    let store = get_store(&app)?;
    let files = read_recent_list(&store);

    // Filter to only existing files
    let valid: Vec<String> = files.into_iter().filter(|f| Path::new(f).exists()).collect();

    // Persist the cleaned list
    write_recent_list(&store, &valid)?;

    Ok(valid)
}

/// Add a file to the recent files list. Moves it to the front if already present.
#[tauri::command]
pub fn add_recent_file(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    let store = get_store(&app)?;
    let mut files = read_recent_list(&store);

    // Remove if already in list
    files.retain(|f| f != &path);

    // Insert at front
    files.insert(0, path);

    // Truncate to max
    files.truncate(MAX_RECENT_FILES);

    write_recent_list(&store, &files)?;

    Ok(files)
}

/// Clear the recent files list.
#[tauri::command]
pub fn clear_recent_files(app: AppHandle) -> Result<(), String> {
    let store = get_store(&app)?;
    write_recent_list(&store, &[])?;
    Ok(())
}
