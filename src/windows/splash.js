import { branding } from '../lib/branding.js';
import { ipc, events } from '../lib/ipc.js';

// Apply branding
document.getElementById('name').textContent = branding.name;
document.getElementById('tagline').textContent = branding.tagline;
document.getElementById('copyright').textContent = branding.copyright;

if (branding.logo) {
  document.getElementById('logo').innerHTML =
    `<img src="${branding.logo}" width="48" height="48" alt="" />`;
} else {
  document.getElementById('logo').textContent = branding.name.charAt(0);
}

document.querySelector('.logo').style.background = branding.accentColor;
document.getElementById('progress-bar').style.background = branding.accentColor;

// Get version from backend
ipc.getAppInfo().then((info) => {
  document.getElementById('version').textContent = `v${info.version}`;
}).catch(() => {});

// Listen for status updates
events.onMenuEvent('splash:status', (event) => {
  document.getElementById('status').textContent = event.payload;
});
