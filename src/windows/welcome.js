import { ipc } from '../lib/ipc.js';
import { branding } from '../lib/branding.js';

document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

// Apply branding
document.getElementById('welcome-title').textContent = `Welcome to ${branding.name}`;
document.getElementById('subtitle').textContent = branding.tagline;

if (branding.logo) {
  document.getElementById('logo').innerHTML =
    `<img src="${branding.logo}" width="56" height="56" alt="" />`;
} else {
  document.getElementById('logo').textContent = branding.name.charAt(0);
}
document.querySelector('.logo').style.background = branding.accentColor;

// Get Started button
document.getElementById('get-started').addEventListener('click', () => {
  const dontShow = document.getElementById('dont-show').checked;
  if (dontShow) {
    ipc.setSetting('first_run', false).catch(() => {});
  }
  window.close();
});
