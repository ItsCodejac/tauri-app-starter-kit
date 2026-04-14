# Rust API Reference

All IPC commands registered in `src-tauri/src/lib.rs`. Call from the frontend with `invoke('command_name', { args })` or use the `ipc` facade in `src/lib/ipc.js`.

## Settings (`settings.rs`)

Persisted to `settings.json` via `tauri-plugin-store`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_setting` | `key: string` | `Value` | Get a single setting by key. Errors if key not found. |
| `set_setting` | `key: string, value: any` | `void` | Set a single setting and persist to disk. |
| `get_all_settings` | none | `object` | Get all settings with defaults for missing keys. |
| `reset_settings` | none | `void` | Reset all settings to defaults. |

### Default Settings

| Key | Type | Default |
|-----|------|---------|
| `theme` | `string` | `"dark"` |
| `locale` | `string` | `"en"` |
| `autostart` | `boolean` | `false` |
| `first_run` | `boolean` | `true` |
| `updates.checkOnStartup` | `boolean` | `true` |
| `updates.lastCheck` | `number` | `0` |
| `app.lastSeenVersion` | `string` | `""` |
| `view_zoom_level` | `number` | `100` |
| `show_statusbar` | `boolean` | `true` |
| `show_tooltips` | `boolean` | `true` |
| `autosave_enabled` | `boolean` | `true` |
| `autosave_interval_secs` | `number` | `60` |
| `performance.mode` | `string` | `"balanced"` |
| `performance.hardwareAcceleration` | `boolean` | `true` |
| `performance.gpuEnabled` | `boolean` | `true` |
| `cache.maxCacheSize` | `number` | `10` |
| `cache.cleanupOldCache` | `boolean` | `true` |
| `startup_behavior` | `string` | `"empty"` |
| `tray.minimize_to_tray` | `boolean` | `false` |
| `tray.show_icon` | `boolean` | `true` |
| `recent_files` | `string[]` | `[]` |

## Autosave (`autosave.rs`)

Background autosave loop with atomic recovery file writes to `{app_data_dir}/recovery.json`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `start_autosave` | `interval_secs?: number` | `void` | Start the autosave background loop. No-op if already running. Default interval: 60s. |
| `stop_autosave` | none | `void` | Stop the autosave background loop. |
| `update_autosave_state` | `data: string` | `void` | Set the pending state data (JSON string) to be written on next autosave tick. |
| `check_recovery` | none | `RecoveryInfo` | Check if a recovery file exists from a previous session. |

### RecoveryInfo

```javascript
{
  has_recovery: boolean,
  timestamp: string | null,   // Unix timestamp as string
  data: any | null,           // The recovered state data
}
```

## Recent Files (`recent_files.rs`)

Stored in the `recent_files` key of `settings.json`. Maximum 10 entries.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_recent_files` | none | `string[]` | Get recent files list, filtering out paths that no longer exist on disk. |
| `add_recent_file` | `path: string` | `string[]` | Add a file to the front of the recent list. Returns the updated list. Deduplicates and truncates to 10. |
| `clear_recent_files` | none | `void` | Clear the entire recent files list. |

## Dialogs (`commands.rs`)

Native file dialogs via `tauri-plugin-dialog`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `show_open_dialog` | `title?, filters?, multiple?` | `string[] | null` | Show native open-file dialog. Returns selected paths or `null` if cancelled. |
| `show_save_dialog` | `title?, default_name?, filters?` | `string | null` | Show native save-file dialog. Returns selected path or `null` if cancelled. |

### DialogFilter

```javascript
{ name: "Images", extensions: ["png", "jpg", "gif"] }
```

