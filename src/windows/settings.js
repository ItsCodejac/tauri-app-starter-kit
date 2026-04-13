import { ipc } from '../lib/ipc.js';
import { branding } from '../lib/branding.js';

document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

// --- Sidebar navigation ---
const sidebar = document.getElementById('sidebar');
const panes = document.querySelectorAll('.pane');

sidebar.addEventListener('click', (e) => {
  const btn = e.target.closest('.sidebar-item');
  if (!btn) return;
  const paneId = btn.dataset.pane;

  sidebar.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  panes.forEach(p => p.classList.toggle('active', p.id === `pane-${paneId}`));
});

// --- Settings state ---
// We load settings into a local copy, let the user edit freely,
// then apply on OK (Premiere pattern: changes aren't live until OK).
let original = {};
let current = {};

async function loadSettings() {
  try {
    const settings = await ipc.getAllSettings();
    original = { ...settings };
    current = { ...settings };
    applyToForm(current);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }

  // Also load app info for cache path
  try {
    const info = await ipc.getAppInfo();
    document.getElementById('cache-location').value = info.app_cache_dir || '(default)';
  } catch { /* ignore */ }
}

function applyToForm(s) {
  // General
  setChecked('check-updates', s['updates.checkOnStartup'] ?? true);
  setChecked('autostart', s.autostart ?? false);
  setValue('locale', s.locale ?? 'en');

  // Appearance
  setValue('theme', s.theme ?? 'dark');
  setValue('zoom', String(s.view_zoom_level ?? 100));
  setChecked('show-statusbar', s.show_statusbar ?? true);
  setChecked('show-tooltips', s.show_tooltips ?? true);

  // Autosave
  setChecked('autosave-enabled', s.autosave_enabled ?? true);
  setValue('autosave-interval', String(s.autosave_interval_secs ?? 60));

  // Performance
  setValue('perf-mode', s['performance.mode'] ?? 'balanced');
  setChecked('hw-accel', s['performance.hardwareAcceleration'] ?? true);
  setChecked('gpu-enabled', s['performance.gpuEnabled'] ?? true);

  // Cache
  setValue('cache-max', String(s['cache.maxCacheSize'] ?? 10));
  setChecked('cleanup-cache', s['cache.cleanupOldCache'] ?? true);

  // Tray
  setChecked('minimize-to-tray', s['tray.minimize_to_tray'] ?? false);
  setChecked('show-tray-icon', s['tray.show_icon'] ?? true);
}

function readFromForm() {
  return {
    ...current,
    'updates.checkOnStartup': getChecked('check-updates'),
    autostart: getChecked('autostart'),
    locale: getValue('locale'),
    theme: getValue('theme'),
    view_zoom_level: Number(getValue('zoom')),
    show_statusbar: getChecked('show-statusbar'),
    show_tooltips: getChecked('show-tooltips'),
    autosave_enabled: getChecked('autosave-enabled'),
    autosave_interval_secs: Number(getValue('autosave-interval')),
    'performance.mode': getValue('perf-mode'),
    'performance.hardwareAcceleration': getChecked('hw-accel'),
    'performance.gpuEnabled': getChecked('gpu-enabled'),
    'cache.maxCacheSize': Number(getValue('cache-max')),
    'cache.cleanupOldCache': getChecked('cleanup-cache'),
    'tray.minimize_to_tray': getChecked('minimize-to-tray'),
    'tray.show_icon': getChecked('show-tray-icon'),
  };
}

// --- DOM helpers ---
function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}
function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// --- Footer buttons ---

// OK: save all changes and close window
document.getElementById('ok-btn').addEventListener('click', async () => {
  const values = readFromForm();
  const promises = [];
  for (const [key, val] of Object.entries(values)) {
    if (val !== original[key]) {
      promises.push(ipc.setSetting(key, val));
    }
  }
  await Promise.all(promises).catch(e => console.error('Save error:', e));

  // Close the settings window
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().close();
});

// Cancel: discard changes and close
document.getElementById('cancel-btn').addEventListener('click', async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().close();
});

// Reset: restore defaults
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (confirm('Reset all settings to defaults? This will take effect after clicking OK.')) {
    await ipc.resetSettings();
    await loadSettings();
  }
});

// Help: open docs
document.getElementById('help-btn').addEventListener('click', () => {
  ipc.openDocs().catch(() => {});
});

// Clear cache
document.getElementById('clear-cache')?.addEventListener('click', () => {
  // Developer wires this to their actual cache clearing logic
  alert('Cache cleared.');
});

// --- Init ---
loadSettings();
