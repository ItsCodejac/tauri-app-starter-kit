import { applyBranding, closeWindow, invoke } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

applyBranding({ showVersion: false });

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

const isMac = navigator.platform.toUpperCase().includes('MAC');

const MOD_DISPLAY = {
  CmdOrCtrl: isMac ? '\u2318' : 'Ctrl',
  Shift: isMac ? '\u21E7' : 'Shift',
  Alt: isMac ? '\u2325' : 'Alt',
  Ctrl: isMac ? '\u2303' : 'Ctrl',
};

const MOD_LABELS = {
  CmdOrCtrl: isMac ? '\u2318 Cmd' : 'Ctrl',
  Shift: isMac ? '\u21E7 Shift' : 'Shift',
  Alt: isMac ? '\u2325 Option' : 'Alt',
  Ctrl: isMac ? '\u2303 Control' : 'Ctrl',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let shortcuts = [];           // ShortcutBinding[]
let activePresetId = '';
let presets = [];              // PresetInfo[]
let selectedKeyFilter = null;  // key label string or null
let activeModifiers = new Set(); // set of mod keys currently toggled
let recordingCommandId = null; // command_id being recorded
let recordSearchActive = false;
let collapsedCategories = new Set();
let contextMenuTarget = null;  // command_id for context menu

// ---------------------------------------------------------------------------
// Keyboard layout definition
// ---------------------------------------------------------------------------

const keyboardRows = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Delete'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Return'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
  ['Fn', 'Ctrl', 'Alt', 'Cmd', 'Space', 'Cmd', 'Alt', 'Left', 'Up', 'Down', 'Right'],
];

const wideKeys = {
  Delete: 'key-w-1-5', Tab: 'key-w-1-5',
  Caps: 'key-w-1-8', Return: 'key-w-1-8',
  Shift: 'key-w-2-2', Space: 'key-w-5',
  Cmd: 'key-w-1-2',
};

const modifierKeyLabels = new Set(['Shift', 'Ctrl', 'Alt', 'Cmd', 'Caps', 'Fn']);

const arrowSymbols = { Left: '\u2190', Right: '\u2192', Up: '\u2191', Down: '\u2193' };

// Map visual keyboard label -> the key token used in Rust bindings
const keyToBindingToken = {
  Cmd: 'CmdOrCtrl',
  Ctrl: 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
  Delete: 'Backspace',
  Return: 'Enter',
  Space: 'Space',
  Tab: 'Tab',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
};

