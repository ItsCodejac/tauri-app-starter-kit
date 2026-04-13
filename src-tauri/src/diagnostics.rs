use serde::Serialize;
use std::time::Instant;
use std::sync::OnceLock;
use tauri::AppHandle;

/// Records the instant the app started so we can compute uptime.
static APP_START: OnceLock<Instant> = OnceLock::new();

/// Call once during setup to record the app start time.
pub fn record_start_time() {
    let _ = APP_START.set(Instant::now());
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticsReport {
    pub app_name: String,
    pub app_version: String,
    pub os_name: String,
    pub os_version: String,
    pub os_arch: String,
    pub rust_version: String,
    pub tauri_version: String,
    pub settings: serde_json::Value,
    pub recent_crash_reports: Vec<CrashReportSummary>,
    pub memory_usage_bytes: Option<u64>,
    pub uptime_secs: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CrashReportSummary {
    pub name: String,
    pub timestamp: String,
}

// ---------------------------------------------------------------------------
// IPC commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn collect_diagnostics(app: AppHandle) -> Result<DiagnosticsReport, String> {
    build_report(&app)
}

#[tauri::command]
pub fn collect_diagnostics_string(app: AppHandle) -> Result<String, String> {
    let report = build_report(&app)?;
    Ok(format_report(&report))
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

fn build_report(app: &AppHandle) -> Result<DiagnosticsReport, String> {
    let config = app.config();
    let app_name = config
        .product_name
        .clone()
        .unwrap_or_else(|| "App".to_string());
    let app_version = config
        .version
        .clone()
        .unwrap_or_else(|| "0.0.0".to_string());

    // OS info
    let os_name = std::env::consts::OS.to_string();
    let os_arch = std::env::consts::ARCH.to_string();
    let os_version = get_os_version();

    // Rust / Tauri versions (compile-time)
    let rust_version = env!("CARGO_PKG_RUST_VERSION").to_string();
    let tauri_version = tauri::VERSION.to_string();

    // Settings (sanitized -- remove anything that looks like a path)
    let settings = get_sanitized_settings(app);

    // Recent crash reports
    let crash_reports = crate::crash_reporter::list_crash_reports(app.clone());
    let recent_crash_reports: Vec<CrashReportSummary> = crash_reports
        .into_iter()
        .take(10) // limit to 10 most recent
        .map(|r| CrashReportSummary {
            name: r.name,
            timestamp: r.timestamp,
        })
        .collect();

    // Memory usage (best-effort via /proc on Linux, task_info on macOS)
    let memory_usage_bytes = get_memory_usage();

    // Uptime
    let uptime_secs = APP_START
        .get()
        .map(|start| start.elapsed().as_secs())
        .unwrap_or(0);

    Ok(DiagnosticsReport {
        app_name,
        app_version,
        os_name,
        os_version,
        os_arch,
        rust_version,
        tauri_version,
        settings,
        recent_crash_reports,
        memory_usage_bytes,
        uptime_secs,
    })
}

fn format_report(report: &DiagnosticsReport) -> String {
    let mut out = String::new();

    out.push_str("=== Diagnostics Report ===\n\n");
    out.push_str(&format!("App: {} v{}\n", report.app_name, report.app_version));
    out.push_str(&format!(
        "OS: {} {} ({})\n",
        report.os_name, report.os_version, report.os_arch
    ));
    out.push_str(&format!("Rust version: {}\n", report.rust_version));
    out.push_str(&format!("Tauri version: {}\n", report.tauri_version));

    // Uptime
    let hours = report.uptime_secs / 3600;
    let mins = (report.uptime_secs % 3600) / 60;
    let secs = report.uptime_secs % 60;
    out.push_str(&format!("Uptime: {}h {}m {}s\n", hours, mins, secs));

    // Memory
    if let Some(bytes) = report.memory_usage_bytes {
        let mb = bytes as f64 / (1024.0 * 1024.0);
        out.push_str(&format!("Memory usage: {:.1} MB\n", mb));
    } else {
        out.push_str("Memory usage: unavailable\n");
    }

    // Settings
    out.push_str(&format!(
        "\nSettings: {}\n",
        serde_json::to_string_pretty(&report.settings).unwrap_or_else(|_| "{}".to_string())
    ));

    // Crash reports
    if report.recent_crash_reports.is_empty() {
        out.push_str("\nRecent crashes: none\n");
    } else {
        out.push_str(&format!(
            "\nRecent crashes ({}):\n",
            report.recent_crash_reports.len()
        ));
        for cr in &report.recent_crash_reports {
            out.push_str(&format!("  - {} ({})\n", cr.name, cr.timestamp));
        }
    }

    out
}

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

fn get_os_version() -> String {
    #[cfg(target_os = "macos")]
    {
        // Use sw_vers to get macOS version
        if let Ok(output) = std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
        {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !version.is_empty() {
                return version;
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Try /etc/os-release
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if let Some(rest) = line.strip_prefix("PRETTY_NAME=") {
                    return rest.trim_matches('"').to_string();
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Use ver command or just report the arch
        if let Ok(output) = std::process::Command::new("cmd")
            .args(["/C", "ver"])
            .output()
        {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !version.is_empty() {
                return version;
            }
        }
    }

    "unknown".to_string()
}

fn get_memory_usage() -> Option<u64> {
    #[cfg(target_os = "macos")]
    {
        // Use mach task_info
        use std::mem;
        extern "C" {
            fn mach_task_self() -> u32;
            fn task_info(
                target_task: u32,
                flavor: i32,
                task_info_out: *mut u8,
                task_info_count: *mut u32,
            ) -> i32;
        }

        #[repr(C)]
        struct TaskBasicInfo {
            suspend_count: i32,
            virtual_size: u64,
            resident_size: u64,
            user_time: [u32; 2],
            system_time: [u32; 2],
            policy: i32,
        }

        const MACH_TASK_BASIC_INFO: i32 = 20;

        unsafe {
            let mut info: TaskBasicInfo = mem::zeroed();
            let mut count = (mem::size_of::<TaskBasicInfo>() / mem::size_of::<u32>()) as u32;
            let result = task_info(
                mach_task_self(),
                MACH_TASK_BASIC_INFO,
                &mut info as *mut _ as *mut u8,
                &mut count,
            );
            if result == 0 {
                return Some(info.resident_size);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Read /proc/self/statm
        if let Ok(content) = std::fs::read_to_string("/proc/self/statm") {
            let parts: Vec<&str> = content.split_whitespace().collect();
            if parts.len() >= 2 {
                if let Ok(pages) = parts[1].parse::<u64>() {
                    // RSS in pages, page size is typically 4096
                    return Some(pages * 4096);
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Use GetProcessMemoryInfo
        // For simplicity, return None on Windows -- can be extended
    }

    None
}

fn get_sanitized_settings(app: &AppHandle) -> serde_json::Value {
    use tauri_plugin_store::StoreExt;

    if let Ok(store) = app.store("settings.json") {
        // Build a sanitized copy -- remove keys that contain path-like values
        let mut sanitized = serde_json::Map::new();

        let keys_to_include = [
            "theme",
            "autosave_enabled",
            "autosave_interval_secs",
            "tray.minimize_to_tray",
            "autostart",
        ];

        for key in &keys_to_include {
            if let Some(val) = store.get(*key) {
                sanitized.insert(key.to_string(), val.clone());
            }
        }

        serde_json::Value::Object(sanitized)
    } else {
        serde_json::json!({})
    }
}
