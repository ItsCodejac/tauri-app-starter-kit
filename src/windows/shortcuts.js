import { applyBranding, closeWindow } from '../lib/window-utils.js';

applyBranding({ showVersion: false });

// ---------------------------------------------------------------------------
// Shortcut definitions grouped by category
// ---------------------------------------------------------------------------
const shortcutGroups = [
  {
    title: 'Application',
    shortcuts: [
      { action: 'Settings', keys: ['\u2318', ','] },
      { action: 'Quit', keys: ['\u2318', 'Q'] },
    ],
  },
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
    title: 'Window',
    shortcuts: [
      { action: 'Minimize', keys: ['\u2318', 'M'] },
      { action: 'Close', keys: ['\u2318', 'W'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Map from key label on keyboard -> command name (for highlighting keys)
// ---------------------------------------------------------------------------

const symbolToKey = {
  '\u2318': 'Cmd',
  '\u21E7': 'Shift',
  '\u2303': 'Ctrl',
  '\u2325': 'Alt',
};

function buildKeyToCommandMap() {
  const map = {};
  for (const group of shortcutGroups) {
    for (const s of group.shortcuts) {
      for (const k of s.keys) {
        const label = symbolToKey[k] || k;
        const normalizedLabel = label.toUpperCase();
        if (!map[normalizedLabel]) {
          map[normalizedLabel] = s.action;
        }
      }
    }
  }
  return map;
}

const keyCommandMap = buildKeyToCommandMap();

// ---------------------------------------------------------------------------
// Keyboard layout
// ---------------------------------------------------------------------------
const keyboardRows = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Delete'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Return'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
  ['Fn', 'Ctrl', 'Alt', 'Cmd', 'Space', 'Cmd', 'Alt', 'Left', 'Up', 'Down', 'Right'],
];

const wideKeys = {
  'Delete': 'key-w-1-5',
  'Tab': 'key-w-1-5',
  'Caps': 'key-w-1-8',
  'Return': 'key-w-1-8',
  'Shift': 'key-w-2-2',
  'Space': 'key-w-5',
  'Cmd': 'key-w-1-2',
};

const modifierKeys = new Set(['Shift', 'Ctrl', 'Alt', 'Cmd', 'Caps', 'Fn']);

const arrowSymbols = {
  'Left': '\u2190',
  'Right': '\u2192',
  'Up': '\u2191',
  'Down': '\u2193',
};

function renderKeyboard() {
  const container = document.getElementById('keyboard');
  let html = '';

  for (const row of keyboardRows) {
    html += '<div class="keyboard-row">';
    for (const key of row) {
      const widthClass = wideKeys[key] || '';
      const isModifier = modifierKeys.has(key);
      const normalizedKey = key.toUpperCase();
      const command = keyCommandMap[normalizedKey];
      const isAssigned = !isModifier && !!command;

      let classes = 'key';
      if (widthClass) classes += ' ' + widthClass;
      if (isModifier) classes += ' modifier';
      if (isAssigned) classes += ' assigned';

      const tooltip = isAssigned ? ` data-tooltip="${command}"` : '';
      const displayLabel = arrowSymbols[key] || key;

      html += `<div class="${classes}"${tooltip}>${displayLabel}</div>`;
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Command list
// ---------------------------------------------------------------------------
const listEl = document.getElementById('command-list');
const searchEl = document.getElementById('search');

function renderCommandList(filter = '') {
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

    html += `<div class="category-header">${group.title}</div>`;
    for (const s of filtered) {
      const keysHtml = s.keys.map((k) => `<kbd>${k}</kbd>`).join('');
      html += `
        <div class="command-row">
          <span class="command-name">${s.action}</span>
          <span class="command-keys">${keysHtml}</span>
        </div>`;
    }
  }

  if (!hasResults) {
    html = `<div class="no-results">No shortcuts matching "${filter}"</div>`;
  }

  listEl.innerHTML = html;
}

searchEl.addEventListener('input', () => renderCommandList(searchEl.value));

// ---------------------------------------------------------------------------
// Footer buttons
// ---------------------------------------------------------------------------
document.getElementById('cancel-btn').addEventListener('click', closeWindow);
document.getElementById('ok-btn').addEventListener('click', closeWindow);

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
renderKeyboard();
renderCommandList();
