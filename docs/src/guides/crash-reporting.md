# Crash Reporting

The template includes crash handling for both Rust panics and React render errors, with persistent crash logs and next-launch detection.

## How It Works

### Rust Panics

A custom panic hook catches Rust panics before the process dies and writes a crash report containing:
- Timestamp
- App version and OS info
- Panic message and location (file, line)
- Backtrace

Reports are saved to the crash reports directory (`~/.tauri-app-starter/crash-reports/` or the app data dir).

### React Errors

An `ErrorBoundary` component wraps the entire app. If a React component throws during rendering:
- A recovery UI is shown instead of a white screen
- The error is logged to the same crash reports directory via IPC
- The user can reload or copy the error details

### Unhandled JS Errors

Global handlers catch `window.onerror` and `window.onunhandledrejection`, logging them to crash reports.

## Startup Crash Detection

On launch, the app checks for crash reports from the last session. If found, a toast notification informs the user:

> "The app crashed during your last session."

## IPC Commands

| Command | Description |
|---------|-------------|
| `has_recent_crash` | Check for crash reports written in the last 5 minutes |
| `list_crash_reports` | List all crash reports (name, timestamp, size) |
| `get_crash_report` | Read a specific crash report's contents |
| `clear_crash_reports` | Delete all crash reports |
| `log_frontend_error` | Write a frontend error to crash reports dir |

## Using the IPC Facade

```typescript
import { ipc } from '../lib/ipc';

// Check for recent crash on startup
const crash = await ipc.hasRecentCrash();
if (crash) {
  console.log('Crashed at:', crash.timestamp);
}

// List all reports
const reports = await ipc.listCrashReports();

// Read a specific report
const contents = await ipc.getCrashReport(reports[0].name);
```

## Error Boundary

The ErrorBoundary shows a dark-themed recovery screen with:
- Error message (not the full stack trace)
- **Reload** button — reloads the window
- **Copy Error** button — copies details to clipboard

To customize the recovery UI, edit `src/components/ErrorBoundary.tsx`.

## Crash Report Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/com.tauri.dev/crash-reports/` |
| Windows | `%APPDATA%/com.tauri.dev/crash-reports/` |
| Linux | `~/.local/share/com.tauri.dev/crash-reports/` |

Change the identifier in `tauri.conf.json` to update the path.

## Adding "Report a Bug"

The crash reports directory is accessible via `ipc.getAppInfo()` (the `app_data_dir` field). You can implement a "Report a Bug" feature that:
1. Reads the latest crash report
2. Attaches system info
3. Opens an email compose or uploads to your issue tracker
