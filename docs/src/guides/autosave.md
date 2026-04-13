# Autosave & Crash Recovery

A background timer periodically saves application state to a recovery file. If the app crashes, the state is available on next launch.

## How It Works

1. Frontend sends serialized state via `update_autosave_state`
2. A background thread wakes every N seconds
3. If pending state exists, it writes `recovery.json` atomically (write to `.tmp`, then rename)
4. On normal exit, `cleanup_recovery` deletes the file
5. On next launch, if the file still exists, a crash happened

## Starting Autosave

Call `start_autosave` once at app startup. Typically done in your root component:

```ts
import { invoke } from '@tauri-apps/api/core';

// Start with default 60s interval
await invoke('start_autosave', {});

// Or with a custom interval
await invoke('start_autosave', { intervalSecs: 30 });
```

Calling `start_autosave` when already running is a no-op.

## Sending State from Frontend

Push your serializable app state whenever it changes meaningfully:

```ts
const appState = {
  openFile: '/path/to/project.json',
  unsavedChanges: { /* ... */ },
};

await invoke('update_autosave_state', {
  data: JSON.stringify(appState),
});
```

This only updates the pending buffer. The actual disk write happens on the next timer tick.

## Recovery Flow on Startup

Check for recovery data before initializing your app:

```ts
import { invoke } from '@tauri-apps/api/core';

interface RecoveryInfo {
  has_recovery: boolean;
  timestamp: string | null;
  data: unknown | null;
}

const recovery = await invoke<RecoveryInfo>('check_recovery');

if (recovery.has_recovery) {
  // Show a dialog: "Recover unsaved work from <timestamp>?"
  if (userAccepted) {
    restoreState(recovery.data);
  }
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

```ts
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('autosave:saved', () => {
  // Update UI indicator, etc.
});
```

## Stopping Autosave

```ts
await invoke('stop_autosave');
```

Sets a flag that causes the background thread to exit on its next wake.

## Cleanup on Normal Exit

`cleanup_recovery` is called automatically by the Rust backend on graceful shutdown. It deletes `recovery.json` so no false recovery prompt appears on next launch.

## Configuring the Interval

The interval comes from two places:

- **`start_autosave` argument** -- the `intervalSecs` parameter (default 60)
- **Settings** -- `autosave_interval_secs` in `AppSettings` for persisting the user's preference

Read the setting, then pass it when starting:

```ts
const interval = await invoke<number>('get_setting', { key: 'autosave_interval_secs' });
await invoke('start_autosave', { intervalSecs: interval });
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
