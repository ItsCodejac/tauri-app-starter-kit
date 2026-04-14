use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

/// Set to true when the updater plugin is registered in lib.rs.
static UPDATER_ENABLED: AtomicBool = AtomicBool::new(false);

/// Call this after registering the updater plugin.
#[allow(dead_code)]
pub fn mark_enabled() {
    UPDATER_ENABLED.store(true, Ordering::SeqCst);
}

fn is_enabled() -> Result<(), String> {
    if UPDATER_ENABLED.load(Ordering::SeqCst) {
        Ok(())
    } else {
        Err(
            "Updater not configured. Uncomment the updater plugin in lib.rs \
             and configure endpoints + pubkey in tauri.conf.json."
                .to_string(),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Check for available updates.
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    is_enabled()?;

    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            body: update.body.clone(),
            date: update.date.map(|d| d.to_string()),
        })),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Download and install the available update, then restart.
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    is_enabled()?;

    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            app.restart();
        }
        Ok(None) => return Err("No update available".to_string()),
        Err(e) => return Err(e.to_string()),
    }
}
