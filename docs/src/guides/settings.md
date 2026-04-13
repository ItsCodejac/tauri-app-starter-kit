# Settings

Persistent key-value settings backed by [tauri-plugin-store](https://v2.tauri.app/plugin/store/). Settings are stored in `settings.json` inside the app's data directory.

## Default Settings

The `AppSettings` struct in `src-tauri/src/settings.rs` defines all keys and their defaults:

```rust
pub struct AppSettings {
    pub theme: String,              // "dark"
    pub recent_files: Vec<String>,  // []
    pub autosave_enabled: bool,     // true
    pub autosave_interval_secs: u64, // 60
}
```

## Adding a New Setting

### 1. Add the field to `AppSettings`

```rust
pub struct AppSettings {
    // ... existing fields
    pub sidebar_width: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            // ... existing defaults
            sidebar_width: 260,
        }
    }
}
```

### 2. Add the key to `init_settings`

```rust
if !store.has("sidebar_width") {
    store.set("sidebar_width", serde_json::json!(defaults.sidebar_width));
}
```

### 3. Add the key to `get_all_settings` and `reset_settings`

Both functions enumerate every key explicitly. Add your new key to both.

## Reading & Writing from React

Use the `useSettings` hook:

```tsx
import { useSettings } from '../hooks/useSettings';

function MyComponent() {
  const { getSetting, setSetting, loading } = useSettings();

  if (loading) return null;

  const width = getSetting<number>('sidebar_width', 260);

  return (
    <button onClick={() => setSetting('sidebar_width', 300)}>
      Widen sidebar
    </button>
  );
}
```

`setSetting` updates React state immediately (optimistic), then persists to disk via IPC.

## Direct IPC Calls

You can also call the commands directly with `invoke`:

```ts
import { invoke } from '@tauri-apps/api/core';

// Read one key
const theme = await invoke<string>('get_setting', { key: 'theme' });

// Write one key (value is any JSON-serializable type)
await invoke('set_setting', { key: 'theme', value: 'light' });

// Read all settings as an object
const all = await invoke<Record<string, unknown>>('get_all_settings');

// Reset everything to defaults
await invoke('reset_settings');
```

## Storage Location

The store file lives at:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/<bundle-id>/settings.json` |
| Linux | `~/.local/share/<bundle-id>/settings.json` |
| Windows | `%APPDATA%/<bundle-id>/settings.json` |

The bundle identifier is set in `tauri.conf.json` under `identifier`.
