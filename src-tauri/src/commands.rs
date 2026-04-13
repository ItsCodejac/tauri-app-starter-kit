use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub app_data_dir: String,
    pub app_config_dir: String,
    pub app_cache_dir: String,
}

/// Show a native open-file dialog with configurable filters.
/// Returns the selected file path, or null if cancelled.
#[tauri::command]
pub async fn show_open_dialog(
    app: AppHandle,
    title: Option<String>,
    filters: Option<Vec<DialogFilter>>,
    multiple: Option<bool>,
) -> Result<Option<Vec<String>>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(t) = title {
        builder = builder.set_title(t);
    }

    if let Some(filter_list) = filters {
        for f in filter_list {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(f.name, &exts);
        }
    }

    if multiple.unwrap_or(false) {
        let (tx, rx) = std::sync::mpsc::channel();
        builder.pick_files(move |paths| {
            let result = paths.map(|p| p.iter().map(|fp| fp.to_string()).collect::<Vec<_>>());
            let _ = tx.send(result);
        });
        let result = rx.recv().map_err(|e| e.to_string())?;
        Ok(result)
    } else {
        let (tx, rx) = std::sync::mpsc::channel();
        builder.pick_file(move |path| {
            let result = path.map(|p| vec![p.to_string()]);
            let _ = tx.send(result);
        });
        let result = rx.recv().map_err(|e| e.to_string())?;
        Ok(result)
    }
}

/// Show a native save-file dialog with configurable filters.
/// Returns the selected file path, or null if cancelled.
#[tauri::command]
pub async fn show_save_dialog(
    app: AppHandle,
    title: Option<String>,
    default_name: Option<String>,
    filters: Option<Vec<DialogFilter>>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(t) = title {
        builder = builder.set_title(t);
    }

    if let Some(name) = default_name {
        builder = builder.set_file_name(name);
    }

    if let Some(filter_list) = filters {
        for f in filter_list {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(f.name, &exts);
        }
    }

    let (tx, rx) = std::sync::mpsc::channel();
    builder.save_file(move |path| {
        let result = path.map(|p| p.to_string());
        let _ = tx.send(result);
    });
    let result = rx.recv().map_err(|e| e.to_string())?;
    Ok(result)
}

/// Get application info: name, version, and data directory paths.
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> Result<AppInfo, String> {
    let config = app.config();

    let name = config.product_name.clone().unwrap_or_else(|| "App".to_string());
    let version = config.version.clone().unwrap_or_else(|| "0.0.0".to_string());

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let app_config_dir = app
        .path()
        .app_config_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let app_cache_dir = app
        .path()
        .app_cache_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(AppInfo {
        name,
        version,
        app_data_dir,
        app_config_dir,
        app_cache_dir,
    })
}

/// Open a URL in the default external browser.
#[tauri::command]
pub async fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Read the application log file contents.
/// Returns the log file contents as a string (last ~500KB to avoid huge payloads).
#[tauri::command]
pub fn get_log_contents(app: AppHandle) -> Result<String, String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| e.to_string())?;

    // Tauri log plugin writes to {app_name}.log in the log directory
    let config = app.config();
    let app_name = config.product_name.clone().unwrap_or_else(|| "app".to_string());
    let log_file = log_dir.join(format!("{}.log", app_name));

    if !log_file.exists() {
        return Ok(String::new());
    }

    let contents = std::fs::read_to_string(&log_file).map_err(|e| e.to_string())?;

    // Return last ~500KB to avoid sending huge payloads
    const MAX_BYTES: usize = 500 * 1024;
    if contents.len() > MAX_BYTES {
        // Find a newline boundary near the cutoff
        let start = contents.len() - MAX_BYTES;
        let trimmed = &contents[start..];
        if let Some(newline_pos) = trimmed.find('\n') {
            Ok(format!("... (truncated) ...\n{}", &trimmed[newline_pos + 1..]))
        } else {
            Ok(format!("... (truncated) ...\n{}", trimmed))
        }
    } else {
        Ok(contents)
    }
}

/// Open the bundled docs (mdBook) in the default browser.
/// Looks for docs/book/index.html relative to the app resource directory.
#[tauri::command]
pub async fn open_docs(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    // In development, docs are relative to the project root
    // In production, they're bundled as resources
    let docs_path = app
        .path()
        .resource_dir()
        .map(|p| p.join("docs").join("book").join("index.html"))
        .map_err(|e| e.to_string())?;

    if docs_path.exists() {
        let url = format!("file://{}", docs_path.to_string_lossy());
        app.opener()
            .open_url(&url, None::<&str>)
            .map_err(|e| e.to_string())?;
    } else {
        // Fallback: try project-relative path (dev mode)
        let dev_path = std::env::current_dir()
            .map(|p| p.join("docs").join("book").join("index.html"))
            .map_err(|e| e.to_string())?;

        if dev_path.exists() {
            let url = format!("file://{}", dev_path.to_string_lossy());
            app.opener()
                .open_url(&url, None::<&str>)
                .map_err(|e| e.to_string())?;
        } else {
            return Err("Documentation not found. Run 'mdbook build docs' first.".to_string());
        }
    }
    Ok(())
}
