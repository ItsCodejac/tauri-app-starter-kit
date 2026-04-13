# Tauri App Starter

A desktop app template built on Tauri v2, React 19, and TypeScript. Clone it, rename it, and start building your app instead of your boilerplate.

## What's included

- **Native menu bar** -- File, Edit, View, Window, Help menus with a declarative Rust config. Add custom menus (e.g. "Project", "Timeline") by editing one function.
- **Resizable panel layout** -- Left, center, right, and bottom panels with drag handles and double-click collapse. Sizes persist across restarts.
- **Workspace tabs** -- In-app tab bar for switching between workspaces or modes.
- **Settings** -- Key-value store backed by `tauri-plugin-store`. Read/write from both Rust and React.
- **Autosave and crash recovery** -- Background thread writes recovery snapshots atomically. On next launch, the app detects and offers to restore unsaved state.
- **Keyboard shortcuts** -- Cross-platform shortcut hook with `meta` mapped to Cmd on Mac, Ctrl elsewhere.
- **Command palette** -- Fuzzy-search command launcher (Cmd+Shift+P) with keyboard navigation.
- **Toast notifications** -- Stacked, auto-dismissing notifications with info/success/warning/error types.
- **Window state** -- Window position and size restored on relaunch via `tauri-plugin-window-state`.
- **Status bar** -- Bottom bar with left-aligned status text and right-aligned custom content.

## Who this is for

Developers who want to build a Tauri desktop app and skip the first day of wiring up menus, panels, settings, and IPC plumbing.

## About these docs

This `docs/` folder is an [mdBook](https://rust-lang.github.io/mdBook/) that serves triple duty:

1. **Developer documentation** -- You're reading it. How the template works and where to change things.
2. **In-app Help** -- The app's Help menu can open these pages directly. When you ship your app, replace this template content with your app's own docs.
3. **Claude Code skill reference** -- These pages give AI assistants the context they need to work on this codebase effectively.
