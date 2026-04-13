use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

/// Directory override set during app setup so the panic hook can use the proper
/// app data directory instead of the fallback.
static APP_CRASH_DIR: OnceLock<PathBuf> = OnceLock::new();

#[derive(Debug, Clone, Serialize)]
pub struct CrashReport {
    pub name: String,
    pub timestamp: String,
    pub size_bytes: u64,
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/// Returns the crash reports directory, using the Tauri app data dir when an
/// AppHandle is available, falling back to ~/.tauri-app-starter/crash-reports/.
fn fallback_crash_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".tauri-app-starter-kit")
        .join("crash-reports")
}

pub fn get_crash_reports_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| fallback_crash_dir())
        .join("crash-reports")
}

fn resolve_crash_dir() -> PathBuf {
    if let Some(dir) = APP_CRASH_DIR.get() {
        dir.clone()
    } else {
        fallback_crash_dir()
    }
}

/// Call once during setup to tell the panic hook the correct directory.
pub fn set_app_crash_dir(app: &AppHandle) {
    let dir = get_crash_reports_dir(app);
    let _ = APP_CRASH_DIR.set(dir);
}

// ---------------------------------------------------------------------------
// Panic hook
// ---------------------------------------------------------------------------

pub fn install_panic_hook() {
    let default_hook = std::panic::take_hook();

    std::panic::set_hook(Box::new(move |info| {
        // Gather details
        let message = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = if let Some(loc) = info.location() {
            format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
        } else {
            "unknown location".to_string()
        };

        let backtrace = std::backtrace::Backtrace::force_capture();
        let timestamp = chrono_timestamp();
        let os_info = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);
        let app_version = env!("CARGO_PKG_VERSION");

        let report = format!(
            "=== CRASH REPORT ===\n\
             Timestamp : {timestamp}\n\
             App Version: {app_version}\n\
             OS         : {os_info}\n\
             Location   : {location}\n\
             \n\
             --- Panic Message ---\n\
             {message}\n\
             \n\
             --- Backtrace ---\n\
             {backtrace}\n"
        );

        // Write to file
        let dir = resolve_crash_dir();
        if let Err(e) = fs::create_dir_all(&dir) {
            eprintln!("Failed to create crash-reports dir: {e}");
        } else {
            let file_ts = timestamp.replace(':', "-").replace(' ', "_");
            let filename = format!("crash-{file_ts}.log");
            let path = dir.join(&filename);
            match fs::File::create(&path) {
                Ok(mut f) => {
                    let _ = f.write_all(report.as_bytes());
                    eprintln!("Crash report written to {}", path.display());
                }
                Err(e) => eprintln!("Failed to write crash report: {e}"),
            }
        }

        // Call the default hook so the process still aborts / prints as usual
        default_hook(info);
    }));
}

// ---------------------------------------------------------------------------
// IPC commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_crash_reports(app: AppHandle) -> Vec<CrashReport> {
    let dir = get_crash_reports_dir(&app);
    let mut reports = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.ends_with(".log") {
                continue;
            }
            let meta = entry.metadata().ok();
            let size_bytes = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            let timestamp = timestamp_from_filename(&name)
                .unwrap_or_else(|| "unknown".to_string());

            reports.push(CrashReport {
                name,
                timestamp,
                size_bytes,
            });
        }
    }

    // Most recent first
    reports.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    reports
}

#[tauri::command]
pub fn get_crash_report(app: AppHandle, name: String) -> Result<String, String> {
    let dir = get_crash_reports_dir(&app);
    let path = dir.join(&name);

    // Prevent directory traversal
    if !path.starts_with(&dir) {
        return Err("Invalid report name".into());
    }

    fs::read_to_string(&path).map_err(|e| format!("Failed to read crash report: {e}"))
}

