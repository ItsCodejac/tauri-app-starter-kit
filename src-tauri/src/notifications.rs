use tauri_plugin_notification::NotificationExt;

/// Send a native OS notification.
#[tauri::command]
pub fn send_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
    // Icon parameter reserved for future platform-specific support
    _icon: Option<String>,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}
