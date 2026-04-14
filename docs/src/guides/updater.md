# Auto-Updater

In-app update checking and installation using [tauri-plugin-updater](https://v2.tauri.app/plugin/updater/). Backend in `src-tauri/src/updater.rs`, UI in `src/windows/update.html`.

## Current State

The updater plugin is **commented out** in `lib.rs`. It is included as a dependency in `Cargo.toml` but not registered as a plugin. The `check_for_updates` and `install_update` IPC commands exist but will return an error until you enable the plugin.

## Enabling the Updater

1. Uncomment the plugin in `src-tauri/src/lib.rs`:
   ```rust
   .plugin(tauri_plugin_updater::Builder::new().build())
   ```
2. Add `updater::mark_enabled()` immediately after the plugin registration.
3. Configure endpoints and a public key in `tauri.conf.json`:
   ```json
   {
     "plugins": {
       "updater": {
         "endpoints": ["https://releases.yourapp.com/{{target}}/{{arch}}/{{current_version}}"],
         "pubkey": "YOUR_PUBLIC_KEY_HERE"
       }
     }
   }
   ```

## Rust Commands

```rust
// Returns UpdateInfo if an update is available, null if up-to-date
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<UpdateInfo>, String>

// Downloads, installs, and restarts
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String>
```

`UpdateInfo` contains:

```rust
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,   // release notes
    pub date: Option<String>,
}
```

Both commands check `UPDATER_ENABLED` (an atomic bool) and return an error if the plugin is not registered.

## IPC Facade

```javascript
import { ipc } from './lib/ipc.js';

// Check for updates -- returns info or null
const info = await ipc.checkForUpdates();

// Download, install, and restart
await ipc.installUpdate();
```

## Update Window

The Update window (`Help > Check for Updates` or `ipc.openWindow('update')`) provides the UI for checking and installing updates.

## Check on Startup

Controlled by the `updates.checkOnStartup` setting (defaults to `true`). Disable it:

```javascript
await ipc.setSetting('updates.checkOnStartup', false);
```

## What's New Window

After an update, the What's New window shows release notes. Compare the current version against `app.lastSeenVersion`:

```javascript
const lastSeen = await ipc.getSetting('app.lastSeenVersion');
const current = (await ipc.getAppInfo()).version;

if (lastSeen !== current) {
  await ipc.openWindow('whatsnew');
  await ipc.setSetting('app.lastSeenVersion', current);
}
```

## Configuring the Update Endpoint

Set the endpoint in `src-tauri/tauri.conf.json` under the updater plugin config. The endpoint must return a JSON response matching the [Tauri updater format](https://v2.tauri.app/plugin/updater/).

Common patterns:
- **GitHub Releases:** Use the built-in GitHub updater endpoint
- **Self-hosted:** Serve a static JSON file from your own server
- **Gist:** Use a GitHub Gist for simple projects
