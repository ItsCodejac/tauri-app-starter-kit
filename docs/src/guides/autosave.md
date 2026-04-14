# Autosave & Crash Recovery

A background timer periodically saves application state to a recovery file. If the app crashes, the state is available on next launch. Defined in `src-tauri/src/autosave.rs`.

## How It Works

1. Frontend sends serialized state via `update_autosave_state`
2. A background thread wakes every N seconds
3. If pending state exists, it writes `recovery.json` atomically (write to `.tmp`, then rename)
4. On normal exit, `cleanup_recovery` deletes the file
5. On next launch, if the file still exists, a crash happened

## Starting Autosave

Call `start_autosave` once at app startup:

```javascript
import { ipc } from './lib/ipc.js';

// Start with default 60s interval
await ipc.startAutosave();

// Or with a custom interval
await ipc.startAutosave(30);
```

Calling `start_autosave` when already running is a no-op.

## Sending State from the Frontend

Push your serializable app state whenever it changes meaningfully:

```javascript
const appState = {
  openFile: '/path/to/project.json',
  unsavedChanges: { /* ... */ },
};

await ipc.updateAutosaveState(JSON.stringify(appState));
```

This only updates the pending buffer. The actual disk write happens on the next timer tick.

## Recovery Flow on Startup

The app automatically checks for recovery data on launch. About 1 second after startup, if a recovery file exists, Rust emits the `autosave:recovery-available` event. Listen for it in your frontend:

```javascript
import { events } from './lib/ipc.js';

events.onRecoveryAvailable((info) => {
  // info.has_recovery, info.timestamp, info.data
  if (confirm('Recover unsaved work?')) {
    restoreState(info.data);
  }
});
```

You can also check manually:

```javascript
const recovery = await ipc.checkRecovery();
if (recovery.has_recovery) {
  // Show recovery UI
}
```

The recovery file contains:

```json
{
  "timestamp": "1713024000",
  "data": { "your": "state" }
}
```

## Listening for Save Events

The backend emits `autosave:saved` after each successful write:

```javascript
events.onAutosaveSaved(() => {
  // Update UI indicator, etc.
});
```

## Stopping Autosave

```javascript
await ipc.stopAutosave();
```

Sets a flag that causes the background thread to exit on its next wake.

## Cleanup on Normal Exit

`cleanup_recovery` is called automatically by the Rust backend when the main window is destroyed (the `Destroyed` event handler in `lib.rs`). It deletes `recovery.json` so no false recovery prompt appears on next launch.

## Configuring the Interval

The interval comes from two places:

- **`start_autosave` argument** -- the `intervalSecs` parameter (default 60)
- **Settings** -- `autosave_interval_secs` setting for persisting the user's preference

Read the setting, then pass it when starting:

```javascript
const interval = await ipc.getSetting('autosave_interval_secs');
await ipc.startAutosave(interval);
```

## What to Store in Autosave State

Good candidates:
- Currently open file path
- Unsaved edits / dirty state
- UI state the user would lose (selections, scroll positions)

Avoid:
- Large binary data (images, video frames)
- Cached/derived data that can be recomputed
- Sensitive data (credentials, tokens)

## File Location

`recovery.json` lives in the app data directory alongside `settings.json`.
