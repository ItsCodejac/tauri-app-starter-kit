# Events Reference

All Tauri events emitted between Rust and the React frontend. Listen in React with:

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('event:name', (event) => {
  console.log(event.payload);
});
```

## Menu Events

Menu item IDs are auto-converted to event names: `category_action` becomes `menu:category:action`.

Items listed under "Native handlers" are handled in Rust and **not** forwarded to the frontend.

### Forwarded to Frontend (Rust -> React)

| Event Name | Payload | Menu Item ID | Description |
|------------|---------|-------------|-------------|
| `menu:file:new` | `void` | `file_new` | File > New |
| `menu:file:open` | `void` | `file_open` | File > Open... |
| `menu:file:save` | `void` | `file_save` | File > Save |
| `menu:file:save-as` | `void` | `file_save_as` | File > Save As... |
| `menu:recent:clear` | `void` | `recent_clear` | File > Open Recent > Clear Recent |
| `menu:view:zoom-in` | `void` | `view_zoom_in` | View > Zoom In |
| `menu:view:zoom-out` | `void` | `view_zoom_out` | View > Zoom Out |
| `menu:view:actual-size` | `void` | `view_actual_size` | View > Actual Size |
| `menu:view:status-bar` | `void` | `view_status_bar` | View > Show Status Bar (check toggle) |
| `menu:app:preferences` | `void` | `app_preferences` | App menu > Settings... (macOS) / File > Settings... (Win/Linux) |
| `menu:edit:find` | `void` | `edit_find` | Edit > Find... |
| `menu:edit:find-replace` | `void` | `edit_find-replace` | Edit > Find and Replace... |
| `menu:help:report-issue` | `void` | `help_report_issue` | Help > Report Issue |

### Handled Natively in Rust (not forwarded)

| Menu Item ID | Action |
|-------------|--------|
| `file_close` | Closes the main window |
| `help_docs` | Opens the documentation site in the default browser |
| `view_devtools` | Toggles the developer tools panel (debug builds only) |
| `view_fullscreen` | Toggles fullscreen on the main window |
| `window_zoom` | Toggles maximize/restore on the main window |
| `window_bring_all` | Unminimizes, shows, and focuses the main window |

### ID-to-Event Conversion Rule

The conversion from menu item ID to event name follows this pattern:

```
{category}_{action}       -> menu:{category}:{action}
{category}_{action_part}  -> menu:{category}:{action-part}
```

Underscores after the first are converted to hyphens. Examples:

- `file_new` -> `menu:file:new`
- `file_save_as` -> `menu:file:save-as`
- `help_report_issue` -> `menu:help:report-issue`

### Custom Menu Events

When you add custom menus in `menu.rs` via `custom_menus()`, they follow the same conversion:

```rust
MenuDef::Item { id: "clip_split", label: "Split", accel: Some("CmdOrCtrl+B") }
// Emits: "menu:clip:split"
```

Listen in React:

```typescript
listen('menu:clip:split', () => { /* handle split */ });
```

## Quit Confirmation Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `window:close-requested` | Rust -> React | `void` | Emitted when the user tries to close the window while `set_has_unsaved_changes(true)` is active. The frontend should show a confirmation dialog and call `confirm_close` if the user chooses to discard. |

### Quit Confirmation Flow

1. Frontend calls `set_has_unsaved_changes(true)` whenever there are unsaved changes.
2. User clicks the window close button.
3. Rust intercepts `CloseRequested` and emits `window:close-requested` instead of closing.
4. Frontend shows a "discard changes?" dialog.
5. If confirmed, frontend calls `confirm_close` which resets dirty state and closes the window.
6. If cancelled, the window stays open.

Listen via the typed facade:

```typescript
import { events } from '../lib/ipc';
events.onCloseRequested(() => showUnsavedChangesDialog());
```

## Single Instance Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `single-instance:open-files` | Rust -> React | `string[]` | Emitted when a second app instance is launched with file path arguments. The existing instance receives the file paths so it can open them. |

The single-instance plugin (`tauri-plugin-single-instance`) ensures only one app instance runs. When a second instance is launched, the existing window is focused and unminimized. If the second instance was launched with file arguments (e.g. double-clicking a file), those paths are forwarded via this event.

```typescript
import { listen } from '@tauri-apps/api/event';
await listen<string[]>('single-instance:open-files', (event) => {
  openFiles(event.payload);
});
```

## Autosave Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `autosave:saved` | Rust -> React | `void` | Emitted after each successful autosave write. |
| `autosave:recovery-available` | Rust -> React | `RecoveryInfo` | Emitted ~1s after app launch if a recovery file exists from a previous session. |

### RecoveryInfo Payload

```typescript
interface RecoveryInfo {
  has_recovery: boolean;
  timestamp: string | null;
  data: any | null;
}
```

### Autosave Lifecycle

1. Frontend calls `start_autosave` with an optional interval.
2. Frontend periodically calls `update_autosave_state` with serialized state.
3. On each tick, Rust writes `recovery.json` atomically (write to `.tmp`, rename).
4. On success, Rust emits `autosave:saved`.
5. On normal window close, Rust stops autosave and deletes `recovery.json`.
6. On next launch, if `recovery.json` exists (crash recovery), Rust emits `autosave:recovery-available`.
