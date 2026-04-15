use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Configuration for a utility window.
struct WindowConfig {
    label: &'static str,
    title: &'static str,
    url: &'static str,
    width: f64,
    height: f64,
    min_width: f64,
    min_height: f64,
    resizable: bool,
    decorations: bool,
    always_on_top: bool,
    center: bool,
}

/// Predefined utility window configurations.
fn get_window_config(name: &str) -> Option<WindowConfig> {
    match name {
        "splash" => Some(WindowConfig {
            label: "splash",
            title: "Loading",
            url: "src/windows/splash.html",
            width: 480.0,
            height: 300.0,
            min_width: 0.0,
            min_height: 0.0,
            resizable: false,
            decorations: false,
            always_on_top: true,
            center: true,
        }),
        "settings" => Some(WindowConfig {
            label: "settings",
            title: "Preferences",
            url: "src/windows/settings.html",
            width: 780.0,
            height: 580.0,
            min_width: 520.0,
            min_height: 340.0,
            resizable: true,
            decorations: true,
            always_on_top: false,
            center: true,
        }),
        "about" => Some(WindowConfig {
            label: "about",
            title: "About",
            url: "src/windows/about.html",
            width: 360.0,
            height: 400.0,
            min_width: 0.0,
            min_height: 0.0,
            resizable: false,
            decorations: true,
            always_on_top: true,
            center: true,
        }),
        "shortcuts" => Some(WindowConfig {
            label: "shortcuts",
            title: "Keyboard Shortcuts",
            url: "src/windows/shortcuts.html",
            width: 840.0,
            height: 700.0,
            min_width: 0.0,
            min_height: 0.0,
            resizable: false,
            decorations: true,
            always_on_top: false,
            center: true,
        }),
        "logs" => Some(WindowConfig {
            label: "logs",
            title: "Logs",
            url: "src/windows/logs.html",
            width: 700.0,
            height: 500.0,
            min_width: 420.0,
            min_height: 200.0,
            resizable: true,
            decorations: true,
            always_on_top: false,
            center: true,
        }),
        "update" => Some(WindowConfig {
            label: "update",
            title: "Check for Updates",
            url: "src/windows/update.html",
            width: 420.0,
            height: 340.0,
            min_width: 0.0,
            min_height: 0.0,
            resizable: false,
            decorations: true,
            always_on_top: true,
            center: true,
        }),
        "whatsnew" => Some(WindowConfig {
            label: "whatsnew",
            title: "What's New",
            url: "src/windows/whatsnew.html",
            width: 500.0,
            height: 520.0,
            min_width: 360.0,
            min_height: 300.0,
            resizable: true,
            decorations: true,
            always_on_top: false,
            center: true,
        }),
        "welcome" => Some(WindowConfig {
            label: "welcome",
            title: "Welcome",
            url: "src/windows/welcome.html",
            width: 540.0,
            height: 480.0,
            min_width: 0.0,
            min_height: 0.0,
            resizable: false,
            decorations: true,
            always_on_top: true,
            center: true,
        }),
        _ => None,
    }
}

/// Open a utility window by name. If it already exists, focus it.
#[tauri::command]
pub fn open_window(app: AppHandle, name: String) -> Result<(), String> {
    // If window already exists, just focus it
    if let Some(existing) = app.get_webview_window(&name) {
        existing.show().map_err(|e| e.to_string())?;
        existing.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let config = get_window_config(&name)
        .ok_or_else(|| format!("Unknown window: {}", name))?;

    let url = if cfg!(debug_assertions) {
        // In dev mode, serve from the Vite dev server
        WebviewUrl::External(
            format!("http://localhost:5173/{}", config.url)
                .parse()
                .map_err(|e: url::ParseError| e.to_string())?,
        )
    } else {
        // In production, load from the bundled dist
        WebviewUrl::App(config.url.into())
    };

    let mut builder = WebviewWindowBuilder::new(&app, config.label, url)
        .title(config.title)
        .inner_size(config.width, config.height)
        .resizable(config.resizable)
        .decorations(config.decorations)
        .always_on_top(config.always_on_top)
        .visible(true);

    // Set minimum sizes for resizable windows to prevent layout breakage
    if config.resizable {
        builder = builder.min_inner_size(config.min_width, config.min_height);
    }

    if config.center {
        builder = builder.center();
    }

    builder.build().map_err(|e| e.to_string())?;

    Ok(())
}

/// Open a utility window directly from Rust (for menu handlers, etc.)
pub fn open_window_internal(app: &AppHandle, name: &str) {
    let app_clone = app.clone();
    let name_owned = name.to_string();
    // Run on the main thread to avoid blocking menu event handling
    tauri::async_runtime::spawn(async move {
        if let Err(e) = open_window(app_clone, name_owned) {
            log::error!("Failed to open window: {}", e);
        }
    });
}
