# Rust API Reference

All IPC commands registered in `src-tauri/src/lib.rs`. Call from the frontend with `invoke('command_name', { args })`.

## Settings

Persisted to `settings.json` via `tauri-plugin-store`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_setting` | `key: string` | `serde_json::Value` | Get a single setting by key. Errors if key not found. |
| `set_setting` | `key: string, value: any` | `void` | Set a single setting and persist to disk. |
| `get_all_settings` | none | `{ theme, recent_files, autosave_enabled, autosave_interval_secs }` | Get all settings with defaults for missing keys. |
| `reset_settings` | none | `void` | Reset all settings to defaults. |

Default settings values:

| Key | Type | Default |
|-----|------|---------|
| `theme` | `string` | `"dark"` |
| `recent_files` | `string[]` | `[]` |
| `autosave_enabled` | `boolean` | `true` |
| `autosave_interval_secs` | `number` | `60` |

## Autosave

Background autosave loop with atomic recovery file writes to `{app_data_dir}/recovery.json`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `start_autosave` | `interval_secs?: number` | `void` | Start the autosave background loop. No-op if already running. Default interval: 60s. |
| `stop_autosave` | none | `void` | Stop the autosave background loop. |
| `update_autosave_state` | `data: string` | `void` | Set the pending state data (JSON string) to be written on next autosave tick. |
| `check_recovery` | none | `RecoveryInfo` | Check if a recovery file exists from a previous session. |

### RecoveryInfo

```typescript
interface RecoveryInfo {
  has_recovery: boolean;
  timestamp: string | null;   // Unix timestamp as string
  data: any | null;           // The recovered state data
}
```

## Recent Files

Stored in the `recent_files` key of `settings.json`. Maximum 10 entries.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_recent_files` | none | `string[]` | Get recent files list, filtering out paths that no longer exist on disk. |
| `add_recent_file` | `path: string` | `string[]` | Add a file to the front of the recent list. Returns the updated list. Deduplicates and truncates to 10. |
| `clear_recent_files` | none | `void` | Clear the entire recent files list. |

## Dialogs

Native file dialogs via `tauri-plugin-dialog`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `show_open_dialog` | `title?: string, filters?: DialogFilter[], multiple?: boolean` | `string[] \| null` | Show native open-file dialog. Returns selected paths or `null` if cancelled. |
| `show_save_dialog` | `title?: string, default_name?: string, filters?: DialogFilter[]` | `string \| null` | Show native save-file dialog. Returns selected path or `null` if cancelled. |

### DialogFilter

```typescript
interface DialogFilter {
  name: string;         // e.g. "Images"
  extensions: string[]; // e.g. ["png", "jpg", "gif"]
}
```

## App Info

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_app_info` | none | `AppInfo` | Get application name, version, and directory paths. |
| `open_external_url` | `url: string` | `void` | Open a URL in the default system browser via `tauri-plugin-opener`. |
| `open_docs` | none | `void` | Open the documentation site in the default browser. |

### AppInfo

```typescript
interface AppInfo {
  name: string;           // from tauri.conf.json productName
  version: string;        // from tauri.conf.json version
  app_data_dir: string;   // platform-specific app data directory
  app_config_dir: string; // platform-specific app config directory
  app_cache_dir: string;  // platform-specific app cache directory
}
```

## Quit Confirmation

Prevents the window from closing when there are unsaved changes. The backend intercepts `CloseRequested`, emits `window:close-requested` to the frontend, and the frontend shows a confirmation dialog. If the user confirms, it calls `confirm_close` to force-close.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `set_has_unsaved_changes` | `dirty: boolean` | `void` | Tell the backend whether the frontend has unsaved changes. When `true`, closing the window is intercepted. |
| `confirm_close` | none | `void` | Force-close the window after the user confirms they want to discard changes. Resets dirty state and closes the main window. |

## Dynamic Menu State

Modify native menu items at runtime. Items are looked up recursively by their string ID (e.g. `"file_save"`, `"view_status_bar"`).

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `menu_set_enabled` | `id: string, enabled: boolean` | `void` | Enable or disable a menu item (works on `Item`, `Check`, and `Submenu` kinds). |
| `menu_set_checked` | `id: string, checked: boolean` | `void` | Set the checked state of a `Check` menu item. Errors if the item is not a checkbox. |
| `menu_set_label` | `id: string, label: string` | `void` | Update the displayed label of a menu item at runtime. |

## Crash Reporting

Crash reports are written to `{app_data_dir}/crash-reports/` as `.log` files. Native panics are captured automatically via a custom panic hook. Frontend errors can be logged via `log_frontend_error`.

| Command | Arguments | Return Type | Description |
|---------|-----------|-------------|-------------|
| `has_recent_crash` | none | `CrashReport \| null` | Returns the most recent crash report if it occurred within the last 5 minutes, otherwise `null`. |
| `list_crash_reports` | none | `CrashReport[]` | List all crash report files, sorted most-recent-first. |
| `get_crash_report` | `name: string` | `string` | Read the full text content of a crash report by filename. Directory traversal is blocked. |
| `clear_crash_reports` | none | `void` | Delete the entire crash-reports directory. |
| `log_frontend_error` | `message: string, stack?: string, component_stack?: string` | `void` | Write a frontend error report to the crash-reports directory. Used by the `ErrorBoundary` and global error handlers. |

### CrashReport

```typescript
interface CrashReport {
  name: string;        // filename, e.g. "crash-2025-01-15T10-30-00Z.log"
  timestamp: string;   // ISO 8601 UTC, e.g. "2025-01-15T10:30:00Z"
  size_bytes: number;  // file size in bytes
}
```
