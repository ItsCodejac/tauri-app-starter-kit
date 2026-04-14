# IPC Commands

Tauri v2 uses a command-based IPC model. The frontend calls `invoke()` to run Rust functions. Rust can also emit events back to the frontend.

## The IPC Facade (`src/lib/ipc.js`)

Every backend command is wrapped in `src/lib/ipc.js` so frontend code never calls `invoke()` directly. This gives a single place to update command names, argument shapes, and return types.

```javascript
import { ipc, events } from './lib/ipc.js';

// Call backend commands
const info = await ipc.getAppInfo();
const theme = await ipc.getSetting('theme');
await ipc.setSetting('theme', 'dark');

// Listen for events
events.onAutosaveSaved(() => console.log('Saved'));
```

## How It Works

1. Define a Rust function with `#[tauri::command]`
2. Register it in `lib.rs` via `tauri::generate_handler![]`
3. Call it from the frontend via the `ipc` facade (or `invoke()` directly)

## Step-by-Step: Creating a New Command

### 1. Write the Rust function

In `src-tauri/src/commands.rs` (or a new module):

```rust
#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}
```

### 2. Register in lib.rs

Add it to the `invoke_handler` in `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // ...existing commands...
    commands::greet,
])
```

### 3. Add to the IPC facade

In `src/lib/ipc.js`, add a wrapper:

```javascript
export const ipc = {
  // ...existing commands...
  greet: (name) => invoke('greet', { name }),
};
```

### 4. Call from your frontend

```javascript
import { ipc } from './lib/ipc.js';

const message = await ipc.greet('World');
console.log(message); // "Hello, World!"
```

## Passing Arguments

### Simple types

Arguments are passed as a JSON object. Parameter names must match.

```rust
#[tauri::command]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

```javascript
const sum = await invoke('add', { a: 5, b: 3 });
```

### Structs with Serde

For complex data, use structs that derive `Serialize` and `Deserialize`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[tauri::command]
pub fn process_filters(filters: Vec<DialogFilter>) -> usize {
    filters.len()
}
```

```javascript
const count = await invoke('process_filters', {
  filters: [
    { name: 'Images', extensions: ['png', 'jpg'] },
    { name: 'Videos', extensions: ['mp4', 'mov'] },
  ],
});
```

### Optional arguments

Use `Option<T>` in Rust. Pass `null` from JS to send `None`.

```rust
#[tauri::command]
pub async fn show_open_dialog(
    app: AppHandle,
    title: Option<String>,
    filters: Option<Vec<DialogFilter>>,
    multiple: Option<bool>,
) -> Result<Option<Vec<String>>, String> { ... }
```

```javascript
// All optional fields as null
const files = await ipc.showOpenDialog({});

// Some fields provided
const files = await ipc.showOpenDialog({
  title: 'Select Image',
  filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
});
```

## Returning Results

Use `Result<T, String>` for commands that can fail. The error string becomes a rejected promise on the frontend.

```rust
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> Result<AppInfo, String> {
    // ...
    Ok(AppInfo { name, version, app_data_dir, app_config_dir, app_cache_dir })
}
```

```javascript
try {
  const info = await ipc.getAppInfo();
  console.log(info.name, info.version);
} catch (error) {
  console.error('Failed:', error); // error is the String from Err()
}
```

## Accessing AppHandle

Add `app: AppHandle` as a parameter. Tauri injects it automatically -- do not pass it from the frontend.

```rust
use tauri::AppHandle;

#[tauri::command]
pub fn my_command(app: AppHandle, user_arg: String) -> Result<(), String> {
    // app is injected by Tauri, user_arg comes from invoke()
    Ok(())
}
```

```javascript
// Only pass user_arg, not app
await invoke('my_command', { userArg: 'value' });
```

Note: Rust `snake_case` parameters map to JS `camelCase` in the invoke object.

## Accessing Managed State

Use `State<'_, T>` for state registered with `.manage()`:

```rust
use tauri::State;

#[tauri::command]
pub fn stop_autosave(state: State<'_, AutosaveState>) -> Result<(), String> {
    let mut running = state.running.lock().unwrap();
    *running = false;
    Ok(())
}
```

Like `AppHandle`, `State` is injected by Tauri -- do not pass it from the frontend.

## Async Commands

Add `async` to the function. Useful for I/O operations that shouldn't block the main thread.

```rust
#[tauri::command]
pub async fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

## Emitting Events from Rust

Use `app.emit()` to send events to the frontend:

```rust
use tauri::Emitter;

// Emit to all windows
let _ = app.emit("autosave:saved", ());

// Emit with payload
let _ = app.emit("autosave:recovery-available", &recovery_info);
```

## Listening for Events in the Frontend

Use the `events` object from the IPC facade:

```javascript
import { events } from './lib/ipc.js';

events.onAutosaveSaved(() => console.log('Saved'));
events.onRecoveryAvailable((info) => console.log('Recovery:', info));
events.onCloseRequested(() => showConfirmDialog());
events.onMenuEvent('menu:file:new', () => handleNew());
```

Or use `listen()` directly for custom events:

```javascript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('my-custom-event', (event) => {
  console.log(event.payload);
});

// Clean up when done
unlisten();
```
