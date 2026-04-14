# Events Reference

All Tauri events emitted between Rust and the frontend. Listen with:

```javascript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('event:name', (event) => {
  console.log(event.payload);
});
```

Or use the typed `events` facade:

```javascript
import { events } from './lib/ipc.js';

events.onAutosaveSaved(() => console.log('Saved'));
```

## Menu Events

Menu item IDs are auto-converted to event names: `category_action` becomes `menu:category:action`.

Items listed under "Native handlers" are handled in Rust and **not** forwarded to the frontend.

### Forwarded to Frontend

| Event Name | Menu Item ID | Description |
|------------|-------------|-------------|
| `menu:file:new` | `file_new` | File > New |
| `menu:file:open` | `file_open` | File > Open... |
| `menu:file:save` | `file_save` | File > Save |
| `menu:file:save-as` | `file_save_as` | File > Save As... |
| `menu:recent:clear` | `recent_clear` | File > Open Recent > Clear Recent |
| `menu:edit:find` | `edit_find` | Edit > Find... |
| `menu:edit:find-replace` | `edit_find-replace` | Edit > Find and Replace... |
| `menu:view:status-bar` | `view_status_bar` | View > Show Status Bar (check toggle) |
| `menu:help:report-issue` | `help_report_issue` | Help > Report Issue |

### Handled Natively in Rust (not forwarded)

| Menu Item ID | Action |
|-------------|--------|
| `app_about` | Opens the About window |
| `app_preferences` / `window_settings` | Opens the Settings window |
| `help_shortcuts` | Opens the Keyboard Shortcuts window |
| `help_view-logs` | Opens the Log Viewer window |
| `help_check-for-updates` | Opens the Update window |
| `help_whats-new` | Opens the What's New window |
| `help_docs` | Opens bundled docs in the default browser |
| `file_close` | Closes the main window |
| `view_devtools` | Toggles developer tools (debug builds only) |
| `view_fullscreen` | Toggles fullscreen on the main window |
| `view_zoom_in` | Zooms in by 10% (persists to settings) |
| `view_zoom_out` | Zooms out by 10% (persists to settings) |
| `view_actual_size` | Resets zoom to 100% (persists to settings) |
| `window_zoom` | Toggles maximize/restore |
| `window_stay-on-top` | Toggles always-on-top and updates the check menu item |
| `window_bring_all` | Unminimizes, shows, and focuses the main window |

### ID-to-Event Conversion Rule

```
{category}_{action}       -> menu:{category}:{action}
{category}_{action_part}  -> menu:{category}:{action-part}
```

Underscores after the first are converted to hyphens. Examples:

- `file_new` -> `menu:file:new`
- `file_save_as` -> `menu:file:save-as`
- `help_report_issue` -> `menu:help:report-issue`

### Custom Menu Events

When you add custom menus via `custom_menus()`, they follow the same conversion:

```rust
MenuDef::Item { id: "clip_split", label: "Split", accel: Some("CmdOrCtrl+B") }
// Emits: "menu:clip:split"
```

```javascript
import { events } from './lib/ipc.js';
events.onMenuEvent('menu:clip:split', () => { /* handle split */ });
```

## Quit Confirmation Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `window:close-requested` | Rust -> Frontend | `void` | Emitted when the user tries to close the window while `set_has_unsaved_changes(true)` is active. |

### Quit Confirmation Flow

1. Frontend calls `ipc.setHasUnsavedChanges(true)` whenever there are unsaved changes.
2. User clicks the window close button.
3. Rust intercepts `CloseRequested` and emits `window:close-requested` instead of closing.
4. Frontend shows a confirmation dialog.
5. If confirmed, frontend calls `ipc.confirmClose()` which resets dirty state and closes the window.
6. If cancelled, the window stays open.

Listen via the facade:

```javascript
events.onCloseRequested(() => showUnsavedChangesDialog());
```

## Single Instance Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `single-instance:open-files` | Rust -> Frontend | `string[]` | Emitted when a second app instance is launched with file path arguments. |

The single-instance plugin ensures only one app instance runs. When a second instance is launched, the existing window is focused and unminimized. File arguments are forwarded via this event.

```javascript
import { listen } from '@tauri-apps/api/event';

await listen('single-instance:open-files', (event) => {
  openFiles(event.payload);
});
```

## Splash Screen Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `splash:status` | Rust -> Splash | `string` | Progress message during initialization. |

The splash window listens for this event to display status text ("Initializing settings...", "Checking for crash recovery...", etc.).

## Autosave Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `autosave:saved` | Rust -> Frontend | `void` | Emitted after each successful autosave write. |
| `autosave:recovery-available` | Rust -> Frontend | `RecoveryInfo` | Emitted ~1s after app launch if a recovery file exists. |

### RecoveryInfo Payload

```javascript
{
  has_recovery: boolean,
  timestamp: string | null,
  data: any | null,
}
```

### Autosave Lifecycle

1. Frontend calls `ipc.startAutosave()` with an optional interval.
2. Frontend periodically calls `ipc.updateAutosaveState()` with serialized state.
3. On each tick, Rust writes `recovery.json` atomically (write to `.tmp`, rename).
4. On success, Rust emits `autosave:saved`.
5. On normal window close (Destroyed event), Rust stops autosave and deletes `recovery.json`.
6. On next launch, if `recovery.json` exists (crash recovery), Rust emits `autosave:recovery-available`.
