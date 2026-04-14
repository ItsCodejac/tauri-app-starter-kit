import { applyBranding, showButtonFeedback, branding, invoke } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

// Apply branding (accent color, logo, name, tagline, copyright, license, version)
applyBranding();

// Build links
const linksEl = document.getElementById('links');
if (branding.website) {
  const a = document.createElement('a');
  a.textContent = 'Website';
  a.href = '#';
  a.addEventListener('click', (e) => { e.preventDefault(); invoke('open_external_url', { url: branding.website }); });
  linksEl.appendChild(a);
}
if (branding.github) {
  const a = document.createElement('a');
  a.textContent = 'GitHub';
  a.href = '#';
  a.addEventListener('click', (e) => { e.preventDefault(); invoke('open_external_url', { url: branding.github }); });
  linksEl.appendChild(a);
}

// Copy diagnostics
document.getElementById('diagnostics').addEventListener('click', async () => {
  try {
    const text = await ipc.collectDiagnosticsString();
    await navigator.clipboard.writeText(text);
    showButtonFeedback('diagnostics', 'Copied!', 2000);
  } catch (e) {
    console.error('Failed to copy diagnostics:', e);
  }
});