#[tauri::command]
pub fn clear_crash_reports(app: AppHandle) -> Result<(), String> {
    let dir = get_crash_reports_dir(&app);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("Failed to clear crash reports: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn has_recent_crash(app: AppHandle) -> Option<CrashReport> {
    let reports = list_crash_reports(app);
    let report = reports.into_iter().next()?;

    // Check if the report is from the last 5 minutes
    let five_minutes_ago = now_epoch_secs() - 300;
    let report_epoch = epoch_from_iso(&report.timestamp)?;

    if report_epoch >= five_minutes_ago {
        Some(report)
    } else {
        None
    }
}

#[tauri::command]
pub fn log_frontend_error(
    app: AppHandle,
    message: String,
    stack: Option<String>,
    component_stack: Option<String>,
) -> Result<(), String> {
    let dir = get_crash_reports_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create crash-reports dir: {e}"))?;

    let timestamp = chrono_timestamp();
    let os_info = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);
    let app_version = env!("CARGO_PKG_VERSION");

    let mut report = format!(
        "=== FRONTEND ERROR REPORT ===\n\
         Timestamp : {timestamp}\n\
         App Version: {app_version}\n\
         OS         : {os_info}\n\
         \n\
         --- Error Message ---\n\
         {message}\n"
    );

    if let Some(st) = &stack {
        report.push_str(&format!("\n--- Stack Trace ---\n{st}\n"));
    }
    if let Some(cs) = &component_stack {
        report.push_str(&format!("\n--- Component Stack ---\n{cs}\n"));
    }

    let file_ts = timestamp.replace(':', "-").replace(' ', "_");
    let filename = format!("frontend-error-{file_ts}.log");
    let path = dir.join(&filename);

    fs::write(&path, report).map_err(|e| format!("Failed to write error report: {e}"))?;
    log::error!("Frontend error logged to {}", path.display());

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Simple ISO-ish timestamp without pulling in the `chrono` crate.
fn chrono_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();

    // Convert to date/time components (UTC)
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Simple days-since-epoch to date conversion
    let (year, month, day) = days_to_date(days);

    format!(
        "{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}Z"
    )
}

fn now_epoch_secs() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn epoch_from_iso(iso: &str) -> Option<u64> {
    // Parse "YYYY-MM-DDThh:mm:ssZ"
    let parts: Vec<&str> = iso.split('T').collect();
    if parts.len() != 2 {
        return None;
    }
    let date_parts: Vec<u64> = parts[0].split('-').filter_map(|s| s.parse().ok()).collect();
    let time_str = parts[1].trim_end_matches('Z');
    let time_parts: Vec<u64> = time_str.split(':').filter_map(|s| s.parse().ok()).collect();

    if date_parts.len() != 3 || time_parts.len() != 3 {
        return None;
    }

    let (year, month, day) = (date_parts[0], date_parts[1], date_parts[2]);
    let days = date_to_days(year, month, day);
    let secs = days * 86400 + time_parts[0] * 3600 + time_parts[1] * 60 + time_parts[2];
    Some(secs)
}

/// Extract a timestamp from a crash report filename like "crash-2025-01-15T10-30-00Z.log"
fn timestamp_from_filename(name: &str) -> Option<String> {
    // Strip prefix ("crash-" or "frontend-error-") and suffix (".log")
    let stem = name.strip_suffix(".log")?;
    let ts_part = if let Some(rest) = stem.strip_prefix("crash-") {
        rest
    } else if let Some(rest) = stem.strip_prefix("frontend-error-") {
        rest
    } else {
        return None;
    };

    // Reverse the filename encoding: underscores back to spaces, dashes in time back to colons
    // Format was: "2025-01-15T10-30-00Z" -> "2025-01-15T10:30:00Z"
    // The date dashes (positions 4,7) stay; the time dashes (after T) become colons.
    if let Some(t_pos) = ts_part.find('T') {
        let date_part = &ts_part[..t_pos];
        let time_part = &ts_part[t_pos + 1..];
        let time_fixed = time_part.replace('-', ":");
        Some(format!("{date_part}T{time_fixed}"))
    } else {
        Some(ts_part.to_string())
    }
}

fn days_to_date(mut days: u64) -> (u64, u64, u64) {
    // Algorithm from http://howardhinnant.github.io/date_algorithms.html
    days += 719468;
    let era = days / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    (year, m, d)
}

fn date_to_days(year: u64, month: u64, day: u64) -> u64 {
    let y = if month <= 2 { year - 1 } else { year };
    let m = if month <= 2 { month + 9 } else { month - 3 };
    let era = y / 400;
    let yoe = y - era * 400;
    let doy = (153 * m + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}
