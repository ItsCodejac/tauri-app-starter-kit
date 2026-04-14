# Crash Reporting

The template includes crash handling for both Rust panics and frontend errors, with persistent crash logs, a log viewer window, and next-launch detection. Defined in `src-tauri/src/crash_reporter.rs`.

## How It Works

### Rust Panics

A custom panic hook (`install_panic_hook()`) is installed before anything else in `lib.rs`. It catches Rust panics before the process dies and writes a crash report containing:
- Timestamp (ISO 8601 UTC)
- App version and OS info
- Panic message and location (file, line, column)
- Full backtrace

Reports are saved as `.log` files in the crash reports directory.

### Frontend Errors

The `log_frontend_error` IPC command writes frontend errors to the same crash reports directory. Reports include the error message, optional JavaScript stack trace, and optional component stack.

## Startup Crash Detection

On launch, use `has_recent_crash` to check for crash reports from the last 5 minutes:

```javascript
import { ipc } from './lib/ipc.js';

const crash = await ipc.hasRecentCrash();
if (crash) {
  console.log('Crashed at:', crash.timestamp);
  // Show recovery UI or notification
}
```

## IPC Commands

| Command | Description |
|---------|-------------|
| `has_recent_crash` | Returns the most recent crash report if it occurred within the last 5 minutes, otherwise `null` |
| `list_crash_reports` | List all crash reports (name, timestamp, size), sorted most-recent-first |
| `get_crash_report` | Read a specific crash report's full text content by filename |
| `clear_crash_reports` | Delete the entire crash-reports directory |
| `log_frontend_error` | Write a frontend error report to the crash-reports directory |

## Using the IPC Facade

```javascript
import { ipc } from './lib/ipc.js';

// Check for recent crash on startup
const crash = await ipc.hasRecentCrash();
if (crash) {
  console.log('Crashed at:', crash.timestamp);
}

// List all reports
const reports = await ipc.listCrashReports();

// Read a specific report
const contents = await ipc.getCrashReport(reports[0].name);

// Log a frontend error
await ipc.logFrontendError(
  'Uncaught TypeError: Cannot read property of undefined',
  error.stack,
  null
);

// Clear all reports
await ipc.clearCrashReports();
```

## Log Viewer Window

The Log Viewer (`Help > View Logs` or `ipc.openWindow('logs')`) displays the application log file with level filtering. It reads from the Tauri log plugin's output file (`{app_name}.log` in the app log directory).

The `get_log_contents` command returns the last ~500KB of the log file to avoid huge payloads.

## Crash Report Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/<identifier>/crash-reports/` |
| Windows | `%APPDATA%/<identifier>/crash-reports/` |
| Linux | `~/.local/share/<identifier>/crash-reports/` |

Change the identifier in `tauri.conf.json` to update the path.

The panic hook uses a fallback directory (`~/.app-crash-reports/crash-reports/`) if the app data directory is not available (e.g. if the panic occurs before setup completes).

## Report Format

Crash reports are plain text files named `crash-{timestamp}.log` for Rust panics and `frontend-error-{timestamp}.log` for frontend errors.

Rust panic report example:

```
=== CRASH REPORT ===
Timestamp : 2025-01-15T10:30:00Z
App Version: 0.1.0
OS         : macos aarch64
Location   : src-tauri/src/commands.rs:42:5

--- Panic Message ---
index out of bounds: the len is 0 but the index is 5

--- Backtrace ---
...
```

## Security

The `get_crash_report` command includes directory traversal protection -- it validates that the requested file is within the crash-reports directory.
