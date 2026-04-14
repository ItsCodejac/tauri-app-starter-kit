/**
 * Main window entry point.
 *
 * This file sets up branding, listens for menu events, and checks
 * for first-run. Wire these hooks into your chosen framework.
 */

import { ipc, events } from './lib/ipc.js';
import { branding } from './lib/branding.js';

// Apply branding accent color to CSS custom property
document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

// ---------------------------------------------------------------------------
// Menu event listeners
// Wire these to your framework's handlers as needed.
// ---------------------------------------------------------------------------

events.onMenuEvent('menu:file:new', () => console.debug('[menu] New'));
events.onMenuEvent('menu:file:open', () => console.debug('[menu] Open'));
events.onMenuEvent('menu:file:save', () => console.debug('[menu] Save'));
events.onMenuEvent('menu:file:save-as', () => console.debug('[menu] Save As'));
events.onMenuEvent('menu:edit:find', () => console.debug('[menu] Find'));
events.onMenuEvent('menu:edit:find-replace', () => console.debug('[menu] Find & Replace'));

// ---------------------------------------------------------------------------
// Close confirmation
// ---------------------------------------------------------------------------

events.onCloseRequested(async () => {
  // The Rust CloseRequested handler emits this event when dirty state is true.
  // Use a native dialog via Tauri's dialog plugin (invoke directly to avoid
  // an extra JS package dependency).
  const { invoke } = await import('@tauri-apps/api/core');
  const confirmed = await invoke('plugin:dialog|ask', {
    message: 'You have unsaved changes. Close anyway?',
    title: 'Unsaved Changes',
    kind: 'warning',
  });
  if (confirmed) {
    ipc.confirmClose();
  }
});

// ---------------------------------------------------------------------------
// First run check
// ---------------------------------------------------------------------------

ipc.getSetting('first_run').then((val) => {
  if (val === true) {
    ipc.openWindow('welcome').catch(() => {
      console.debug('Welcome window not available');
    });
  }
}).catch(() => {});

// ---------------------------------------------------------------------------
// Recovery check
// ---------------------------------------------------------------------------

events.onRecoveryAvailable((info) => {
  console.debug('Recovery data available from previous session:', info);
  // Show recovery UI to the user
});

// ---------------------------------------------------------------------------
// Help: Report Issue
// ---------------------------------------------------------------------------

events.onMenuEvent('menu:help:report-issue', async () => {
  try {
    const text = await ipc.collectDiagnosticsString();
    await navigator.clipboard.writeText(text);
    if (branding.github) {
      const issueUrl = branding.github.replace(/\/$/, '') + '/issues/new';
      ipc.openExternalUrl(issueUrl);
    }
  } catch (e) {
    console.debug('Report issue failed:', e);
  }
});
