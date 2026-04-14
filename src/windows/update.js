import { applyBranding, closeWindow, branding } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

applyBranding({ showVersion: false });

const views = {
  checking: document.getElementById('checking'),
  upToDate: document.getElementById('up-to-date'),
  updateAvailable: document.getElementById('update-available'),
  errorState: document.getElementById('error-state'),
};

const footerBtns = {
  close: document.getElementById('close-btn'),
  skip: document.getElementById('skip-btn'),
  retry: document.getElementById('retry-btn'),
  install: document.getElementById('install-btn'),
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.classList.toggle('hidden', key !== name);
  }
  // Show/hide footer buttons per state
  footerBtns.close.classList.toggle('hidden', name === 'checking');
  footerBtns.skip.classList.toggle('hidden', name !== 'updateAvailable');
  footerBtns.retry.classList.toggle('hidden', name !== 'errorState');
  footerBtns.install.classList.toggle('hidden', name !== 'updateAvailable');
}

async function checkForUpdates() {
  showView('checking');

  try {
    const info = await ipc.checkForUpdates();

    if (info) {
      document.getElementById('update-title').textContent =
        `Version ${info.version} Available`;
      document.getElementById('update-message').textContent =
        `A new version of ${branding.name} is available.`;

      if (info.body) {
        const notesEl = document.getElementById('release-notes');
        notesEl.textContent = info.body;
        notesEl.classList.remove('hidden');
      }

      showView('updateAvailable');
    } else {
      const appInfo = await ipc.getAppInfo();
      document.getElementById('current-version').textContent =
        `${branding.name} v${appInfo.version} is the latest version.`;
      showView('upToDate');
    }
  } catch (e) {
    document.getElementById('error-message').textContent = String(e);
    showView('errorState');
  }
}

document.getElementById('install-btn')?.addEventListener('click', async () => {
  document.getElementById('install-btn').disabled = true;
  document.getElementById('install-btn').textContent = 'Installing...';
  try {
    await ipc.installUpdate();
  } catch (e) {
    document.getElementById('error-message').textContent = String(e);
    showView('errorState');
  }
});

document.getElementById('skip-btn')?.addEventListener('click', closeWindow);

document.getElementById('retry-btn')?.addEventListener('click', checkForUpdates);

document.getElementById('close-btn')?.addEventListener('click', closeWindow);

// Start check
checkForUpdates();
