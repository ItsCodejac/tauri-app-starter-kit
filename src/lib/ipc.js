/**
 * IPC Facade (vanilla JS)
 *
 * Every backend command is wrapped here so that frontend code never calls
 * invoke() directly. This gives a single place to update command names,
 * argument shapes, and return types.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ---------------------------------------------------------------------------
// IPC commands
// ---------------------------------------------------------------------------

export const ipc = {
  // -- Settings -------------------------------------------------------------
  getSetting: (key) => invoke('get_setting', { key }),
  setSetting: (key, value) => invoke('set_setting', { key, value }),
  getAllSettings: () => invoke('get_all_settings'),
  resetSettings: () => invoke('reset_settings'),

  // -- Recent files ---------------------------------------------------------
  getRecentFiles: () => invoke('get_recent_files'),
  addRecentFile: (path) => invoke('add_recent_file', { path }),
  clearRecentFiles: () => invoke('clear_recent_files'),

  // -- Autosave / recovery --------------------------------------------------
  startAutosave: (intervalSecs) => invoke('start_autosave', { intervalSecs }),
  stopAutosave: () => invoke('stop_autosave'),
  updateAutosaveState: (data) => invoke('update_autosave_state', { data }),
  checkRecovery: () => invoke('check_recovery'),

  // -- Dialogs --------------------------------------------------------------
  showOpenDialog: (opts) =>
    invoke('show_open_dialog', {
      title: opts?.title ?? null,
      filters: opts?.filters ?? null,
      multiple: opts?.multiple ?? null,
    }),

  showSaveDialog: (opts) =>
    invoke('show_save_dialog', {
      title: opts?.title ?? null,
      defaultName: opts?.defaultName ?? null,
      filters: opts?.filters ?? null,
    }),

  // -- General commands -----------------------------------------------------
  getAppInfo: () => invoke('get_app_info'),
  openExternalUrl: (url) => invoke('open_external_url', { url }),
  openDocs: () => invoke('open_docs'),

  // -- Window management ----------------------------------------------------
  openWindow: (name) => invoke('open_window', { name }),

  // -- Quit confirmation ----------------------------------------------------
  setHasUnsavedChanges: (dirty) => invoke('set_has_unsaved_changes', { dirty }),
  confirmClose: () => invoke('confirm_close'),

  // -- Dynamic menu state ---------------------------------------------------
  menuSetEnabled: (id, enabled) => invoke('menu_set_enabled', { id, enabled }),
  menuSetChecked: (id, checked) => invoke('menu_set_checked', { id, checked }),
  menuSetLabel: (id, label) => invoke('menu_set_label', { id, label }),

  // -- Crash reporting ------------------------------------------------------
  hasRecentCrash: () => invoke('has_recent_crash'),
  listCrashReports: () => invoke('list_crash_reports'),
  getCrashReport: (name) => invoke('get_crash_report', { name }),
  clearCrashReports: () => invoke('clear_crash_reports'),
  logFrontendError: (message, stack, componentStack) =>
    invoke('log_frontend_error', {
      message,
      stack: stack ?? null,
      componentStack: componentStack ?? null,
    }),

  // -- Diagnostics -----------------------------------------------------------
  collectDiagnostics: () => invoke('collect_diagnostics'),
  collectDiagnosticsString: () => invoke('collect_diagnostics_string'),

  // -- Notifications ---------------------------------------------------------
  sendNotification: (title, body, icon) =>
    invoke('send_notification', {
      title,
      body,
      icon: icon ?? null,
    }),

  // -- Log viewer -------------------------------------------------------------
  getLogContents: () => invoke('get_log_contents'),

  // -- Updater ---------------------------------------------------------------
  checkForUpdates: () => invoke('check_for_updates'),
  installUpdate: () => invoke('install_update'),
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

export const events = {
  /** Listen for a menu event emitted by the Rust menu handler. */
  onMenuEvent: (event, handler) => listen(event, handler),

  /** Autosave completed successfully. */
  onAutosaveSaved: (handler) => listen('autosave:saved', handler),

  /** Recovery data is available from a previous crash. */
  onRecoveryAvailable: (handler) =>
    listen('autosave:recovery-available', (e) => handler(e.payload)),

  /** The backend requests the window to close (quit confirmation flow). */
  onCloseRequested: (handler) => listen('window:close-requested', handler),
};
