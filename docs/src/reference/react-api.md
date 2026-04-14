# Frontend API Reference

The frontend uses vanilla JavaScript modules. No framework is required.

## IPC Facade (`src/lib/ipc.js`)

Every backend command is wrapped here so frontend code never calls `invoke()` directly.

```javascript
import { ipc, events } from './lib/ipc.js';
```

### `ipc` -- Command Wrappers

| Method | Backend Command | Description |
|--------|----------------|-------------|
| `ipc.getSetting(key)` | `get_setting` | Read a single setting |
| `ipc.setSetting(key, value)` | `set_setting` | Write a single setting |
| `ipc.getAllSettings()` | `get_all_settings` | Read all settings |
| `ipc.resetSettings()` | `reset_settings` | Reset all to defaults |
| `ipc.getRecentFiles()` | `get_recent_files` | List recent file paths |
| `ipc.addRecentFile(path)` | `add_recent_file` | Add a file to recents |
| `ipc.clearRecentFiles()` | `clear_recent_files` | Clear recent files |
| `ipc.startAutosave(intervalSecs?)` | `start_autosave` | Start autosave loop |
| `ipc.stopAutosave()` | `stop_autosave` | Stop autosave loop |
| `ipc.updateAutosaveState(data)` | `update_autosave_state` | Set pending autosave data |
| `ipc.checkRecovery()` | `check_recovery` | Check for crash recovery file |
| `ipc.showOpenDialog(opts?)` | `show_open_dialog` | Native open dialog |
| `ipc.showSaveDialog(opts?)` | `show_save_dialog` | Native save dialog |
| `ipc.getAppInfo()` | `get_app_info` | App name, version, dirs |
| `ipc.openExternalUrl(url)` | `open_external_url` | Open URL in browser |
| `ipc.openDocs()` | `open_docs` | Open bundled docs |
| `ipc.openWindow(name)` | `open_window` | Open a utility window |
| `ipc.setHasUnsavedChanges(dirty)` | `set_has_unsaved_changes` | Set dirty state |
| `ipc.confirmClose()` | `confirm_close` | Force-close after confirmation |
| `ipc.menuSetEnabled(id, enabled)` | `menu_set_enabled` | Enable/disable menu item |
| `ipc.menuSetChecked(id, checked)` | `menu_set_checked` | Set check state |
| `ipc.menuSetLabel(id, label)` | `menu_set_label` | Update menu label |
| `ipc.hasRecentCrash()` | `has_recent_crash` | Check for recent crash |
| `ipc.listCrashReports()` | `list_crash_reports` | List all crash reports |
| `ipc.getCrashReport(name)` | `get_crash_report` | Read crash report content |
| `ipc.clearCrashReports()` | `clear_crash_reports` | Delete all crash reports |
| `ipc.logFrontendError(msg, stack?, componentStack?)` | `log_frontend_error` | Log frontend error |
| `ipc.collectDiagnostics()` | `collect_diagnostics` | Get structured diagnostics |
| `ipc.collectDiagnosticsString()` | `collect_diagnostics_string` | Get diagnostics as text |
| `ipc.sendNotification(title, body, icon?)` | `send_notification` | Send OS notification |
| `ipc.getLogContents()` | `get_log_contents` | Read app log file |
| `ipc.checkForUpdates()` | `check_for_updates` | Check for updates |
| `ipc.installUpdate()` | `install_update` | Install and restart |
| `ipc.getShortcuts()` | `get_shortcuts` | Get all shortcut bindings |
| `ipc.setShortcut(commandId, keys)` | `set_shortcut` | Update a shortcut |
| `ipc.removeShortcut(commandId)` | `remove_shortcut` | Clear a shortcut |
| `ipc.resetShortcut(commandId)` | `reset_shortcut` | Reset one to default |
| `ipc.resetAllShortcuts()` | `reset_all_shortcuts` | Reset all to defaults |
| `ipc.checkConflict(keys, excludeCommand?)` | `check_conflict` | Check for key conflicts |
| `ipc.getPresets()` | `get_presets` | List shortcut presets |
| `ipc.savePreset(name)` | `save_preset` | Save current as preset |
| `ipc.loadPreset(presetId)` | `load_preset` | Switch to a preset |
| `ipc.deletePreset(presetId)` | `delete_preset` | Delete a custom preset |

### `events` -- Event Listeners

| Listener | Event | Payload |
|----------|-------|---------|
| `events.onMenuEvent(name, handler)` | any menu event | `void` |
| `events.onAutosaveSaved(handler)` | `autosave:saved` | `void` |
| `events.onRecoveryAvailable(handler)` | `autosave:recovery-available` | `RecoveryInfo` |
| `events.onCloseRequested(handler)` | `window:close-requested` | `void` |

---

## Window Utilities (`src/lib/window-utils.js`)

Shared utilities for utility windows. Each utility window imports from here.

| Export | Description |
|--------|-------------|
| `closeWindow()` | Close the current window |
| `setupCloseButton(elementId)` | Wire a button to close the window |
| `setupCloseOnFocusLoss()` | Close window on focus loss |
| `applyBranding(options?)` | Apply branding (name, logo, accent, version) |
| `showButtonFeedback(id, text, ms?)` | Temporarily change button text |
| `setupExternalLink(id, url)` | Wire element to open external URL |
| `setChecked(id, val)` | Set checkbox checked state |
| `getChecked(id)` | Get checkbox checked state |
| `setValue(id, val)` | Set input value |
| `getValue(id)` | Get input value |
| `invoke` | Re-export from `@tauri-apps/api/core` |
| `listen` | Re-export from `@tauri-apps/api/event` |
| `branding` | Re-export from `branding.js` |

---

## Branding (`src/lib/branding.js`)

Single-source branding configuration read by all brand-aware windows.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | App display name |
| `tagline` | `string` | Short tagline for splash screen |
| `logo` | `string` | Path to logo image (relative to `public/`), empty for first-letter fallback |
| `splashBackground` | `string` | Path to splash background image (optional) |
| `accentColor` | `string` | Primary brand color (hex) |
| `copyright` | `string` | Copyright line |
| `website` | `string` | URL for about dialog (empty to hide) |
| `github` | `string` | GitHub URL for about dialog and issue reporting (empty to hide) |
| `licenseInfo` | `string` | License text for about dialog (empty to hide) |

---

## Main Entry Point (`src/main.js`)

Sets up the main window with:
- Branding accent color applied to CSS
- Menu event listeners (file:new, file:open, file:save, file:save-as, edit:find, edit:find-replace)
- Close confirmation flow (listens for `window:close-requested`, shows native dialog)
- First-run check (opens welcome window if `first_run` setting is `true`)
- Recovery check (listens for `autosave:recovery-available`)
- Report Issue handler (copies diagnostics to clipboard and opens GitHub issues page)
