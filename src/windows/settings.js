import { ipc } from '../lib/ipc.js';
import { branding } from '../lib/branding.js';

document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

// Element references
const els = {
  autostart: document.getElementById('autostart'),
  updatesCheck: document.getElementById('updates-check'),
  theme: document.getElementById('theme'),
  zoom: document.getElementById('zoom'),
  autosaveEnabled: document.getElementById('autosave-enabled'),
  autosaveInterval: document.getElementById('autosave-interval'),
  minimizeToTray: document.getElementById('minimize-to-tray'),
  resetBtn: document.getElementById('reset-btn'),
};

// Load current settings
async function loadSettings() {
  try {
    const settings = await ipc.getAllSettings();
    els.autostart.checked = settings.autostart ?? false;
    els.updatesCheck.checked = settings['updates.checkOnStartup'] ?? true;
    els.theme.value = settings.theme ?? 'dark';
    els.zoom.value = String(settings.view_zoom_level ?? 100);
    els.autosaveEnabled.checked = settings.autosave_enabled ?? true;
    els.autosaveInterval.value = String(settings.autosave_interval_secs ?? 60);
    els.minimizeToTray.checked = settings['tray.minimize_to_tray'] ?? false;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

// Save a single setting
function save(key, value) {
  ipc.setSetting(key, value).catch((e) => {
    console.error(`Failed to save ${key}:`, e);
  });
}

// Wire up change handlers
els.autostart.addEventListener('change', () => save('autostart', els.autostart.checked));
els.updatesCheck.addEventListener('change', () => save('updates.checkOnStartup', els.updatesCheck.checked));
els.theme.addEventListener('change', () => save('theme', els.theme.value));
els.zoom.addEventListener('change', () => save('view_zoom_level', Number(els.zoom.value)));
els.autosaveEnabled.addEventListener('change', () => save('autosave_enabled', els.autosaveEnabled.checked));
els.autosaveInterval.addEventListener('change', () => save('autosave_interval_secs', Number(els.autosaveInterval.value)));
els.minimizeToTray.addEventListener('change', () => save('tray.minimize_to_tray', els.minimizeToTray.checked));

els.resetBtn.addEventListener('click', async () => {
  if (confirm('Reset all settings to defaults?')) {
    await ipc.resetSettings();
    await loadSettings();
  }
});

// Initial load
loadSettings();
