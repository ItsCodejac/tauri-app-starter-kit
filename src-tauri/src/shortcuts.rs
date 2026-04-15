use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, State, Wry};
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "shortcuts.json";

// =============================================================================
// DATA MODEL
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutBinding {
    pub command_id: String,
    pub label: String,
    pub category: String,
    pub keys: Vec<String>,
    pub default_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutPreset {
    pub id: String,
    pub name: String,
    pub is_builtin: bool,
    pub bindings: Vec<ShortcutBinding>,
}

/// Lightweight preset info returned by get_presets (no bindings).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetInfo {
    pub id: String,
    pub name: String,
    pub is_builtin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutRegistry {
    pub active_preset_id: String,
    pub presets: Vec<ShortcutPreset>,
}

pub struct ShortcutState(pub Mutex<ShortcutRegistry>);

// =============================================================================
// DEFAULT BINDINGS -- derived from menu.rs accelerators
// =============================================================================

fn default_bindings() -> Vec<ShortcutBinding> {
    vec![
        // -- File --
        ShortcutBinding {
            command_id: "file.new".into(),
            label: "New".into(),
            category: "File".into(),
            keys: vec!["CmdOrCtrl".into(), "N".into()],
            default_keys: vec!["CmdOrCtrl".into(), "N".into()],
        },
        ShortcutBinding {
            command_id: "file.open".into(),
            label: "Open...".into(),
            category: "File".into(),
            keys: vec!["CmdOrCtrl".into(), "O".into()],
            default_keys: vec!["CmdOrCtrl".into(), "O".into()],
        },
        ShortcutBinding {
            command_id: "file.save".into(),
            label: "Save".into(),
            category: "File".into(),
            keys: vec!["CmdOrCtrl".into(), "S".into()],
            default_keys: vec!["CmdOrCtrl".into(), "S".into()],
        },
        ShortcutBinding {
            command_id: "file.save_as".into(),
            label: "Save As...".into(),
            category: "File".into(),
            keys: vec!["CmdOrCtrl".into(), "Shift".into(), "S".into()],
            default_keys: vec!["CmdOrCtrl".into(), "Shift".into(), "S".into()],
        },
        // -- Edit --
        ShortcutBinding {
            command_id: "edit.find".into(),
            label: "Find...".into(),
            category: "Edit".into(),
            keys: vec!["CmdOrCtrl".into(), "F".into()],
            default_keys: vec!["CmdOrCtrl".into(), "F".into()],
        },
        ShortcutBinding {
            command_id: "edit.find_replace".into(),
            label: "Find and Replace...".into(),
            category: "Edit".into(),
            keys: vec!["CmdOrCtrl".into(), "Shift".into(), "F".into()],
            default_keys: vec!["CmdOrCtrl".into(), "Shift".into(), "F".into()],
        },
        // -- View --
        ShortcutBinding {
            command_id: "view.fullscreen".into(),
            label: "Toggle Fullscreen".into(),
            category: "View".into(),
            keys: if cfg!(target_os = "macos") {
                vec!["Ctrl".into(), "CmdOrCtrl".into(), "F".into()]
            } else {
                vec!["F11".into()]
            },
            default_keys: if cfg!(target_os = "macos") {
                vec!["Ctrl".into(), "CmdOrCtrl".into(), "F".into()]
            } else {
                vec!["F11".into()]
            },
        },
        ShortcutBinding {
            command_id: "view.zoom_in".into(),
            label: "Zoom In".into(),
            category: "View".into(),
            keys: vec!["CmdOrCtrl".into(), "=".into()],
            default_keys: vec!["CmdOrCtrl".into(), "=".into()],
        },
        ShortcutBinding {
            command_id: "view.zoom_out".into(),
            label: "Zoom Out".into(),
            category: "View".into(),
            keys: vec!["CmdOrCtrl".into(), "-".into()],
            default_keys: vec!["CmdOrCtrl".into(), "-".into()],
        },
        ShortcutBinding {
            command_id: "view.actual_size".into(),
            label: "Actual Size".into(),
            category: "View".into(),
            keys: vec!["CmdOrCtrl".into(), "0".into()],
            default_keys: vec!["CmdOrCtrl".into(), "0".into()],
        },
        ShortcutBinding {
            command_id: "view.devtools".into(),
            label: "Developer Tools".into(),
            category: "View".into(),
            keys: vec!["CmdOrCtrl".into(), "Alt".into(), "I".into()],
            default_keys: vec!["CmdOrCtrl".into(), "Alt".into(), "I".into()],
        },
        // -- App --
        ShortcutBinding {
            command_id: "app.preferences".into(),
            label: "Settings...".into(),
            category: "App".into(),
            keys: vec!["CmdOrCtrl".into(), ",".into()],
            default_keys: vec!["CmdOrCtrl".into(), ",".into()],
        },
        // -- Non-menu shortcuts --
        ShortcutBinding {
            command_id: "app.command_palette".into(),
            label: "Command Palette".into(),
            category: "App".into(),
            keys: vec!["CmdOrCtrl".into(), "Shift".into(), "P".into()],
            default_keys: vec!["CmdOrCtrl".into(), "Shift".into(), "P".into()],
        },
    ]
}

fn default_registry() -> ShortcutRegistry {
    ShortcutRegistry {
        active_preset_id: "default".into(),
        presets: vec![ShortcutPreset {
            id: "default".into(),
            name: "Default".into(),
            is_builtin: true,
            bindings: default_bindings(),
        }],
    }
}

// =============================================================================
// PERSISTENCE
// =============================================================================

fn get_store(
    app: &AppHandle,
) -> Result<std::sync::Arc<tauri_plugin_store::Store<Wry>>, String> {
    app.store(STORE_FILENAME).map_err(|e| e.to_string())
}

fn save_registry(app: &AppHandle, registry: &ShortcutRegistry) -> Result<(), String> {
    let store = get_store(app)?;
    store.set(
        "registry",
        serde_json::to_value(registry).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn load_registry(app: &AppHandle) -> ShortcutRegistry {
    let store = match get_store(app) {
        Ok(s) => s,
        Err(_) => return default_registry(),
    };

    match store.get("registry") {
        Some(val) => {
            let mut registry: ShortcutRegistry =
                match serde_json::from_value(val) {
                    Ok(r) => r,
                    Err(_) => return default_registry(),
                };

            // Merge any new default bindings that don't exist yet (forward compat)
            let defaults = default_bindings();
            for preset in &mut registry.presets {
                for def in &defaults {
                    if !preset.bindings.iter().any(|b| b.command_id == def.command_id) {
                        preset.bindings.push(def.clone());
                    }
                }
                // Update default_keys for existing bindings in case they changed
                for binding in &mut preset.bindings {
                    if let Some(def) = defaults.iter().find(|d| d.command_id == binding.command_id) {
                        binding.default_keys = def.default_keys.clone();
                    }
                }
            }

            registry
        }
        None => default_registry(),
    }
}

/// Initialize shortcut state. Called during app setup.
pub fn init_shortcuts(app: &AppHandle) -> ShortcutState {
    let registry = load_registry(app);
    ShortcutState(Mutex::new(registry))
}

// =============================================================================
// HELPERS
// =============================================================================

/// Get a mutable reference to the active preset, or error.
fn with_active_preset<F, R>(registry: &mut ShortcutRegistry, f: F) -> Result<R, String>
where
    F: FnOnce(&mut ShortcutPreset) -> Result<R, String>,
{
    let active_id = registry.active_preset_id.clone();
    let preset = registry
        .presets
        .iter_mut()
        .find(|p| p.id == active_id)
        .ok_or_else(|| format!("Active preset '{}' not found", active_id))?;
    f(preset)
}

// =============================================================================
// IPC COMMANDS
// =============================================================================

/// Returns all bindings from the active preset.
#[tauri::command]
pub fn get_shortcuts(state: State<'_, ShortcutState>) -> Vec<ShortcutBinding> {
    let registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    let active_id = &registry.active_preset_id;
    registry
        .presets
        .iter()
        .find(|p| p.id == *active_id)
        .map(|p| p.bindings.clone())
        .unwrap_or_default()
}

/// Updates a shortcut binding, saves to disk.
#[tauri::command]
pub fn set_shortcut(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    command_id: String,
    keys: Vec<String>,
) -> Result<(), String> {
    // Deduplicate keys while preserving order (e.g. user accidentally sends CmdOrCtrl twice)
    let mut seen = std::collections::HashSet::new();
    let keys: Vec<String> = keys.into_iter().filter(|k| seen.insert(k.clone())).collect();

    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    with_active_preset(&mut registry, |preset| {
        let binding = preset
            .bindings
            .iter_mut()
            .find(|b| b.command_id == command_id)
            .ok_or_else(|| format!("Command '{}' not found", command_id))?;
        binding.keys = keys;
        Ok(())
    })?;
    save_registry(&app, &registry)
}

/// Clears the keys for a command (sets to empty vec).
#[tauri::command]
pub fn remove_shortcut(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    command_id: String,
) -> Result<(), String> {
    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    with_active_preset(&mut registry, |preset| {
        let binding = preset
            .bindings
            .iter_mut()
            .find(|b| b.command_id == command_id)
            .ok_or_else(|| format!("Command '{}' not found", command_id))?;
        binding.keys = Vec::new();
        Ok(())
    })?;
    save_registry(&app, &registry)
}

/// Resets a single shortcut to its default_keys.
#[tauri::command]
pub fn reset_shortcut(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    command_id: String,
) -> Result<(), String> {
    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    with_active_preset(&mut registry, |preset| {
        let binding = preset
            .bindings
            .iter_mut()
            .find(|b| b.command_id == command_id)
            .ok_or_else(|| format!("Command '{}' not found", command_id))?;
        binding.keys = binding.default_keys.clone();
        Ok(())
    })?;
    save_registry(&app, &registry)
}

/// Resets all shortcuts to defaults.
#[tauri::command]
pub fn reset_all_shortcuts(
    app: AppHandle,
    state: State<'_, ShortcutState>,
) -> Result<(), String> {
    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    with_active_preset(&mut registry, |preset| {
        for binding in &mut preset.bindings {
            binding.keys = binding.default_keys.clone();
        }
        Ok(())
    })?;
    save_registry(&app, &registry)
}

/// Checks if the given key combo conflicts with any existing binding.
/// exclude_command: don't flag conflict with this command (it's the one being edited).
#[tauri::command]
pub fn check_conflict(
    state: State<'_, ShortcutState>,
    keys: Vec<String>,
    exclude_command: Option<String>,
) -> Option<ShortcutBinding> {
    if keys.is_empty() {
        return None;
    }
    let registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    let active_id = &registry.active_preset_id;
    let preset = registry.presets.iter().find(|p| p.id == *active_id)?;

    preset.bindings.iter().find(|b| {
        if b.keys.is_empty() {
            return false;
        }
        if let Some(ref exclude) = exclude_command {
            if b.command_id == *exclude {
                return false;
            }
        }
        b.keys == keys
    }).cloned()
}

/// List all presets (without full bindings -- just id, name, is_builtin).
#[tauri::command]
pub fn get_presets(state: State<'_, ShortcutState>) -> Vec<PresetInfo> {
    let registry = state.0.lock().unwrap_or_else(|e| e.into_inner());
    registry
        .presets
        .iter()
        .map(|p| PresetInfo {
            id: p.id.clone(),
            name: p.name.clone(),
            is_builtin: p.is_builtin,
        })
        .collect()
}

/// Save current bindings as a new named preset, returns preset id.
#[tauri::command]
pub fn save_preset(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    name: String,
) -> Result<String, String> {
    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());

    // Clone bindings from active preset
    let active_id = registry.active_preset_id.clone();
    let bindings = registry
        .presets
        .iter()
        .find(|p| p.id == active_id)
        .map(|p| p.bindings.clone())
        .ok_or("Active preset not found")?;

    let id = format!(
        "custom_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    registry.presets.push(ShortcutPreset {
        id: id.clone(),
        name,
        is_builtin: false,
        bindings,
    });

    registry.active_preset_id = id.clone();
    save_registry(&app, &registry)?;
    Ok(id)
}

/// Switch to a different preset.
#[tauri::command]
pub fn load_preset(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    preset_id: String,
) -> Result<Vec<ShortcutBinding>, String> {
    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());

    let bindings = registry
        .presets
        .iter()
        .find(|p| p.id == preset_id)
        .map(|p| p.bindings.clone())
        .ok_or_else(|| format!("Preset '{}' not found", preset_id))?;

    registry.active_preset_id = preset_id;
    save_registry(&app, &registry)?;
    Ok(bindings)
}

/// Delete a custom preset (can't delete builtin).
#[tauri::command]
pub fn delete_preset(
    app: AppHandle,
    state: State<'_, ShortcutState>,
    preset_id: String,
) -> Result<(), String> {
    let mut registry = state.0.lock().unwrap_or_else(|e| e.into_inner());

    // Check if builtin
    let is_builtin = registry
        .presets
        .iter()
        .find(|p| p.id == preset_id)
        .map(|p| p.is_builtin)
        .ok_or_else(|| format!("Preset '{}' not found", preset_id))?;

    if is_builtin {
        return Err("Cannot delete a built-in preset".into());
    }

    registry.presets.retain(|p| p.id != preset_id);

    // If we just deleted the active preset, fall back to default
    if registry.active_preset_id == preset_id {
        registry.active_preset_id = "default".into();
    }

    save_registry(&app, &registry)
}
