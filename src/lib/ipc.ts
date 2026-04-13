/**
 * Typed IPC Facade
 *
 * Every backend command is wrapped here so that components never call
 * `invoke()` directly. This gives us a single place to update command
 * names, argument shapes, and return types.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { enable as enableAutostart, disable as disableAutostart, isEnabled as isAutostartEnabled } from '@tauri-apps/plugin-autostart';
import { writeText as clipboardWriteText } from '@tauri-apps/plugin-clipboard-manager';
import { relaunch, exit } from '@tauri-apps/plugin-process';
import { getPassword, setPassword, deletePassword } from 'tauri-plugin-keyring-api';

// ---------------------------------------------------------------------------
// Types mirroring Rust structs
// ---------------------------------------------------------------------------

export interface DialogFilter {
  name: string;
  extensions: string[];
}

export interface AppInfo {
  name: string;
  version: string;
  app_data_dir: string;
  app_config_dir: string;
  app_cache_dir: string;
}

export interface RecoveryInfo {
  has_recovery: boolean;
  timestamp: string | null;
  data: unknown | null;
}

export interface CrashReport {
  name: string;
  timestamp: string;
  size_bytes: number;
}

export interface CrashReportSummary {
  name: string;
  timestamp: string;
}

export interface DiagnosticsReport {
  app_name: string;
  app_version: string;
  os_name: string;
  os_version: string;
  os_arch: string;
  rust_version: string;
  tauri_version: string;
  settings: Record<string, unknown>;
  recent_crash_reports: CrashReportSummary[];
  memory_usage_bytes: number | null;
  uptime_secs: number;
}

// ---------------------------------------------------------------------------
// IPC commands
// ---------------------------------------------------------------------------

export const ipc = {
  // -- Settings -------------------------------------------------------------
  getSetting: (key: string) =>
    invoke<unknown>('get_setting', { key }),

  setSetting: (key: string, value: unknown) =>
    invoke<void>('set_setting', { key, value }),

  getAllSettings: () =>
    invoke<Record<string, unknown>>('get_all_settings'),

  resetSettings: () =>
    invoke<void>('reset_settings'),

  // -- Recent files ---------------------------------------------------------
  getRecentFiles: () =>
    invoke<string[]>('get_recent_files'),

  addRecentFile: (path: string) =>
    invoke<string[]>('add_recent_file', { path }),

  clearRecentFiles: () =>
    invoke<void>('clear_recent_files'),

  // -- Autosave / recovery --------------------------------------------------
  startAutosave: (intervalSecs?: number) =>
    invoke<void>('start_autosave', { intervalSecs }),

  stopAutosave: () =>
    invoke<void>('stop_autosave'),

  updateAutosaveState: (data: string) =>
    invoke<void>('update_autosave_state', { data }),

  checkRecovery: () =>
    invoke<RecoveryInfo>('check_recovery'),

  // -- Dialogs --------------------------------------------------------------
  showOpenDialog: (opts?: {
    title?: string;
    filters?: DialogFilter[];
    multiple?: boolean;
  }) =>
    invoke<string[] | null>('show_open_dialog', {
      title: opts?.title ?? null,
      filters: opts?.filters ?? null,
      multiple: opts?.multiple ?? null,
    }),

  showSaveDialog: (opts?: {
    title?: string;
    defaultName?: string;
    filters?: DialogFilter[];
  }) =>
    invoke<string | null>('show_save_dialog', {
      title: opts?.title ?? null,
      defaultName: opts?.defaultName ?? null,
      filters: opts?.filters ?? null,
    }),

  // -- General commands -----------------------------------------------------
  getAppInfo: () =>
    invoke<AppInfo>('get_app_info'),

  openExternalUrl: (url: string) =>
    invoke<void>('open_external_url', { url }),

  openDocs: () =>
    invoke<void>('open_docs'),

  // -- Quit confirmation ----------------------------------------------------
  setHasUnsavedChanges: (dirty: boolean) =>
    invoke<void>('set_has_unsaved_changes', { dirty }),

  confirmClose: () =>
    invoke<void>('confirm_close'),

  // -- Dynamic menu state ---------------------------------------------------
  menuSetEnabled: (id: string, enabled: boolean) =>
    invoke<void>('menu_set_enabled', { id, enabled }),

  menuSetChecked: (id: string, checked: boolean) =>
    invoke<void>('menu_set_checked', { id, checked }),

  menuSetLabel: (id: string, label: string) =>
    invoke<void>('menu_set_label', { id, label }),

  // -- Crash reporting ------------------------------------------------------
  hasRecentCrash: () =>
    invoke<CrashReport | null>('has_recent_crash'),

  listCrashReports: () =>
    invoke<CrashReport[]>('list_crash_reports'),

  getCrashReport: (name: string) =>
    invoke<string>('get_crash_report', { name }),

  clearCrashReports: () =>
    invoke<void>('clear_crash_reports'),

  logFrontendError: (message: string, stack?: string, componentStack?: string) =>
    invoke<void>('log_frontend_error', {
      message,
      stack: stack ?? null,
      componentStack: componentStack ?? null,
    }),

  // -- Diagnostics -----------------------------------------------------------
  collectDiagnostics: () =>
    invoke<DiagnosticsReport>('collect_diagnostics'),

  collectDiagnosticsString: () =>
    invoke<string>('collect_diagnostics_string'),

  // -- Notifications ---------------------------------------------------------
  sendNotification: (title: string, body: string, icon?: string) =>
    invoke<void>('send_notification', {
      title,
      body,
      icon: icon ?? null,
    }),

  // -- Log viewer -------------------------------------------------------------
  getLogContents: () =>
    invoke<string>('get_log_contents'),

  // -- Updater ---------------------------------------------------------------
  checkForUpdates: () =>
    invoke<{ version: string; body: string | null; date: string | null } | null>('check_for_updates'),

  installUpdate: () =>
    invoke<void>('install_update'),

  // -- Autostart (plugin) ----------------------------------------------------
  autostartEnable: () => enableAutostart(),
  autostartDisable: () => disableAutostart(),
  autostartIsEnabled: () => isAutostartEnabled(),

  // -- Clipboard (plugin) ----------------------------------------------------
  clipboardWriteText: (text: string) => clipboardWriteText(text),

  // -- Process (plugin) ------------------------------------------------------
  relaunch: () => relaunch(),
  exit: (code?: number) => exit(code ?? 0),

  // -- Keyring (plugin) -- secure secret storage ----------------------------
  /** Store a secret in the OS keychain. */
  keyringSet: (service: string, key: string, value: string) =>
    setPassword(service, key, value),

  /** Retrieve a secret from the OS keychain. Returns null if not found. */
  keyringGet: (service: string, key: string) =>
    getPassword(service, key),

  /** Remove a secret from the OS keychain. */
  keyringDelete: (service: string, key: string) =>
    deletePassword(service, key),

  /** Check whether a secret exists in the OS keychain. */
  keyringHas: async (service: string, key: string): Promise<boolean> => {
    const value = await getPassword(service, key);
    return value !== null;
  },
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

export const events = {
  /** Listen for a menu event emitted by the Rust menu handler. */
  onMenuEvent: (event: string, handler: () => void): Promise<UnlistenFn> =>
    listen(event, handler),

  /** Autosave completed successfully. */
  onAutosaveSaved: (handler: () => void): Promise<UnlistenFn> =>
    listen('autosave:saved', handler),

  /** Recovery data is available from a previous crash. */
  onRecoveryAvailable: (handler: (info: RecoveryInfo) => void): Promise<UnlistenFn> =>
    listen<RecoveryInfo>('autosave:recovery-available', (e) => handler(e.payload)),

  /** The backend requests the window to close (quit confirmation flow). */
  onCloseRequested: (handler: () => void): Promise<UnlistenFn> =>
    listen('window:close-requested', handler),
};
