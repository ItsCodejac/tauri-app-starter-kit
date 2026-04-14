# TASK -- Tauri App Starter Kit

A desktop app template built on **Tauri v2** and **Rust**. The frontend is plain HTML + vanilla JS -- framework-agnostic by design. Clone it, rename it, add your own frontend framework (React, Svelte, Vue, or nothing at all), and start building your app instead of your boilerplate.

## What's included

- **Native menu bar** -- File, Edit, View, Window, Help menus with a declarative Rust config. Add custom menus (e.g. "Project", "Timeline") by editing one function.
- **Utility windows** -- Pre-built About, Settings, Keyboard Shortcuts, Log Viewer, What's New, Update Checker, Welcome, and Splash windows, all as plain HTML + JS.
- **Settings** -- Key-value store backed by `tauri-plugin-store`. Read/write from both Rust and the frontend.
- **Keyboard shortcut registry** -- Persisted shortcut bindings with an interactive editor window, conflict detection, and preset support.
- **Autosave and crash recovery** -- Background thread writes recovery snapshots atomically. On next launch, the app detects and offers to restore unsaved state.
- **Crash reporting** -- Custom panic hook captures Rust panics to disk. Frontend errors can also be logged. Log viewer window included.
- **System tray** -- Optional tray icon with minimize-to-tray behavior.
- **Window state** -- Window position and size restored on relaunch via `tauri-plugin-window-state`.
- **Single instance lock** -- Second launch focuses the existing window and forwards file arguments.
- **Native notifications** -- OS-level notifications via `tauri-plugin-notification`.
- **Secure storage** -- OS keychain access via `tauri-plugin-keyring`.
- **Auto-updater** -- Update checking and installation via `tauri-plugin-updater` (commented out until configured).
- **Diagnostics** -- Collect system info, memory usage, uptime, and crash history for bug reports.
- **Quit confirmation** -- Dirty-state tracking prevents accidental data loss.
- **Splash screen** -- Branded splash with real initialization progress, minimum 3-second display.
- **Theming** -- Dark theme via CSS custom properties in `shared.css`. Consistent across all windows.
- **Branding** -- Single `branding.js` config drives app name, logo, accent color, and copyright across all utility windows.
- **Browser shortcut prevention** -- `tauri-plugin-prevent-default` blocks Ctrl+R, Ctrl+P, etc. in production (allows devtools in debug).
- **Autostart** -- Launch at login via `tauri-plugin-autostart`.

## Who this is for

Developers who want to build a Tauri v2 desktop app and skip the first day of wiring up menus, settings, IPC, utility windows, and OS integration plumbing. You bring your own frontend framework (or write vanilla JS); TASK provides the Rust backbone and utility windows.

## About these docs

This `docs/` folder is an [mdBook](https://rust-lang.github.io/mdBook/) that serves triple duty:

1. **Developer documentation** -- You're reading it. How the template works and where to change things.
2. **In-app Help** -- The app's Help menu can open these pages directly. When you ship your app, replace this template content with your app's own docs.
3. **AI assistant reference** -- These pages give AI assistants the context they need to work on this codebase effectively.
