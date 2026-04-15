/**
 * Shared window utilities for all utility windows.
 * Every window imports from here instead of duplicating patterns.
 */

const { getCurrentWindow } = window.__TAURI__.window;
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
import { branding } from './branding.js';

// ---------------------------------------------------------------------------
// Window management
// ---------------------------------------------------------------------------

/** Close the current window. */
export function closeWindow() {
  getCurrentWindow().close();
}

/** Wire a button to close the current window. */
export function setupCloseButton(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.addEventListener('click', closeWindow);
}

/** Close window when it loses focus (for decorationless windows like splash). */
export function setupCloseOnFocusLoss() {
  getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (!focused) closeWindow();
  });
}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

/** Apply branding to the current window: accent color, logo, name, version, etc. */
export function applyBranding(options = {}) {
  // Accent color CSS variable
  document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

  // Name
  const nameEl = document.getElementById('name');
  if (nameEl) nameEl.textContent = branding.name;

  // Tagline
  const taglineEl = document.getElementById('tagline');
  if (taglineEl) taglineEl.textContent = branding.tagline || '';

  // Copyright
  const copyrightEl = document.getElementById('copyright');
  if (copyrightEl) copyrightEl.textContent = branding.copyright;

  // License info
  const licenseEl = document.getElementById('license');
  if (licenseEl) licenseEl.textContent = branding.licenseInfo || '';

  // Logo (image or first-letter fallback)
  const logoEl = document.getElementById('logo');
  if (logoEl) {
    if (branding.logo) {
      logoEl.innerHTML = `<img src="${branding.logo}" width="48" height="48" alt="" />`;
    } else {
      logoEl.textContent = branding.name.charAt(0);
    }
  }

  // Logo accent color
  const logoContainer = document.querySelector('.logo');
  if (logoContainer) logoContainer.style.background = branding.accentColor;

  // Progress bar accent color
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) progressBar.style.background = branding.accentColor;

  // Icon (smaller variant used in some windows)
  const iconEl = document.getElementById('icon');
  if (iconEl) {
    iconEl.textContent = branding.name.charAt(0);
    iconEl.style.background = branding.accentColor;
  }

  // Version (async -- loads from backend)
  if (options.showVersion !== false) {
    const versionEl = document.getElementById('version');
    if (versionEl) {
      invoke('get_app_info').then((info) => {
        versionEl.textContent = `v${info.version}`;
      }).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/**
 * Temporarily change a button's text to show feedback, then revert.
 * e.g. showButtonFeedback('copy-btn', 'Copied!', 2000)
 */
export function showButtonFeedback(elementId, feedbackText, durationMs = 2000) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const original = el.textContent;
  el.textContent = feedbackText;
  setTimeout(() => { el.textContent = original; }, durationMs);
}

/** Create a click handler that opens a URL in the external browser. */
export function setupExternalLink(elementId, url) {
  const el = document.getElementById(elementId);
  if (el && url) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      invoke('open_external_url', { url });
    });
  }
}

// ---------------------------------------------------------------------------
// IPC (re-export common patterns)
// ---------------------------------------------------------------------------

export { invoke, listen, branding };

// ---------------------------------------------------------------------------
// Escape to close
// ---------------------------------------------------------------------------

/** Set up Escape key to close the current window.
 *  Call with optional callback for windows that need custom behavior (like settings Cancel). */
export function setupEscapeToClose(beforeClose) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (beforeClose) {
        beforeClose();
      } else {
        closeWindow();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Prevent file drops from navigating the webview
// ---------------------------------------------------------------------------

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

export function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
export function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}
export function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
export function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
