import { applyBranding, closeWindow, setupEscapeToClose } from '../lib/window-utils.js';
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
// Keyboard Canvas rendering
// ---------------------------------------------------------------------------

const canvas = document.getElementById('keyboard-canvas');
const ctx = canvas.getContext('2d');
const tooltipEl = document.getElementById('keyboard-tooltip');
const keyboardSection = document.getElementById('keyboard-section');

// Layout definition with width multipliers
const canvasRows = [
  { keys: [
    { label: '`', w: 1 }, { label: '1', w: 1 }, { label: '2', w: 1 },
    { label: '3', w: 1 }, { label: '4', w: 1 }, { label: '5', w: 1 },
    { label: '6', w: 1 }, { label: '7', w: 1 }, { label: '8', w: 1 },
    { label: '9', w: 1 }, { label: '0', w: 1 }, { label: '-', w: 1 },
    { label: '=', w: 1 }, { label: 'Delete', w: 1.5 }
  ]},
  { keys: [
    { label: 'Tab', w: 1.5 }, { label: 'Q', w: 1 }, { label: 'W', w: 1 },
    { label: 'E', w: 1 }, { label: 'R', w: 1 }, { label: 'T', w: 1 },
    { label: 'Y', w: 1 }, { label: 'U', w: 1 }, { label: 'I', w: 1 },
    { label: 'O', w: 1 }, { label: 'P', w: 1 }, { label: '[', w: 1 },
    { label: ']', w: 1 }, { label: '\\', w: 1 }
  ]},
  { keys: [
    { label: 'Caps', w: 1.75 }, { label: 'A', w: 1 }, { label: 'S', w: 1 },
    { label: 'D', w: 1 }, { label: 'F', w: 1 }, { label: 'G', w: 1 },
    { label: 'H', w: 1 }, { label: 'J', w: 1 }, { label: 'K', w: 1 },
    { label: 'L', w: 1 }, { label: ';', w: 1 }, { label: "'", w: 1 },
    { label: 'Return', w: 1.75 }
  ]},
  { keys: [
    { label: 'Shift', w: 2.25 }, { label: 'Z', w: 1 }, { label: 'X', w: 1 },
    { label: 'C', w: 1 }, { label: 'V', w: 1 }, { label: 'B', w: 1 },
    { label: 'N', w: 1 }, { label: 'M', w: 1 }, { label: ',', w: 1 },
    { label: '.', w: 1 }, { label: '/', w: 1 }, { label: 'Shift', w: 2.25 }
  ]},
  { keys: [
    { label: 'Fn', w: 1 }, { label: 'Ctrl', w: 1 }, { label: 'Alt', w: 1 },
    { label: 'Cmd', w: 1.25 }, { label: 'Space', w: 6.0 },
    { label: 'Cmd', w: 1.25 }, { label: 'Alt', w: 1 },
    { label: 'Left', w: 1 }, { label: 'Up', w: 1 },
    { label: 'Down', w: 1 }, { label: 'Right', w: 1 }
  ]}
];

// Colors
const COLORS = {
  unassignedFill: '#2a2a2a',
  unassignedBorder: '#3a3a3a',
  assignedFill: '#2a5a9e',
  assignedBorder: '#2a5a9e',
  modifierFill: '#333333',
  modifierBorder: '#3a3a3a',
  hoverLighten: 20,
  selectedBorder: '#4a9eff',
  textUnassigned: '#999999',
  textAssigned: '#ffffff',
  textModifier: '#e0e0e0',
};

const KEY_GAP = 3;
const KEY_HEIGHT = 36;
const ROW_GAP = 3;
const BORDER_RADIUS = 5;

// Stored key rectangles for hit detection
let keyRects = []; // { x, y, w, h, label, displayLabel, isMod, commands }
let hoveredKey = null;
let dpr = 1;

