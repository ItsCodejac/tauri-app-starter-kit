# Native Notifications

Send OS-level notifications using [tauri-plugin-notification](https://v2.tauri.app/plugin/notification/). Defined in `src-tauri/src/notifications.rs`.

## Sending from the Frontend

Use the IPC facade:

```javascript
import { ipc } from './lib/ipc.js';

await ipc.sendNotification('Download Complete', 'Your export is ready.');
```

The facade signature:

```javascript
ipc.sendNotification(title, body, icon?)
```

The `icon` parameter is reserved for future platform-specific support and currently has no effect.

## Sending from Rust

The `send_notification` command is already registered as a Tauri command:

```rust
#[tauri::command]
pub fn send_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
    _icon: Option<String>,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}
```

## When to Use Native Notifications

| | Native Notification | In-App Feedback |
|---|---|---|
| **Visible when** | App is backgrounded or minimized | App is focused |
| **Persists in** | OS notification center | Gone after interaction |
| **Use for** | Background tasks finishing, important alerts | Immediate feedback (save, copy, etc.) |

**Rule of thumb:** If the user might not be looking at the app, use a native notification. Otherwise, use in-app feedback.

## Platform Permissions

| Platform | Behavior |
|----------|----------|
| **macOS** | Works out of the box. User can disable in System Settings > Notifications. |
| **Windows** | Works out of the box. Respects Focus Assist / Do Not Disturb. |
| **Linux** | Requires a notification daemon (most DEs have one). Uses D-Bus. |

No permission request is needed at the app level -- the Tauri plugin handles it. If the user has disabled notifications for your app at the OS level, `show()` succeeds silently.
