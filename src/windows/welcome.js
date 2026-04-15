import { applyBranding, closeWindow, setupEscapeToClose, branding } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

// Apply branding (accent color, logo, version)
applyBranding();
document.getElementById('welcome-title').textContent = `Welcome to ${branding.name}`;
document.getElementById('subtitle').textContent = branding.tagline;

// Escape to close
setupEscapeToClose();

// Feature cards open their respective windows
document.querySelectorAll('.feature[data-window]').forEach(card => {
  card.addEventListener('click', () => {
    ipc.openWindow(card.dataset.window);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ipc.openWindow(card.dataset.window);
    }
  });
});

// Get Started button
document.getElementById('get-started').addEventListener('click', () => {
  const dontShow = document.getElementById('dont-show').checked;
  if (dontShow) {
    ipc.setSetting('first_run', false).catch(() => {});
  }
  closeWindow();
});
