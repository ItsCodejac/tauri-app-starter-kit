import {
  applyBranding, closeWindow, setupEscapeToClose,
  setChecked, getChecked, setValue, getValue,
} from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

applyBranding({ showVersion: false });

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

  try {
    const info = await ipc.getAppInfo();
    setValue('cache-location', info.app_cache_dir || '(default)');
  } catch { /* ignore */ }
}

function applyToForm(s) {
  // General
  setValue('startup-behavior', s.startup_behavior ?? 'empty');
  setChecked('check-updates', s['updates.checkOnStartup'] ?? true);
  setChecked('autostart', s.autostart ?? false);
  setValue('locale', s.locale ?? 'en');

  // Appearance
  setValue('theme', s.theme ?? 'dark');
  setValue('zoom', String(s.view_zoom_level ?? 100));
  setValue('font-size', s.font_size ?? 'default');
  setChecked('show-statusbar', s.show_statusbar ?? true);
  setChecked('show-tooltips', s.show_tooltips ?? true);
  setChecked('reduce-motion', s.reduce_motion ?? false);
  setChecked('high-contrast', s.high_contrast ?? false);

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
    startup_behavior: getValue('startup-behavior'),
    'updates.checkOnStartup': getChecked('check-updates'),
    autostart: getChecked('autostart'),
    locale: getValue('locale'),
    theme: getValue('theme'),
    view_zoom_level: Number(getValue('zoom')),
    font_size: getValue('font-size'),
    show_statusbar: getChecked('show-statusbar'),
    show_tooltips: getChecked('show-tooltips'),
    reduce_motion: getChecked('reduce-motion'),
    high_contrast: getChecked('high-contrast'),
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
  closeWindow();
});

// Cancel: discard changes and close
document.getElementById('cancel-btn').addEventListener('click', () => {
  closeWindow();
});

// Browse for cache folder
document.getElementById('browse-cache')?.addEventListener('click', async () => {
  try {
    const result = await ipc.showOpenDialog({ title: 'Select Cache Folder' });
    if (result && result[0]) {
      setValue('cache-location', result[0]);
    }
  } catch (e) {
    console.error('Folder picker error:', e);
  }
});

// Clear cache
document.getElementById('clear-cache')?.addEventListener('click', async () => {
  try {
    await ipc.setSetting('cache.cleared', true);
    const btn = document.getElementById('clear-cache');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Done';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
  } catch (e) {
    console.error('Clear cache error:', e);
  }
});

// --- Escape to close (same as Cancel) ---
setupEscapeToClose();

// --- Arrow key navigation in sidebar ---
sidebar.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = [...sidebar.querySelectorAll('.sidebar-item')];
    const activeIndex = items.findIndex(i => i.classList.contains('active'));
    const nextIndex = e.key === 'ArrowDown'
      ? Math.min(activeIndex + 1, items.length - 1)
      : Math.max(activeIndex - 1, 0);
    items[nextIndex].click();
    items[nextIndex].focus();
  }
});

// --- Init ---
loadSettings().then(() => {
  document.querySelector('.sidebar-item.active')?.focus();
});
