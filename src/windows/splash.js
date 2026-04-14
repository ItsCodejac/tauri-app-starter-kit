import { branding } from '../lib/branding.js';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// Apply branding
document.getElementById('name').textContent = branding.name;
document.getElementById('tagline').textContent = branding.tagline || '';
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
invoke('get_app_info').then((info) => {
  document.getElementById('version').textContent = `v${info.version}`;
}).catch(() => {});

// Listen for status updates from Rust initialization
listen('splash:status', (event) => {
  const status = document.getElementById('status');
  if (status && event.payload) {
    status.textContent = event.payload;
  }
});
