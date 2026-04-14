mod autosave;
mod commands;
mod crash_reporter;
mod diagnostics;
mod menu;
mod notifications;
mod recent_files;
mod settings;
mod tray;
mod updater;
mod windows;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager, State, Wry};

/// Tracks whether the frontend has unsaved changes.
pub struct DirtyState {
    pub dirty: AtomicBool,
}

impl Default for DirtyState {
    fn default() -> Self {
        Self {
            dirty: AtomicBool::new(false),
        }
    }
}

/// Called by the frontend to flag whether there are unsaved changes.
#[tauri::command]
fn set_has_unsaved_changes(state: State<'_, DirtyState>, dirty: bool) {
    state.dirty.store(dirty, Ordering::SeqCst);
}

/// Called by the frontend after the user confirms they want to close.
#[tauri::command]
fn confirm_close(app: tauri::AppHandle) {
    // Force-close: set dirty to false so the CloseRequested handler won't block again
    let state = app.state::<DirtyState>();
    state.dirty.store(false, Ordering::SeqCst);

    if let Some(w) = app.get_webview_window("main") {
        let _ = w.close();
    }
}

/// Build the prevent-default plugin. In debug mode, allow devtools and reload
/// shortcuts so developers can still use F12/Cmd+Alt+I and Ctrl+R/F5.
#[cfg(debug_assertions)]
fn prevent_default() -> tauri::plugin::TauriPlugin<Wry> {
    use tauri_plugin_prevent_default::Flags;

    tauri_plugin_prevent_default::Builder::new()
        .with_flags(Flags::all().difference(Flags::DEV_TOOLS | Flags::RELOAD))
        .build()
}