## App Info (`commands.rs`)

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_app_info` | none | `AppInfo` | Get application name, version, and directory paths. |
| `open_external_url` | `url: string` | `void` | Open a URL in the default system browser via `tauri-plugin-opener`. |
| `open_docs` | none | `void` | Open the bundled mdBook documentation in the default browser. |
| `get_log_contents` | none | `string` | Read the application log file contents (last ~500KB). Returns empty string if no log file exists. |

### AppInfo

```javascript
{
  name: string,           // from tauri.conf.json productName
  version: string,        // from tauri.conf.json version
  app_data_dir: string,   // platform-specific app data directory
  app_config_dir: string, // platform-specific app config directory
  app_cache_dir: string,  // platform-specific app cache directory
}
```

## Quit Confirmation (`lib.rs`)

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `set_has_unsaved_changes` | `dirty: boolean` | `void` | Tell the backend whether the frontend has unsaved changes. When `true`, closing the window is intercepted. |
| `confirm_close` | none | `void` | Force-close the window after the user confirms they want to discard changes. Resets dirty state and closes the main window. |

## Dynamic Menu State (`menu.rs`)

Modify native menu items at runtime. Items are looked up recursively by their string ID.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `menu_set_enabled` | `id: string, enabled: boolean` | `void` | Enable or disable a menu item. |
| `menu_set_checked` | `id: string, checked: boolean` | `void` | Set the checked state of a `Check` menu item. |
| `menu_set_label` | `id: string, label: string` | `void` | Update the displayed label of a menu item. |

## Window Management (`windows.rs`)

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `open_window` | `name: string` | `void` | Open a utility window by name. If it already exists, focus it. Valid names: `splash`, `settings`, `about`, `shortcuts`, `logs`, `update`, `whatsnew`, `welcome`. |

## Crash Reporting (`crash_reporter.rs`)

Crash reports are written to `{app_data_dir}/crash-reports/` as `.log` files.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `has_recent_crash` | none | `CrashReport | null` | Returns the most recent crash report if it occurred within the last 5 minutes. |
| `list_crash_reports` | none | `CrashReport[]` | List all crash report files, sorted most-recent-first. |
| `get_crash_report` | `name: string` | `string` | Read the full text content of a crash report by filename. Directory traversal is blocked. |
| `clear_crash_reports` | none | `void` | Delete the entire crash-reports directory. |
| `log_frontend_error` | `message: string, stack?: string, component_stack?: string` | `void` | Write a frontend error report to the crash-reports directory. |

### CrashReport

```javascript
{
  name: string,        // filename, e.g. "crash-2025-01-15T10-30-00Z.log"
  timestamp: string,   // ISO 8601 UTC, e.g. "2025-01-15T10:30:00Z"
  size_bytes: number,  // file size in bytes
}
```

## Diagnostics (`diagnostics.rs`)

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `collect_diagnostics` | none | `DiagnosticsReport` | Collect a structured diagnostics report. |
| `collect_diagnostics_string` | none | `string` | Collect diagnostics as pre-formatted plain text for bug reports. |

### DiagnosticsReport

```javascript
{
  app_name: string,
  app_version: string,
  os_name: string,
  os_version: string,
  os_arch: string,
  rust_version: string,
  tauri_version: string,
  settings: object,               // sanitized subset
  recent_crash_reports: array,    // [{name, timestamp}]
  memory_usage_bytes: number | null,
  uptime_secs: number,
}
```

## Notifications (`notifications.rs`)

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `send_notification` | `title: string, body: string, icon?: string` | `void` | Send a native OS notification. The `icon` parameter is reserved for future use. |

## Updater (`updater.rs`)

Commands return errors if the updater plugin is not enabled.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `check_for_updates` | none | `UpdateInfo | null` | Check for available updates. Returns `null` if up-to-date. |
| `install_update` | none | `void` | Download and install the update, then restart the app. |

### UpdateInfo

```javascript
{
  version: string,
  body: string | null,    // release notes
  date: string | null,
}
```

## Shortcuts (`shortcuts.rs`)

Keyboard shortcut registry with preset support. Stored in `shortcuts.json`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_shortcuts` | none | `ShortcutBinding[]` | Get all bindings from the active preset. |
| `set_shortcut` | `command_id: string, keys: string[]` | `void` | Update a shortcut binding and save to disk. |
| `remove_shortcut` | `command_id: string` | `void` | Clear the keys for a command (sets to empty). |
| `reset_shortcut` | `command_id: string` | `void` | Reset a single shortcut to its default keys. |
| `reset_all_shortcuts` | none | `void` | Reset all shortcuts to defaults. |
| `check_conflict` | `keys: string[], exclude_command?: string` | `ShortcutBinding | null` | Check if a key combo conflicts with an existing binding. |
| `get_presets` | none | `PresetInfo[]` | List all presets (id, name, is_builtin). |
| `save_preset` | `name: string` | `string` | Save current bindings as a new preset. Returns the preset ID. |
| `load_preset` | `preset_id: string` | `ShortcutBinding[]` | Switch to a different preset. Returns the new bindings. |
| `delete_preset` | `preset_id: string` | `void` | Delete a custom preset. Cannot delete built-in presets. |

### ShortcutBinding

```javascript
{
  command_id: string,       // e.g. "file.new"
  label: string,            // e.g. "New"
  category: string,         // e.g. "File"
  keys: string[],           // e.g. ["CmdOrCtrl", "N"]
  default_keys: string[],   // original defaults for reset
}
```

### PresetInfo

```javascript
{
  id: string,
  name: string,
  is_builtin: boolean,
}
```
