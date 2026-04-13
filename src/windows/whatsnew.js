import { ipc } from '../lib/ipc.js';
import { branding } from '../lib/branding.js';

document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

document.getElementById('icon').textContent = branding.name.charAt(0);
document.getElementById('icon').style.background = branding.accentColor;

/**
 * Changelog entries. Edit this list when you ship a new version.
 * Each entry has a version, date, and an array of changes.
 * Change types: "new", "fix", "improved"
 */
const changelog = [
  {
    version: '0.1.0',
    date: 'Initial release',
    changes: [
      { type: 'new', text: 'App starter template with dark theme' },
      { type: 'new', text: 'Settings persistence via Tauri Store' },
      { type: 'new', text: 'Native menus with IPC event forwarding' },
      { type: 'new', text: 'Utility windows (splash, settings, about, logs)' },
      { type: 'new', text: 'Crash reporting and diagnostics' },
    ],
  },
];

// Render releases
const releasesEl = document.getElementById('releases');

for (const release of changelog) {
  const badgeClass = { new: 'badge-new', fix: 'badge-fix', improved: 'badge-improved' };
  const changesHtml = release.changes
    .map((c) => {
      const badge = `<span class="badge ${badgeClass[c.type] || ''}">${c.type}</span>`;
      return `<li>${badge} ${c.text}</li>`;
    })
    .join('');

  releasesEl.innerHTML += `
    <div class="release">
      <div class="release-version">v${release.version}</div>
      <div class="release-date">${release.date}</div>
      <div class="release-body"><ul>${changesHtml}</ul></div>
    </div>`;
}

// Version display
ipc.getAppInfo().then((info) => {
  document.getElementById('version').textContent = `v${info.version}`;
}).catch(() => {});

// Mark as seen
ipc.getAppInfo().then((info) => {
  ipc.setSetting('app.lastSeenVersion', info.version);
}).catch(() => {});

document.getElementById('close-btn').addEventListener('click', () => {
  window.close();
});
