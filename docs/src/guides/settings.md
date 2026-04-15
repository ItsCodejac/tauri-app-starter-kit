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
| `font_size` | `string` | `"default"` | Appearance |
| `reduce_motion` | `boolean` | `false` | Accessibility |
| `high_contrast` | `boolean` | `false` | Accessibility |
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

## Adding Your Setting to the Settings UI

After adding a default in `settings.rs`, you need three pieces to make it visible in the Settings window.

### 1. Add a form control in `src/windows/settings.html`

Place it in the appropriate `<div class="pane">` section. Use the existing CSS classes for consistent layout.

**Checkbox example** (for a boolean setting):

```html
<div class="check">
  <input type="checkbox" id="my-feature-enabled" />
  <label for="my-feature-enabled">Enable my feature</label>
</div>
```

**Select example** (for a string/enum setting):

```html
<div class="row">
  <span class="row-label">My Option</span>
  <div class="row-value">
    <select id="my-option">
      <option value="a">Option A</option>
      <option value="b">Option B</option>
    </select>
  </div>
</div>
```

The `id` attribute on the control is what you reference in JavaScript. It does not need to match the setting key -- it just needs to be unique in the page.

### 2. Wire it in `src/windows/settings.js`

Add one line to `applyToForm()` to populate the control when settings load:

```javascript
function applyToForm(s) {
  // ...existing lines...
  setChecked('my-feature-enabled', s.my_feature_enabled ?? false);
  setValue('my-option', s.my_option ?? 'a');
}
```

Add one line to `readFromForm()` to read the control value back:

```javascript
function readFromForm() {
  return {
    ...current,
    // ...existing lines...
    my_feature_enabled: getChecked('my-feature-enabled'),
    my_option: getValue('my-option'),
  };
}
```

`setChecked` / `getChecked` work with checkboxes. `setValue` / `getValue` work with selects, text inputs, and number inputs. These helpers are imported from `../lib/window-utils.js`.

### 3. Summary

| Step | File | What to add |
|------|------|-------------|
| Default value | `src-tauri/src/settings.rs` | Entry in `all_defaults()` |
| HTML control | `src/windows/settings.html` | `<input>` or `<select>` with a unique `id` |
| Load into form | `src/windows/settings.js` | `setChecked()` or `setValue()` in `applyToForm()` |
| Read from form | `src/windows/settings.js` | `getChecked()` or `getValue()` in `readFromForm()` |

No other wiring is needed. The OK button already diffs `readFromForm()` against the original values and saves any changes via `ipc.setSetting()`.

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
