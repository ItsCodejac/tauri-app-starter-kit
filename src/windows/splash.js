import { applyBranding, setupCloseOnFocusLoss, listen } from '../lib/window-utils.js';

// Apply branding (accent color, logo, name, tagline, copyright, version, progress bar)
applyBranding();

// Listen for status updates from Rust initialization
listen('splash:status', (event) => {
  const status = document.getElementById('status');
  if (status && event.payload) {
    status.textContent = event.payload;
  }
});

// Decorationless windows close on focus loss
setupCloseOnFocusLoss();