// Reverse: binding token -> visual label (for non-letter keys)
const bindingTokenToDisplay = {};
for (const [k, v] of Object.entries(keyToBindingToken)) {
  if (!modifierKeyLabels.has(k)) {
    bindingTokenToDisplay[v] = k;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a binding key token to a display string. */
function tokenToDisplay(token) {
  if (MOD_DISPLAY[token]) return MOD_DISPLAY[token];
  if (bindingTokenToDisplay[token]) return bindingTokenToDisplay[token];
  return token;
}

/** Convert a binding keys array to display string with symbols. */
function keysToDisplayParts(keys) {
  return keys.map(tokenToDisplay);
}

/**
 * Build a map: normalized visual key label -> array of command labels
 * taking active modifier toggles into account.
 */
function buildKeyCommandMap() {
  const map = {};
  for (const s of shortcuts) {
    if (s.keys.length === 0) continue;
    // Extract modifiers and the main key from the binding
    const mods = new Set();
    let mainKey = null;
    for (const k of s.keys) {
      if (k === 'CmdOrCtrl' || k === 'Shift' || k === 'Alt' || k === 'Ctrl') {
        mods.add(k);
      } else {
        mainKey = k;
      }
    }
    if (!mainKey) continue;

    // Check if the binding's modifiers match the active modifier toggles
    let modsMatch = true;
    for (const am of activeModifiers) {
      if (!mods.has(am)) { modsMatch = false; break; }
    }
    if (!modsMatch) continue;
    // Also check no extra mods in the binding beyond active toggles
    for (const m of mods) {
      if (!activeModifiers.has(m)) { modsMatch = false; break; }
    }
    if (!modsMatch) continue;

    // Normalize key label for keyboard display
    const visualLabel = (bindingTokenToDisplay[mainKey] || mainKey).toUpperCase();
    if (!map[visualLabel]) map[visualLabel] = [];
    map[visualLabel].push(s.label);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Keyboard rendering
// ---------------------------------------------------------------------------

const keyboardEl = document.getElementById('keyboard');

function renderKeyboard() {
  const keyCommandMap = buildKeyCommandMap();
  let html = '';

  for (const row of keyboardRows) {
    html += '<div class="keyboard-row">';
    for (const key of row) {
      const widthClass = wideKeys[key] || '';
      const isMod = modifierKeyLabels.has(key);
      const normalizedKey = key.toUpperCase();
      const commands = keyCommandMap[normalizedKey];
      const isAssigned = !isMod && !!commands;
      const isSelected = selectedKeyFilter === normalizedKey;

      // Check if this modifier is active
      const modToken = keyToBindingToken[key];
      const isModActive = isMod && modToken && activeModifiers.has(modToken);

      let classes = 'key';
      if (widthClass) classes += ' ' + widthClass;
      if (isMod) classes += ' modifier';
      if (isModActive) classes += ' active';
      if (isAssigned) classes += ' assigned';
      if (isSelected) classes += ' selected';

      const tooltip = isAssigned ? ` data-tooltip="${commands.join(', ')}"` : '';
      const displayLabel = arrowSymbols[key] || key;

      html += `<div class="${classes}" data-key="${key}"${tooltip}>${displayLabel}</div>`;
    }
    html += '</div>';
  }

  keyboardEl.innerHTML = html;

  // Attach click handlers
  keyboardEl.querySelectorAll('.key').forEach((el) => {
    el.addEventListener('click', () => {
      const key = el.dataset.key;
      if (modifierKeyLabels.has(key)) return; // Don't filter on modifier click from keyboard
      const norm = key.toUpperCase();
      if (selectedKeyFilter === norm) {
        selectedKeyFilter = null; // Toggle off
      } else {
        selectedKeyFilter = norm;
      }
      renderKeyboard();
      renderCommandList();
    });
  });
}

// ---------------------------------------------------------------------------
// Modifier toggle bar
// ---------------------------------------------------------------------------

const modButtons = {
  CmdOrCtrl: document.getElementById('mod-cmd'),
  Shift: document.getElementById('mod-shift'),
  Alt: document.getElementById('mod-alt'),
  Ctrl: document.getElementById('mod-ctrl'),
};

// Set labels
for (const [mod, el] of Object.entries(modButtons)) {
  el.textContent = MOD_LABELS[mod];
  el.addEventListener('click', () => {
    if (activeModifiers.has(mod)) {
      activeModifiers.delete(mod);
      el.classList.remove('active');
    } else {
      activeModifiers.add(mod);
      el.classList.add('active');
    }
    renderKeyboard();
  });
}

// ---------------------------------------------------------------------------
// Preset dropdown
// ---------------------------------------------------------------------------

const presetSelect = document.getElementById('preset-select');

async function loadPresets() {
  presets = await ipc.getPresets();
  renderPresetDropdown();
}

function renderPresetDropdown() {
  let html = '';
  for (const p of presets) {
    const selected = p.id === activePresetId ? ' selected' : '';
    html += `<option value="${p.id}"${selected}>${p.name}</option>`;
  }
  html += '<option value="__save_as__">Save As...</option>';
  presetSelect.innerHTML = html;
}

presetSelect.addEventListener('change', async () => {
  const val = presetSelect.value;
  if (val === '__save_as__') {
    const name = prompt('Preset name:');
    if (name) {
      const newId = await ipc.savePreset(name);
      activePresetId = newId;
      await loadPresets();
      await refreshShortcuts();
    } else {
      presetSelect.value = activePresetId;
    }
    return;
  }
  const bindings = await ipc.loadPreset(val);
  activePresetId = val;
  shortcuts = bindings;
  renderPresetDropdown();
  renderKeyboard();
  renderCommandList();
});

// ---------------------------------------------------------------------------
// Search + Record keys search
// ---------------------------------------------------------------------------

const searchEl = document.getElementById('search');
const recordSearchBtn = document.getElementById('record-search-btn');

searchEl.addEventListener('input', () => renderCommandList());

recordSearchBtn.addEventListener('click', () => {
  recordSearchActive = !recordSearchActive;
  recordSearchBtn.classList.toggle('active', recordSearchActive);
  if (recordSearchActive) {
    searchEl.placeholder = 'Press a key...';
    searchEl.value = '';
  } else {
    searchEl.placeholder = 'Search commands...';
  }
});

// ---------------------------------------------------------------------------
// Command list rendering
// ---------------------------------------------------------------------------

const listEl = document.getElementById('command-list');

function renderCommandList() {
  const filter = searchEl.value.toLowerCase();
  const categories = {};

  for (const s of shortcuts) {
    // Apply key filter from keyboard
    if (selectedKeyFilter) {
      let mainKey = null;
      for (const k of s.keys) {
        if (k !== 'CmdOrCtrl' && k !== 'Shift' && k !== 'Alt' && k !== 'Ctrl') {
          mainKey = k;
        }
      }
      const visualLabel = mainKey
        ? (bindingTokenToDisplay[mainKey] || mainKey).toUpperCase()
        : null;
      if (visualLabel !== selectedKeyFilter) continue;
    }

    // Apply text filter
    if (filter && !s.label.toLowerCase().includes(filter) &&
        !s.command_id.toLowerCase().includes(filter)) {
      continue;
    }

    if (!categories[s.category]) categories[s.category] = [];
    categories[s.category].push(s);
  }

  let html = '';
  const categoryNames = Object.keys(categories);

  if (categoryNames.length === 0) {
    html = '<div class="no-results">No commands found</div>';
    listEl.innerHTML = html;
    return;
  }

  for (const cat of categoryNames) {
    const collapsed = collapsedCategories.has(cat);
    html += `<div class="category-group${collapsed ? ' collapsed' : ''}" data-category="${cat}">`;
    html += `<div class="category-header${collapsed ? ' collapsed' : ''}" data-category="${cat}">`;
    html += `<span class="chevron">\u25BC</span> ${cat}`;
    html += '</div>';

    for (const s of categories[cat]) {
      const keysHtml = s.keys.length > 0
        ? `<span class="command-keys">${keysToDisplayParts(s.keys).map((k) => `<kbd>${k}</kbd>`).join('')}</span>`
        : '<span class="command-keys empty">Unassigned</span>';

      const isRecording = recordingCommandId === s.command_id;
      const shortcutContent = isRecording
        ? '<span class="recording-text">Press a shortcut...</span>'
        : keysHtml;
      const recordingClass = isRecording ? ' recording' : '';

      html += `<div class="command-row" data-command="${s.command_id}">`;
      html += `  <span class="command-name">${s.label}</span>`;
      html += `  <div class="command-shortcut${recordingClass}" data-command="${s.command_id}">${shortcutContent}</div>`;
      html += `  <span class="command-category">${s.category}</span>`;
      html += `  <button class="remove-btn" data-command="${s.command_id}" title="Remove shortcut">\u00D7</button>`;
      html += '</div>';
    }

    html += '</div>';
  }

  listEl.innerHTML = html;
  attachCommandListHandlers();
}

function attachCommandListHandlers() {
  // Category collapse/expand
  listEl.querySelectorAll('.category-header').forEach((el) => {
    el.addEventListener('click', () => {
      const cat = el.dataset.category;
      if (collapsedCategories.has(cat)) {
        collapsedCategories.delete(cat);
      } else {
        collapsedCategories.add(cat);
      }
      renderCommandList();
    });
  });

  // Double-click shortcut cell to record
  listEl.querySelectorAll('.command-shortcut').forEach((el) => {
    el.addEventListener('dblclick', () => {
      startRecording(el.dataset.command);
    });
  });

  // Remove button
  listEl.querySelectorAll('.remove-btn').forEach((el) => {
    el.addEventListener('click', async () => {
      const commandId = el.dataset.command;
      await ipc.removeShortcut(commandId);
      await refreshShortcuts();
    });
  });

  // Right-click context menu
  listEl.querySelectorAll('.command-row').forEach((el) => {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, el.dataset.command);
    });
  });
}

// ---------------------------------------------------------------------------
// Shortcut recording
// ---------------------------------------------------------------------------

function startRecording(commandId) {
  recordingCommandId = commandId;
  renderCommandList();
}

function stopRecording() {
  recordingCommandId = null;
  renderCommandList();
}

// Global keydown handler for recording
document.addEventListener('keydown', async (e) => {
  // Record search mode
  if (recordSearchActive) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      recordSearchActive = false;
      recordSearchBtn.classList.remove('active');
      searchEl.placeholder = 'Search commands...';
      searchEl.value = '';
      renderCommandList();
      return;
    }
    // Convert the pressed key to a search term
    const captured = captureKeyEvent(e);
    if (captured.mainKey) {
      recordSearchActive = false;
      recordSearchBtn.classList.remove('active');
      searchEl.placeholder = 'Search commands...';
      // Search by the display version of the key combo
      const display = captured.allKeys.map(tokenToDisplay).join(' ');
      searchEl.value = display;
      renderCommandList();
    }
    return;
  }

  // Recording a shortcut
  if (recordingCommandId) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      stopRecording();
      return;
    }

    const captured = captureKeyEvent(e);
    if (!captured.mainKey) return; // Only modifier pressed, wait for main key

    const keys = captured.allKeys;

    // Check conflict
    const conflict = await ipc.checkConflict(keys, recordingCommandId);
    if (conflict) {
      showConflictWarning(recordingCommandId, conflict, keys);
      return;
    }

    // No conflict: apply
    await ipc.setShortcut(recordingCommandId, keys);
    recordingCommandId = null;
    await refreshShortcuts();
  }
});

