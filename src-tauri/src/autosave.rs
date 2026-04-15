use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

const RECOVERY_FILENAME: &str = "recovery.json";
const RECOVERY_TMP_FILENAME: &str = "recovery.json.tmp";

/// Holds the autosave timer state.
pub struct AutosaveState {
    /// The interval in seconds between autosaves.
    pub interval_secs: Mutex<u64>,
    /// Whether autosave is currently running.
    pub running: Mutex<bool>,
    /// The latest state data to persist.
    pub pending_state: Mutex<Option<String>>,
}

impl Default for AutosaveState {
    fn default() -> Self {
        Self {
            interval_secs: Mutex::new(60),
            running: Mutex::new(false),
            pending_state: Mutex::new(None),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryInfo {
    pub has_recovery: bool,
    pub timestamp: Option<String>,
    pub data: Option<serde_json::Value>,
}

fn recovery_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn recovery_path(app: &AppHandle) -> PathBuf {
    recovery_dir(app).join(RECOVERY_FILENAME)
}

fn recovery_tmp_path(app: &AppHandle) -> PathBuf {
    recovery_dir(app).join(RECOVERY_TMP_FILENAME)
}

/// Start the autosave loop. Runs on a background thread.
#[tauri::command]
pub fn start_autosave(app: AppHandle, state: State<'_, AutosaveState>, interval_secs: Option<u64>) -> Result<(), String> {
    let interval = interval_secs.unwrap_or(60).max(5); // minimum 5 seconds
    *state.interval_secs.lock().unwrap_or_else(|e| e.into_inner()) = interval;

    {
        let mut running = state.running.lock().unwrap_or_else(|e| e.into_inner());
        if *running {
            return Ok(()); // Already running
        }
        *running = true;
    }

    let app_handle = app.clone();
    std::thread::spawn(move || {
        loop {
            let interval = {
                let autosave = app_handle.state::<AutosaveState>();
                let running = autosave.running.lock().unwrap_or_else(|e| e.into_inner());
                if !*running {
                    break;
                }
                let val = *autosave.interval_secs.lock().unwrap_or_else(|e| e.into_inner());
                val
            };

            std::thread::sleep(std::time::Duration::from_secs(interval));

            let should_continue = {
                let autosave = app_handle.state::<AutosaveState>();
                let running = autosave.running.lock().unwrap_or_else(|e| e.into_inner());
                *running
            };
            if !should_continue {
                break;
            }

            // Check if there's pending state to save
            let data = {
                let autosave = app_handle.state::<AutosaveState>();
                let pending = autosave.pending_state.lock().unwrap_or_else(|e| e.into_inner());
                pending.clone()
            };

            if let Some(data) = data {
                if let Err(e) = write_recovery_atomic(&app_handle, &data) {
                    log::error!("Autosave failed: {}", e);
                } else {
                    log::info!("Autosave completed");
                    let _ = app_handle.emit("autosave:saved", ());
                }
            }
        }
        log::info!("Autosave loop stopped");
    });

    Ok(())
}

/// Stop the autosave loop.
#[tauri::command]
pub fn stop_autosave(state: State<'_, AutosaveState>) -> Result<(), String> {
    let mut running = state.running.lock().unwrap_or_else(|e| e.into_inner());
    *running = false;
    Ok(())
}

/// Update the state data that will be saved on the next autosave tick.
#[tauri::command]
pub fn update_autosave_state(state: State<'_, AutosaveState>, data: String) -> Result<(), String> {
    let mut pending = state.pending_state.lock().unwrap_or_else(|e| e.into_inner());
    *pending = Some(data);
    Ok(())
}

/// Check if a recovery file exists from a previous crash.
#[tauri::command]
pub fn check_recovery(app: AppHandle) -> Result<RecoveryInfo, String> {
    let path = recovery_path(&app);

    if !path.exists() {
        return Ok(RecoveryInfo {
            has_recovery: false,
            timestamp: None,
            data: None,
        });
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let timestamp = parsed.get("timestamp").and_then(|t| t.as_str()).map(String::from);
    let data = parsed.get("data").cloned();

    Ok(RecoveryInfo {
        has_recovery: true,
        timestamp,
        data,
    })
}

/// Write recovery file atomically (write to .tmp, then rename).
fn write_recovery_atomic(app: &AppHandle, data: &str) -> Result<(), String> {
    let dir = recovery_dir(app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let tmp_path = recovery_tmp_path(app);
    let final_path = recovery_path(app);

    let timestamp = unix_timestamp();
    let wrapper = serde_json::json!({
        "timestamp": timestamp,
        "data": serde_json::from_str::<serde_json::Value>(data).unwrap_or(serde_json::Value::String(data.to_string())),
    });

    let content = serde_json::to_string_pretty(&wrapper).map_err(|e| e.to_string())?;

    fs::write(&tmp_path, &content).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &final_path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Clean up recovery file on normal exit.
pub fn cleanup_recovery(app: &AppHandle) {
    let path = recovery_path(app);
    if path.exists() {
        let _ = fs::remove_file(&path);
        log::info!("Recovery file cleaned up");
    }
}

/// Simple Unix timestamp without pulling in chrono crate.
fn unix_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
