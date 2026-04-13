# IPC Commands

Tauri v2 uses a command-based IPC model. The frontend calls `invoke()` to run Rust functions. Rust can also emit events back to the frontend.

## How It Works

1. Define a Rust function with `#[tauri::command]`
2. Register it in `lib.rs` via `tauri::generate_handler![]`
3. Call it from React with `invoke()`

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

### 3. Call from React

```tsx
import { invoke } from '@tauri-apps/api/core';

const message = await invoke<string>('greet', { name: 'World' });
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

```tsx
const sum = await invoke<number>('add', { a: 5, b: 3 });
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

```tsx
const count = await invoke<number>('process_filters', {
  filters: [
    { name: 'Images', extensions: ['png', 'jpg'] },
    { name: 'Videos', extensions: ['mp4', 'mov'] },
  ],
});
```

### Optional arguments

Use `Option<T>` in Rust. Omit the field from the JS object to pass `None`.

```rust
#[tauri::command]
pub async fn show_open_dialog(
    app: AppHandle,
    title: Option<String>,
    filters: Option<Vec<DialogFilter>>,
    multiple: Option<bool>,
) -> Result<Option<Vec<String>>, String> { ... }
```

```tsx
// All optional fields omitted
const files = await invoke('show_open_dialog', {});

// Some fields provided
const files = await invoke('show_open_dialog', {
  title: 'Select Image',
  filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
});
```

## Returning Results

Use `Result<T, String>` for commands that can fail. The error string becomes a rejected promise on the frontend.

```rust
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> Result<AppInfo, String> {
    let config = app.config();
    let name = config.product_name.clone().unwrap_or_else(|| "App".to_string());
    // ...
    Ok(AppInfo { name, version, app_data_dir, app_config_dir, app_cache_dir })
}
```

```tsx
try {
  const info = await invoke<AppInfo>('get_app_info');
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

```tsx
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

```tsx
await invoke('open_external_url', { url: 'https://example.com' });
```

## Emitting Events from Rust to React

Use `app.emit()` to send events to the frontend:

```rust
use tauri::Emitter;

// Emit to all windows
let _ = app.emit("autosave:saved", ());

// Emit with payload
let _ = app.emit("autosave:recovery-available", &recovery_info);
```

## Listening for Events in React

Use `listen()` from `@tauri-apps/api/event`. Always clean up listeners.

```tsx
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

function MyComponent() {
  useEffect(() => {
    const unlisten = listen<RecoveryInfo>('autosave:recovery-available', (event) => {
      console.log('Recovery data:', event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
```

### Multiple listeners with cleanup

```tsx
useEffect(() => {
  const unlisteners: (() => void)[] = [];

  const events = [
    { event: 'autosave:saved', handler: () => console.log('Saved') },
    { event: 'autosave:recovery-available', handler: (e: any) => console.log(e.payload) },
  ];

  events.forEach(({ event, handler }) => {
    listen(event, handler).then((unlisten) => unlisteners.push(unlisten));
  });

  return () => { unlisteners.forEach((u) => u()); };
}, []);
```

## Existing Commands Reference

### commands.rs

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `show_open_dialog` | `title?`, `filters?`, `multiple?` | `Option<Vec<String>>` | Native file open dialog |
| `show_save_dialog` | `title?`, `default_name?`, `filters?` | `Option<String>` | Native file save dialog |
| `get_app_info` | none | `AppInfo` | App name, version, data dirs |
| `open_external_url` | `url` | `()` | Open URL in default browser |

### settings.rs

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_setting` | `key` | `Value` | Read a single setting |
| `set_setting` | `key`, `value` | `()` | Write a single setting |
| `get_all_settings` | none | `Value` | Read all settings as JSON |
| `reset_settings` | none | `()` | Reset all settings to defaults |

### recent_files.rs

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_recent_files` | none | `Vec<String>` | List recent file paths |
| `add_recent_file` | `path` | `()` | Add a file to recents |
| `clear_recent_files` | none | `()` | Clear recent files list |

### autosave.rs

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `start_autosave` | `interval_secs?` | `()` | Start autosave loop |
| `stop_autosave` | none | `()` | Stop autosave loop |
| `update_autosave_state` | `data` (JSON string) | `()` | Set data for next autosave tick |
| `check_recovery` | none | `RecoveryInfo` | Check for crash recovery file |

### Events emitted by Rust

| Event | Payload | Source |
|-------|---------|--------|
| `autosave:saved` | none | Autosave loop after writing |
| `autosave:recovery-available` | `RecoveryInfo` | Startup if recovery file found |
| `menu:*` | none | Menu item clicks (see [Menus](./menus.md)) |
