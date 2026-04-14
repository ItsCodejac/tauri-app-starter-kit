import { applyBranding, closeWindow, branding } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

// Apply branding (accent color, logo, version)
applyBranding();
document.getElementById('welcome-title').textContent = `Welcome to ${branding.name}`;
document.getElementById('subtitle').textContent = branding.tagline;

// Get Started button
document.getElementById('get-started').addEventListener('click', () => {
  const dontShow = document.getElementById('dont-show').checked;
  if (dontShow) {
    ipc.setSetting('first_run', false).catch(() => {});
  }
  closeWindow();
});