#[cfg(not(debug_assertions))]
fn prevent_default() -> tauri::plugin::TauriPlugin<Wry> {
    tauri_plugin_prevent_default::init()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Install custom panic hook BEFORE anything else so we capture all panics
    crash_reporter::install_panic_hook();

    tauri::Builder::default()
        // -- Plugins --
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Focus the existing window when a second instance tries to launch
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
                // If the window was minimized, restore it
                let _ = w.unminimize();
            }
            // If the second instance was launched with file paths, emit them
            // to the frontend so the app can open them.
            // args[0] is typically the executable path, so skip it.
            let file_args: Vec<&String> = args.iter().skip(1).filter(|a| !a.starts_with('-')).collect();
            if !file_args.is_empty() {
                let paths: Vec<String> = file_args.into_iter().cloned().collect();
                let _ = app.emit("single-instance:open-files", paths);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(prevent_default())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // Updater: uncomment when you've configured endpoints + pubkey in tauri.conf.json
        // See docs/src/guides/updater.md and docs/src/guides/shipping.md
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_keyring::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        // -- Managed state --
        .manage(autosave::AutosaveState::default())
        .manage(DirtyState::default())
        // -- IPC command handlers --
        .invoke_handler(tauri::generate_handler![
            // Settings
            settings::get_setting,
            settings::set_setting,
            settings::get_all_settings,
            settings::reset_settings,
            // Recent files
            recent_files::get_recent_files,
            recent_files::add_recent_file,
            recent_files::clear_recent_files,
            // Autosave
            autosave::start_autosave,
            autosave::stop_autosave,
            autosave::update_autosave_state,
            autosave::check_recovery,
            // General commands
            commands::show_open_dialog,
            commands::show_save_dialog,
            commands::get_app_info,
            commands::open_external_url,
            commands::open_docs,
            // Quit confirmation
            set_has_unsaved_changes,
            confirm_close,
            // Dynamic menu state
            menu::menu_set_enabled,
            menu::menu_set_checked,
            menu::menu_set_label,
            // Crash reporting
            crash_reporter::list_crash_reports,
            crash_reporter::get_crash_report,
            crash_reporter::clear_crash_reports,
            crash_reporter::has_recent_crash,
            crash_reporter::log_frontend_error,
            // Diagnostics
            diagnostics::collect_diagnostics,
            diagnostics::collect_diagnostics_string,
            // Notifications
            notifications::send_notification,
            // Log viewer
            commands::get_log_contents,
            // Updater
            updater::check_for_updates,
            updater::install_update,
            // Window management
            windows::open_window,
        ])
        // -- Setup --
        // Splash screen is the first window in tauri.conf.json (visible: true).
        // Main window is second (visible: false). Tauri creates both at startup --
        // splash appears immediately, main stays hidden until setup completes.
        .setup(|app| {
            // Synchronous init that must happen before anything else
            crash_reporter::set_app_crash_dir(app.handle());
            diagnostics::record_start_time();

            if let Err(e) = tray::setup_tray(app.handle()) {
                log::warn!("Failed to set up system tray: {}", e);
            }

            let menu = menu::build_menu(app.handle())?;
            app.set_menu(menu)?;

            let handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                menu::handle_menu_event(&handle, &event);
            });

            // Spawn setup tasks as async (per Tauri docs: don't block setup).
            // Each step emits a status event so the splash screen shows real progress.
            // Minimum 2-second splash duration so branding is visible even when init is fast.
            let setup_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let start = tokio::time::Instant::now();
                const MIN_SPLASH_SECS: u64 = 5;

                let emit_status = |msg: &str| {
                    let _ = setup_handle.emit("splash:status", msg);
                };

                // --- Real initialization work ---
                emit_status("Initializing settings...");
                if let Err(e) = settings::init_settings(&setup_handle) {
                    log::error!("Failed to initialize settings: {}", e);
                }

                emit_status("Checking for crash recovery...");
                tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                emit_status("Preparing workspace...");
                tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                // --- Ensure minimum splash duration ---
                let elapsed = start.elapsed();
                let min_duration = tokio::time::Duration::from_secs(MIN_SPLASH_SECS);
                if elapsed < min_duration {
                    emit_status("Starting...");
                    tokio::time::sleep(min_duration - elapsed).await;
                }

                // --- Create main window and close splash ---
                emit_status("Ready");

                let main_url = if cfg!(debug_assertions) {
                    tauri::WebviewUrl::External("http://localhost:5173".parse().unwrap())
                } else {
                    tauri::WebviewUrl::App("index.html".into())
                };

                let _ = tauri::WebviewWindowBuilder::new(
                    &setup_handle,
                    "main",
                    main_url,
                )
                .title("App")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .resizable(true)
                .decorations(true)
                .center()
                .visible(true)
                .build();

                if let Some(splash) = setup_handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
            });

            // Check for crash recovery and notify frontend after a short delay
            let recovery_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(1));
                match autosave::check_recovery(recovery_handle.clone()) {
                    Ok(info) => {
                        if info.has_recovery {
                            log::info!("Recovery file found from previous session");
                            let _ = recovery_handle.emit("autosave:recovery-available", &info);
                        }
                    }
                    Err(e) => log::error!("Failed to check recovery: {}", e),
                }
            });

            Ok(())
        })
        // -- Window events: quit confirmation + cleanup --
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let app = window.app_handle();
                    let dirty = app.state::<DirtyState>();

                    // If "minimize to tray" is enabled, hide the window instead
                    // of closing. The user can quit via the tray menu or Cmd+Q.
                    if tray::should_minimize_to_tray(app) {
                        api.prevent_close();
                        let _ = window.hide();
                        return;
                    }

                    if dirty.dirty.load(Ordering::SeqCst) {
                        // Prevent the window from closing immediately
                        api.prevent_close();
                        // Ask the frontend to show a confirmation dialog
                        let _ = app.emit("window:close-requested", ());
                    }
                }
                tauri::WindowEvent::Destroyed => {
                    // Stop autosave and clean up recovery file on normal exit
                    let app = window.app_handle();
                    let state = app.state::<autosave::AutosaveState>();
                    let _ = autosave::stop_autosave(state);
                    autosave::cleanup_recovery(app);
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