/**
 * Convert a KeyboardEvent into binding tokens.
 * Returns { allKeys: string[], mainKey: string|null }
 */
function captureKeyEvent(e) {
  const mods = [];
  if (e.metaKey) mods.push('CmdOrCtrl');
  if (e.ctrlKey && !e.metaKey) mods.push(isMac ? 'Ctrl' : 'CmdOrCtrl');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey) mods.push('Alt');

  // Deduplicate CmdOrCtrl
  const unique = [...new Set(mods)];

  let mainKey = null;
  const key = e.key;
  const code = e.code;

  // Skip if only a modifier was pressed
  if (['Meta', 'Control', 'Shift', 'Alt'].includes(key)) {
    return { allKeys: unique, mainKey: null };
  }

  // Map key to token
  if (code.startsWith('Key')) {
    mainKey = code.replace('Key', '');
  } else if (code.startsWith('Digit')) {
    mainKey = code.replace('Digit', '');
  } else {
    // Special keys
    const specialMap = {
      Backspace: 'Backspace', Delete: 'Delete', Enter: 'Enter',
      Tab: 'Tab', Space: 'Space', Escape: 'Escape',
      ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
      ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
      Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
      Backslash: '\\', Semicolon: ';', Quote: "'",
      Comma: ',', Period: '.', Slash: '/',
      Backquote: '`',
    };
    mainKey = specialMap[code] || key;
  }

  return { allKeys: [...unique, mainKey], mainKey };
}