function lightenColor(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function calculateLayout() {
  const section = keyboardSection;
  const availableWidth = section.clientWidth - 32; // 20px padding each side minus some margin
  canvas.style.width = availableWidth + 'px';

  // Calculate total width units for the widest row to determine unit size
  let maxUnits = 0;
  for (const row of canvasRows) {
    let units = 0;
    for (const key of row.keys) units += key.w;
    // Add gaps: (numKeys - 1) gaps in unit-space
    const gapUnits = (row.keys.length - 1) * (KEY_GAP / 42); // approximate
    if (units > maxUnits) maxUnits = units;
  }

  // Unit width: how many pixels per 1.0 width unit
  // We need: totalKeys * unitWidth + (numKeys-1) * gap = availableWidth
  // Use the first row (14.5 units, 13 gaps) as reference
  const refRow = canvasRows[0];
  let refUnits = 0;
  for (const key of refRow.keys) refUnits += key.w;
  const refGaps = refRow.keys.length - 1;
  const unitWidth = (availableWidth - refGaps * KEY_GAP) / refUnits;

  // Total height
  const totalHeight = canvasRows.length * KEY_HEIGHT + (canvasRows.length - 1) * ROW_GAP;

  // Set canvas size with device pixel ratio for sharp rendering
  dpr = window.devicePixelRatio || 1;
  canvas.width = availableWidth * dpr;
  canvas.height = totalHeight * dpr;
  canvas.style.height = totalHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { unitWidth, totalHeight, availableWidth };
}

function renderKeyboard() {
  const keyCommandMap = buildKeyCommandMap();
  const { unitWidth } = calculateLayout();

  keyRects = [];
  const w = parseFloat(canvas.style.width);
  const h = parseFloat(canvas.style.height);

  // Clear
  ctx.clearRect(0, 0, w, h);

  let rowY = 0;
  for (const row of canvasRows) {
    let x = 0;
    for (const keyDef of row.keys) {
      const keyW = keyDef.w * unitWidth + (keyDef.w - 1) * KEY_GAP * (keyDef.w > 1 ? (keyDef.w - 1) / keyDef.w : 0);
      // Simpler: key pixel width = keyDef.w * unitWidth + max(0, keyDef.w - 1) * KEY_GAP * fraction
      // Actually, let's compute simply: the key occupies keyDef.w units + the gaps between those units
      const keyPixelW = keyDef.w * unitWidth + Math.max(0, Math.floor(keyDef.w) - 1) * KEY_GAP;

      const isMod = modifierKeyLabels.has(keyDef.label);
      const normalizedKey = keyDef.label.toUpperCase();
      const commands = keyCommandMap[normalizedKey];
      const isAssigned = !isMod && !!commands;
      const isSelected = selectedKeyFilter === normalizedKey;
      const modToken = keyToBindingToken[keyDef.label];
      const isModActive = isMod && modToken && activeModifiers.has(modToken);
      const isHovered = hoveredKey && hoveredKey.label === keyDef.label &&
                        hoveredKey.x === x && hoveredKey.y === rowY;

      // Determine colors
      let fillColor, borderColor, textColor;
      if (isAssigned) {
        fillColor = COLORS.assignedFill;
        borderColor = COLORS.assignedBorder;
        textColor = COLORS.textAssigned;
      } else if (isModActive) {
        fillColor = '#4a9eff';
        borderColor = '#4a9eff';
        textColor = '#ffffff';
      } else if (isMod) {
        fillColor = COLORS.modifierFill;
        borderColor = COLORS.modifierBorder;
        textColor = COLORS.textModifier;
      } else {
        fillColor = COLORS.unassignedFill;
        borderColor = COLORS.unassignedBorder;
        textColor = COLORS.textUnassigned;
      }

      if (isHovered) {
        fillColor = lightenColor(fillColor.startsWith('#') ? fillColor : '#2a2a2a', COLORS.hoverLighten);
      }

      // Draw key background with rounded rect
      ctx.beginPath();
      roundRect(ctx, x, rowY, keyPixelW, KEY_HEIGHT, BORDER_RADIUS);
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = isSelected ? COLORS.selectedBorder : borderColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Draw selected accent outline outside
      if (isSelected) {
        ctx.beginPath();
        roundRect(ctx, x - 1, rowY - 1, keyPixelW + 2, KEY_HEIGHT + 2, BORDER_RADIUS + 1);
        ctx.strokeStyle = COLORS.selectedBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label
      const displayLabel = arrowSymbols[keyDef.label] || keyDef.label;
      ctx.fillStyle = textColor;
      ctx.font = `${isMod || keyDef.w > 1 ? '11' : '12'}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayLabel, x + keyPixelW / 2, rowY + KEY_HEIGHT / 2);

      // Store rect for hit detection
      keyRects.push({
        x, y: rowY, w: keyPixelW, h: KEY_HEIGHT,
        label: keyDef.label,
        displayLabel,
        isMod,
        commands: commands || null
      });

      x += keyPixelW + KEY_GAP;
    }
    rowY += KEY_HEIGHT + ROW_GAP;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function findKeyAtPoint(mx, my) {
  for (const rect of keyRects) {
    if (mx >= rect.x && mx <= rect.x + rect.w &&
        my >= rect.y && my <= rect.y + rect.h) {
      return rect;
    }
  }
  return null;
}

// Mouse event handlers
canvas.addEventListener('mousemove', (e) => {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = parseFloat(canvas.style.width) / bounds.width;
  const scaleY = parseFloat(canvas.style.height) / bounds.height;
  const mx = (e.clientX - bounds.left) * scaleX;
  const my = (e.clientY - bounds.top) * scaleY;

  const key = findKeyAtPoint(mx, my);
  const prevHovered = hoveredKey;
  hoveredKey = key;

  // Show/hide tooltip
  if (key && key.commands) {
    tooltipEl.textContent = key.commands.join(', ');
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (e.clientX - keyboardSection.getBoundingClientRect().left + 12) + 'px';
    tooltipEl.style.top = (e.clientY - keyboardSection.getBoundingClientRect().top - 30) + 'px';
  } else {
    tooltipEl.style.display = 'none';
  }

  // Redraw if hover state changed
  if (prevHovered !== key) {
    renderKeyboard();
  }
});

canvas.addEventListener('mouseleave', () => {
  hoveredKey = null;
  tooltipEl.style.display = 'none';
  renderKeyboard();
});

canvas.addEventListener('click', (e) => {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = parseFloat(canvas.style.width) / bounds.width;
  const scaleY = parseFloat(canvas.style.height) / bounds.height;
  const mx = (e.clientX - bounds.left) * scaleX;
  const my = (e.clientY - bounds.top) * scaleY;

  const key = findKeyAtPoint(mx, my);
  if (!key || key.isMod) return;

  const norm = key.label.toUpperCase();
  if (selectedKeyFilter === norm) {
    selectedKeyFilter = null;
  } else {
    selectedKeyFilter = norm;
  }
  renderKeyboard();
  renderCommandList();
});

// Resize handler
window.addEventListener('resize', () => {
  renderKeyboard();
});

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

// Inline preset name input (replaces prompt())
const presetNameForm = document.createElement('div');
presetNameForm.className = 'preset-name-form hidden';
presetNameForm.style.cssText = 'display:none;align-items:center;gap:6px;';
presetNameForm.innerHTML = `
  <input type="text" id="preset-name-input" placeholder="Preset name" style="min-width:120px;font-size:12px;" />
  <button id="preset-name-save" style="font-size:12px;padding:4px 10px;">Save</button>
  <button id="preset-name-cancel" style="font-size:12px;padding:4px 10px;">Cancel</button>
`;
presetSelect.parentElement.appendChild(presetNameForm);

function showPresetNameInput() {
  presetNameForm.classList.remove('hidden');
  presetNameForm.style.display = 'flex';
  presetSelect.style.display = 'none';
  const input = document.getElementById('preset-name-input');
  input.value = '';
  input.focus();
}

function hidePresetNameInput() {
  presetNameForm.classList.add('hidden');
  presetNameForm.style.display = 'none';
  presetSelect.style.display = '';
  presetSelect.value = activePresetId;
}

document.getElementById('preset-name-save').addEventListener('click', async () => {
  const name = document.getElementById('preset-name-input').value.trim();
  if (name) {
    const newId = await ipc.savePreset(name);
    activePresetId = newId;
    await loadPresets();
    await refreshShortcuts();
  }
  hidePresetNameInput();
});

document.getElementById('preset-name-cancel').addEventListener('click', () => {
  hidePresetNameInput();
});

document.getElementById('preset-name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('preset-name-save').click();
  if (e.key === 'Escape') hidePresetNameInput();
});

presetSelect.addEventListener('change', async () => {
  const val = presetSelect.value;
  if (val === '__save_as__') {
    showPresetNameInput();
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
    return;
  }

  // Not recording and not in record-search: Escape closes the window
  if (e.key === 'Escape') {
    closeWindow();
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

document.getElementById('done-btn').addEventListener('click', closeWindow);

document.getElementById('reset-all-btn').addEventListener('click', async () => {
  // Reversible by loading the Default preset, so no confirmation needed
  await ipc.resetAllShortcuts();
  await refreshShortcuts();
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

  // Focus the search input on open
  searchEl.focus();
}

init();
