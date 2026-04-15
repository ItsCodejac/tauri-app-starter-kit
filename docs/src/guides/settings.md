# Settings

Persistent key-value settings backed by [tauri-plugin-store](https://v2.tauri.app/plugin/store/). Settings are stored in `settings.json` inside the app's data directory.

## Default Settings

All settings and their defaults are centralized in the `all_defaults()` function in `src-tauri/src/settings.rs`:

| Key | Type | Default | Category |
|-----|------|---------|----------|
| `theme` | `string` | `"dark"` | General |
| `locale` | `string` | `"en"` | General |
| `autostart` | `boolean` | `false` | General |
| `first_run` | `boolean` | `true` | General |
| `updates.checkOnStartup` | `boolean` | `true` | General |
| `updates.lastCheck` | `number` | `0` | General |
| `app.lastSeenVersion` | `string` | `""` | General |
| `view_zoom_level` | `number` | `100` | Appearance |
| `show_statusbar` | `boolean` | `true` | Appearance |
| `show_tooltips` | `boolean` | `true` | Appearance |
| `autosave_enabled` | `boolean` | `true` | Autosave |
| `autosave_interval_secs` | `number` | `60` | Autosave |
| `performance.mode` | `string` | `"balanced"` | Performance |
| `performance.hardwareAcceleration` | `boolean` | `true` | Performance |
| `performance.gpuEnabled` | `boolean` | `true` | Performance |
| `cache.maxCacheSize` | `number` | `10` | Cache |
| `cache.cleanupOldCache` | `boolean` | `true` | Cache |
| `startup_behavior` | `string` | `"empty"` | Startup |
| `tray.minimize_to_tray` | `boolean` | `false` | Tray |
| `tray.show_icon` | `boolean` | `true` | Tray |
| `recent_files` | `string[]` | `[]` | Internal |

## Adding a New Setting

Add a single entry to `all_defaults()` in `settings.rs`:

```rust
fn all_defaults() -> Vec<(&'static str, serde_json::Value)> {
    vec![
        // ...existing entries...
        ("sidebar_width", serde_json::json!(260u32)),
    ]
}
```

That is the only change needed. The new setting automatically works with `init_settings` (populated on first run), `get_all_settings` (included in the response), and `reset_settings` (reset to the default value).

## Reading & Writing from the Frontend

Use the IPC facade:

```javascript
import { ipc } from './lib/ipc.js';

// Read one key
const theme = await ipc.getSetting('theme');

// Write one key (value is any JSON-serializable type)
await ipc.setSetting('theme', 'light');

// Read all settings as an object
const all = await ipc.getAllSettings();

// Reset everything to defaults
await ipc.resetSettings();
```

## Direct invoke Calls

You can also call the commands directly with `invoke`:

```javascript
const { invoke } = window.__TAURI__.core;

const theme = await invoke('get_setting', { key: 'theme' });
await invoke('set_setting', { key: 'theme', value: 'light' });
const all = await invoke('get_all_settings');
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
