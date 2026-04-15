# Removing Features

TASK is modular by design. Every feature can be removed if your app doesn't need it. This guide lists the files to edit or delete for each optional feature, ranked by removal difficulty.

---

## System Tray (CLEAN)

The tray icon and menu are self-contained.

1. **Delete** `src-tauri/src/tray.rs`
2. **`src-tauri/src/lib.rs`** -- Remove `mod tray;` and the `tray::setup_tray(app)` call
3. **`src-tauri/Cargo.toml`** -- Remove `"tray-icon"` and `"image-png"` from the `features` list (keep `image-png` if used by notifications)
4. **`src/windows/settings.html`** -- Remove the "Show in system tray" checkbox
5. **`src/windows/settings.js`** -- Remove the tray-related setting load/save logic
6. **`src-tauri/src/settings.rs`** -- Remove `show_in_tray` from `all_defaults()`
7. **`src-tauri/src/diagnostics.rs`** -- Remove any tray references in the system info output

---

## Auto-Updater (CLEAN)

The updater is a plugin with minimal coupling.

1. **Delete** `src-tauri/src/updater.rs`
2. **`src-tauri/src/lib.rs`** -- Remove `mod updater;`, the `tauri_plugin_updater` plugin init, and the `updater::check_for_updates` IPC handler
3. **`src-tauri/Cargo.toml`** -- Remove `tauri-plugin-updater` from `[dependencies]`
4. **`src/lib/ipc.js`** -- Remove the `checkForUpdates` wrapper
5. **`src/windows/settings.html`** -- Remove the "Check for updates" checkbox and "Check Now" button
6. **`src/windows/settings.js`** -- Remove auto-update setting logic

---

## Autosave (MESSY)

Autosave has tendrils into several subsystems.

1. **Delete** `src-tauri/src/autosave.rs`
2. **`src-tauri/src/lib.rs`** -- Remove `mod autosave;`, the `autosave::AutosaveState` managed state, the autosave IPC handlers, and the autosave timer setup in the `setup` closure
3. **`src-tauri/src/settings.rs`** -- Remove `autosave_interval` from `all_defaults()`
4. **`src-tauri/src/diagnostics.rs`** -- Remove autosave status from diagnostic output
5. **`src/windows/settings.html`** -- Remove the autosave interval dropdown
6. **`src/windows/settings.js`** -- Remove autosave setting load/save
7. **`src/lib/ipc.js`** -- Remove autosave-related IPC wrappers

**Watch out:** `lib.rs` uses autosave state in the window close handler and the `on_window_event` callback. Search for all `autosave` references in `lib.rs` -- there are usually 4-6 scattered across the setup function.

---

## Keyboard Shortcuts (MESSY)

Shortcuts touch the menu system, a dedicated window, and the Rust backend.

1. **Delete** `src-tauri/src/shortcuts.rs`
2. **Delete** `src/windows/shortcuts.html` and `src/windows/shortcuts.js`
3. **`src-tauri/src/lib.rs`** -- Remove `mod shortcuts;`, the `ShortcutState` managed state, and all shortcut IPC handlers (`get_shortcuts`, `set_shortcut`, `remove_shortcut`, `reset_shortcut`, `reset_all_shortcuts`, `check_conflict`, `get_presets`, `save_preset`, `load_preset`, `delete_preset`)
4. **`src-tauri/src/menu.rs`** -- Remove the "Keyboard Shortcuts..." menu item
5. **`src-tauri/src/windows.rs`** -- Remove the `open_shortcuts_window` function
6. **`src/lib/ipc.js`** -- Remove all shortcut IPC wrappers
7. **`src/windows/settings.html`** -- Remove any shortcut-related UI
8. **`src-tauri/tauri.conf.json`** -- Remove the shortcuts window from the `windows` array (if present)

---

## Crash Reporting (TANGLED)

Crash reporting depends on diagnostics, which other features also use.

1. **Delete** `src-tauri/src/crash_reporter.rs`
2. **`src-tauri/src/lib.rs`** -- Remove `mod crash_reporter;` and the crash reporter IPC handlers
3. **`src/lib/ipc.js`** -- Remove crash report IPC wrappers

**Warning:** `crash_reporter.rs` calls into `diagnostics.rs` to gather system info for reports. If you also want to remove diagnostics:

4. **Delete** `src-tauri/src/diagnostics.rs`
5. **`src-tauri/src/lib.rs`** -- Remove `mod diagnostics;` and all diagnostics IPC handlers
6. **`src/windows/about.js`** -- Remove the diagnostics copy/display logic from the About window

But `diagnostics.rs` is also used by the About window and may be used by autosave for recovery metadata. Check all callers before removing it.

---

## General Tips

- After removing a feature, run `cargo build --manifest-path src-tauri/Cargo.toml` to catch any remaining references the Rust compiler will flag.
- Run `npm run build` to verify the frontend still bundles correctly.
- Search for the feature name across the codebase (`grep -r "featurename" src/ src-tauri/src/`) to catch any stragglers.
- The `lib.rs` file is the integration hub -- most removal work happens there.
