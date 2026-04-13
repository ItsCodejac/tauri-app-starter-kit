# Auto-Updater

In-app update checking and installation using [tauri-plugin-updater](https://v2.tauri.app/plugin/updater/). Backend in `src-tauri/src/updater.rs`, UI in `src/components/ui/UpdateDialog.tsx`.

## How It Works

1. The app calls `check_for_updates` which queries the update endpoint configured in `tauri.conf.json`
2. If an update is available, the dialog shows version info and release notes
3. The user can install, skip, or dismiss
4. `install_update` downloads, installs, and restarts the app

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

## IPC Facade

```ts
// Check for updates -- returns info or null
const info = await ipc.checkForUpdates();

// Download, install, and restart
await ipc.installUpdate();
```

## Update Dialog States

The `UpdateDialog` component cycles through these states:

| State | Shows |
|-------|-------|
| `checking` | Spinner + "Checking for available updates..." |
| `up-to-date` | Current version is latest |
| `update-available` | Version diff, release notes, Install/Skip/Later buttons |
| `downloading` | Progress bar + "The app will restart automatically" |
| `error` | Error message |

## Check on Startup

Controlled by the `updates.checkOnStartup` setting (defaults to `true`). Disable it:

```ts
await ipc.setSetting('updates.checkOnStartup', false);
```

## Manual Check

Triggered from the Help menu ("Check for Updates..."), which opens the `UpdateDialog`.

## Skip Version

When the user clicks "Skip This Version", the skipped version is saved:

```ts
await ipc.setSetting('updates.skippedVersion', updateInfo.version);
```

Your startup check logic should compare against this setting and suppress the dialog if the available version matches the skipped version.

## What's New Dialog

After an update completes, the app can show a "What's New" dialog by comparing the current version against `app.lastSeenVersion`:

```ts
const lastSeen = await ipc.getSetting('app.lastSeenVersion');
const current = (await ipc.getAppInfo()).version;

if (lastSeen !== current) {
  // Show what's new
  await ipc.setSetting('app.lastSeenVersion', current);
}
```

Both settings are initialized in `settings.rs`:

```rust
if !store.has("app.lastSeenVersion") {
    store.set("app.lastSeenVersion", serde_json::json!(""));
}
```

## Configuring the Update Endpoint

Set the endpoint in `src-tauri/tauri.conf.json` under the updater plugin config. The endpoint must return a JSON response matching the [Tauri updater format](https://v2.tauri.app/plugin/updater/).

Common patterns:
- **GitHub Releases:** Use the built-in GitHub updater endpoint
- **Self-hosted:** Serve a static JSON file from your own server
- **Gist:** Use a GitHub Gist for simple projects
