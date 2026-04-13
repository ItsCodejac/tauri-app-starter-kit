import { branding } from '../lib/branding.js';
import { ipc } from '../lib/ipc.js';

// Apply branding
document.getElementById('name').textContent = branding.name;
document.getElementById('tagline').textContent = branding.tagline;
document.getElementById('copyright').textContent = branding.copyright;
document.getElementById('license').textContent = branding.licenseInfo;

if (branding.logo) {
  document.getElementById('logo').innerHTML =
    `<img src="${branding.logo}" width="48" height="48" alt="" />`;
} else {
  document.getElementById('logo').textContent = branding.name.charAt(0);
}
document.querySelector('.logo').style.background = branding.accentColor;

// Build links
const linksEl = document.getElementById('links');
if (branding.website) {
  const a = document.createElement('a');
  a.textContent = 'Website';
  a.href = '#';
  a.addEventListener('click', (e) => { e.preventDefault(); ipc.openExternalUrl(branding.website); });
  linksEl.appendChild(a);
}
if (branding.github) {
  const a = document.createElement('a');
  a.textContent = 'GitHub';
  a.href = '#';
  a.addEventListener('click', (e) => { e.preventDefault(); ipc.openExternalUrl(branding.github); });
  linksEl.appendChild(a);
}

// Version
ipc.getAppInfo().then((info) => {
  document.getElementById('version').textContent = `v${info.version}`;
}).catch(() => {});

// Copy diagnostics
document.getElementById('diagnostics').addEventListener('click', async () => {
  try {
    const text = await ipc.collectDiagnosticsString();
    await navigator.clipboard.writeText(text);
    document.getElementById('diagnostics').textContent = 'Copied!';
    setTimeout(() => {
      document.getElementById('diagnostics').textContent = 'Copy Diagnostics';
    }, 2000);
  } catch (e) {
    console.error('Failed to copy diagnostics:', e);
  }
});
