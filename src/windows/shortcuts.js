import { branding } from '../lib/branding.js';

document.documentElement.style.setProperty('--accent-blue', branding.accentColor);

/**
 * Shortcut definitions grouped by category.
 * Edit this list to match your app's shortcuts.
 * The `keys` array is displayed as individual <kbd> elements.
 */
const shortcutGroups = [
  {
    title: 'File',
    shortcuts: [
      { action: 'New', keys: ['\u2318', 'N'] },
      { action: 'Open', keys: ['\u2318', 'O'] },
      { action: 'Save', keys: ['\u2318', 'S'] },
      { action: 'Save As', keys: ['\u2318', '\u21E7', 'S'] },
      { action: 'Close Window', keys: ['\u2318', 'W'] },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { action: 'Undo', keys: ['\u2318', 'Z'] },
      { action: 'Redo', keys: ['\u2318', '\u21E7', 'Z'] },
      { action: 'Cut', keys: ['\u2318', 'X'] },
      { action: 'Copy', keys: ['\u2318', 'C'] },
      { action: 'Paste', keys: ['\u2318', 'V'] },
      { action: 'Select All', keys: ['\u2318', 'A'] },
      { action: 'Find', keys: ['\u2318', 'F'] },
      { action: 'Find & Replace', keys: ['\u2318', '\u21E7', 'F'] },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { action: 'Toggle Fullscreen', keys: ['\u2303', '\u2318', 'F'] },
      { action: 'Zoom In', keys: ['\u2318', '+'] },
      { action: 'Zoom Out', keys: ['\u2318', '-'] },
      { action: 'Actual Size', keys: ['\u2318', '0'] },
    ],
  },
  {
    title: 'App',
    shortcuts: [
      { action: 'Settings', keys: ['\u2318', ','] },
      { action: 'Quit', keys: ['\u2318', 'Q'] },
    ],
  },
];

const listEl = document.getElementById('shortcuts-list');
const searchEl = document.getElementById('search');

function render(filter = '') {
  const lowerFilter = filter.toLowerCase();
  let html = '';
  let hasResults = false;

  for (const group of shortcutGroups) {
    const filtered = group.shortcuts.filter((s) =>
      s.action.toLowerCase().includes(lowerFilter) ||
      s.keys.join(' ').toLowerCase().includes(lowerFilter)
    );
    if (filtered.length === 0) continue;
    hasResults = true;

    html += `<div class="group">`;
    html += `<div class="group-title">${group.title}</div>`;
    for (const s of filtered) {
      const keysHtml = s.keys.map((k) => `<kbd>${k}</kbd>`).join('');
      html += `
        <div class="shortcut-row">
          <span class="shortcut-action">${s.action}</span>
          <span class="shortcut-keys">${keysHtml}</span>
        </div>`;
    }
    html += `</div>`;
  }

  if (!hasResults) {
    html = `<div class="no-results">No shortcuts matching "${filter}"</div>`;
  }

  listEl.innerHTML = html;
}

searchEl.addEventListener('input', () => render(searchEl.value));

// Initial render
render();