// ---------------------------------------------------------------------------
// Conflict handling
// ---------------------------------------------------------------------------

function showConflictWarning(commandId, conflict, newKeys) {
  // Remove any existing conflict warning
  const existing = document.querySelector('.conflict-warning');
  if (existing) existing.remove();

  // Find the row for this command
  const row = listEl.querySelector(`.command-row[data-command="${commandId}"]`);
  if (!row) return;

  const warning = document.createElement('div');
  warning.className = 'conflict-warning';
  warning.innerHTML = `
    Already assigned to <strong>${conflict.label}</strong>.
    <span class="conflict-actions">
      <button id="conflict-reassign">Reassign</button>
      <button id="conflict-cancel">Cancel</button>
    </span>
  `;

  row.after(warning);

  warning.querySelector('#conflict-reassign').addEventListener('click', async () => {
    // Remove from conflicting command, assign to this one
    await ipc.removeShortcut(conflict.command_id);
    await ipc.setShortcut(commandId, newKeys);
    recordingCommandId = null;
    await refreshShortcuts();
  });

  warning.querySelector('#conflict-cancel').addEventListener('click', () => {
    warning.remove();
    stopRecording();
  });
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

const contextMenuEl = document.getElementById('context-menu');

function showContextMenu(x, y, commandId) {
  contextMenuTarget = commandId;
  contextMenuEl.style.left = x + 'px';
  contextMenuEl.style.top = y + 'px';
  contextMenuEl.classList.remove('hidden');
}

function hideContextMenu() {
  contextMenuEl.classList.add('hidden');
  contextMenuTarget = null;
}

document.addEventListener('click', () => hideContextMenu());

document.getElementById('ctx-reset').addEventListener('click', async () => {
  if (contextMenuTarget) {
    await ipc.resetShortcut(contextMenuTarget);
    await refreshShortcuts();
  }
  hideContextMenu();
});

// ---------------------------------------------------------------------------
// Footer buttons
// ---------------------------------------------------------------------------

document.getElementById('cancel-btn').addEventListener('click', closeWindow);
document.getElementById('ok-btn').addEventListener('click', closeWindow);

document.getElementById('reset-all-btn').addEventListener('click', async () => {
  const confirmed = confirm('Reset all keyboard shortcuts to their defaults?');
  if (confirmed) {
    await ipc.resetAllShortcuts();
    await refreshShortcuts();
  }
});

// ---------------------------------------------------------------------------
// Data refresh
// ---------------------------------------------------------------------------

async function refreshShortcuts() {
  shortcuts = await ipc.getShortcuts();
  renderKeyboard();
  renderCommandList();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  // Load presets to find active preset ID
  presets = await ipc.getPresets();

  // Load shortcuts (returns bindings from active preset)
  shortcuts = await ipc.getShortcuts();

  // Determine active preset -- the first one is usually active after load
  // We need to figure out which preset is active. The Rust side tracks this
  // but doesn't expose it directly via get_presets. We'll use the first
  // builtin preset as fallback.
  if (presets.length > 0) {
    // Try to detect by checking if default is present
    activePresetId = presets[0].id;
    for (const p of presets) {
      if (p.is_builtin) { activePresetId = p.id; break; }
    }
  }

  renderPresetDropdown();
  renderKeyboard();
  renderCommandList();
}

init();
