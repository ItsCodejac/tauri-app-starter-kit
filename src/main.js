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

events.onMenuEvent('menu:file:new', () => console.log('[menu] New'));
events.onMenuEvent('menu:file:open', () => console.log('[menu] Open'));
events.onMenuEvent('menu:file:save', () => console.log('[menu] Save'));
events.onMenuEvent('menu:file:save-as', () => console.log('[menu] Save As'));
events.onMenuEvent('menu:edit:find', () => console.log('[menu] Find'));
events.onMenuEvent('menu:edit:find-replace', () => console.log('[menu] Find & Replace'));

// ---------------------------------------------------------------------------
// Close confirmation
// ---------------------------------------------------------------------------

events.onCloseRequested(() => {
  // Show your own confirmation UI, then call ipc.confirmClose() to proceed.
  const confirmed = window.confirm('You have unsaved changes. Close anyway?');
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
      console.log('Welcome window not available');
    });
  }
}).catch(() => {});

// ---------------------------------------------------------------------------
// Recovery check
// ---------------------------------------------------------------------------

events.onRecoveryAvailable((info) => {
  console.log('Recovery data available from previous session:', info);
  // Show recovery UI to the user
});
