import { applyBranding, setupCloseButton, setupEscapeToClose } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';
import changelog from '../changelog.json';

applyBranding();

// Render releases from changelog.json
const releasesEl = document.getElementById('releases');
const badgeClass = { new: 'badge-new', fix: 'badge-fix', improved: 'badge-improved' };

for (const release of changelog) {
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

// Mark as seen
ipc.getAppInfo().then((info) => {
  ipc.setSetting('app.lastSeenVersion', info.version);
}).catch(() => {});

// Close button + Escape
setupCloseButton('close-btn');
setupEscapeToClose();
