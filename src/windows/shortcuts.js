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

const keyboardRows = isMac
  ? [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Delete'],
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Return'],
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
    ['Fn', 'Ctrl', 'Alt', 'Cmd', 'Space', 'Cmd', 'Alt', 'Left', 'Up', 'Down', 'Right'],
  ]
  : [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Bksp'],
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl', 'Left', 'Up', 'Down', 'Right'],
  ];

const wideKeys = isMac
  ? { Delete: 'key-w-1-5', Tab: 'key-w-1-5', Caps: 'key-w-1-8', Return: 'key-w-1-8', Shift: 'key-w-2-2', Space: 'key-w-5', Cmd: 'key-w-1-2' }
  : { Bksp: 'key-w-1-5', Tab: 'key-w-1-5', Caps: 'key-w-1-8', Enter: 'key-w-1-8', Shift: 'key-w-2-2', Space: 'key-w-5', Ctrl: 'key-w-1-2' };

const modifierKeyLabels = isMac
  ? new Set(['Shift', 'Ctrl', 'Alt', 'Cmd', 'Caps', 'Fn'])
  : new Set(['Shift', 'Ctrl', 'Alt', 'Win', 'Caps']);

const arrowSymbols = { Left: '\u2190', Right: '\u2192', Up: '\u2191', Down: '\u2193' };

// Map visual keyboard label -> the key token used in Rust bindings
const keyToBindingToken = isMac
  ? {
    Cmd: 'CmdOrCtrl', Ctrl: 'Ctrl', Shift: 'Shift', Alt: 'Alt',
    Delete: 'Backspace', Return: 'Enter', Space: 'Space', Tab: 'Tab',
    Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown',
  }
  : {
    Ctrl: 'CmdOrCtrl', Win: 'Meta', Shift: 'Shift', Alt: 'Alt',
    Bksp: 'Backspace', Enter: 'Enter', Space: 'Space', Tab: 'Tab',
    Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown',
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
  const hasActiveModifiers = activeModifiers.size > 0;

  for (const s of shortcuts) {
    if (s.keys.length === 0) continue;

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

    if (hasActiveModifiers) {
      // When modifiers are toggled: show only shortcuts that EXACTLY match
      let modsMatch = true;
      for (const am of activeModifiers) {
        if (!mods.has(am)) { modsMatch = false; break; }
      }
      for (const m of mods) {
        if (!activeModifiers.has(m)) { modsMatch = false; break; }
      }
      if (!modsMatch) continue;
    }
    // When NO modifiers toggled: show ALL assigned shortcuts (overview mode)

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

// Layout definition with width multipliers (all rows sum to ~14.5u)
const canvasRows = isMac
  ? [
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
      { label: 'Fn', w: 1 }, { label: 'Ctrl', w: 1 }, { label: 'Alt', w: 1.25 },
      { label: 'Cmd', w: 1.25 }, { label: 'Space', w: 5.0 },
      { label: 'Cmd', w: 1.25 }, { label: 'Alt', w: 1.25 },
      { label: 'Left', w: 1 }, { label: 'Up', w: 1 },
      { label: 'Down', w: 1 }, { label: 'Right', w: 1 }
    ]}
  ]
  : [
    { keys: [
      { label: '`', w: 1 }, { label: '1', w: 1 }, { label: '2', w: 1 },
      { label: '3', w: 1 }, { label: '4', w: 1 }, { label: '5', w: 1 },
      { label: '6', w: 1 }, { label: '7', w: 1 }, { label: '8', w: 1 },
      { label: '9', w: 1 }, { label: '0', w: 1 }, { label: '-', w: 1 },
      { label: '=', w: 1 }, { label: 'Bksp', w: 1.5 }
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
      { label: 'Enter', w: 1.75 }
    ]},
    { keys: [
      { label: 'Shift', w: 2.25 }, { label: 'Z', w: 1 }, { label: 'X', w: 1 },
      { label: 'C', w: 1 }, { label: 'V', w: 1 }, { label: 'B', w: 1 },
      { label: 'N', w: 1 }, { label: 'M', w: 1 }, { label: ',', w: 1 },
      { label: '.', w: 1 }, { label: '/', w: 1 }, { label: 'Shift', w: 2.25 }
    ]},
    { keys: [
      { label: 'Ctrl', w: 1.25 }, { label: 'Win', w: 1 }, { label: 'Alt', w: 1.25 },
      { label: 'Space', w: 5.5 },
      { label: 'Alt', w: 1.25 }, { label: 'Ctrl', w: 1.25 },
      { label: 'Left', w: 1 }, { label: 'Up', w: 1 },
      { label: 'Down', w: 1 }, { label: 'Right', w: 1 }
    ]}
  ];

// Fixed key dimensions
const KEY_UNIT = 50;   // 1u key width in px
const KEY_HEIGHT = 42;
const KEY_GAP = 3;
const ROW_GAP = 3;
const BORDER_RADIUS = 5;
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const FONT_FAMILY = getCSSVar('--font-ui') || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// Colors -- read from CSS variables with hardcoded fallbacks
const COLORS = {
  unassignedFill: getCSSVar('--surface-tertiary') || '#2a2a2a',
  unassignedBorder: getCSSVar('--border-standard') || '#3a3a3a',
  assignedFill: getCSSVar('--key-assigned-fill') || '#2e4a6e',
  assignedBorder: getCSSVar('--key-assigned-border') || '#3a6090',
  modifierFill: getCSSVar('--surface-secondary') || '#333333',
  modifierBorder: getCSSVar('--border-standard') || '#3a3a3a',
  modActiveFill: getCSSVar('--surface-active') || '#3a3a3a',
  modActiveBorder: getCSSVar('--accent-blue') || '#4a9eff',
  hoverLighten: 15,
  selectedBorder: getCSSVar('--accent-blue') || '#4a9eff',
  keyLabel: getCSSVar('--text-tertiary') || '#888888',
  keyLabelAssigned: getCSSVar('--text-accent') || '#99bbdd',
  commandLabel: getCSSVar('--text-primary') || '#ffffff',
  textModifier: getCSSVar('--text-secondary') || '#bbbbbb',
  textModActive: getCSSVar('--text-primary') || '#dddddd',
};

/**
 * Calculate the pixel width for a key given its unit width.
 * A key spanning `w` units occupies the key space plus the internal gaps:
 *   w * KEY_UNIT + (w - 1) * KEY_GAP
 */
function keyPixelWidth(w) {
  return w * KEY_UNIT + (w - 1) * KEY_GAP;
}

/**
 * Calculate the total pixel width of a row (keys + gaps between them).
 */
function calcRowWidth(row) {
  let total = 0;
  for (let i = 0; i < row.keys.length; i++) {
    total += keyPixelWidth(row.keys[i].w);
    if (i < row.keys.length - 1) total += KEY_GAP;
  }
  return total;
}

/**
 * Calculate fixed keyboard width from the widest row.
 */
function calcFixedWidth() {
  let maxW = 0;
  for (const row of canvasRows) {
    const w = calcRowWidth(row);
    if (w > maxW) maxW = w;
  }
  return Math.ceil(maxW);
}

const KEYBOARD_WIDTH = calcFixedWidth();
const KEYBOARD_HEIGHT = canvasRows.length * KEY_HEIGHT + (canvasRows.length - 1) * ROW_GAP;

// Stored key rectangles for hit detection
let keyRects = []; // { x, y, w, h, label, displayLabel, isMod, commands, shortcutDisplay }
let hoveredKey = null;
let dpr = 1;

/**
 * Lighten a hex color by a fixed amount per channel.
 */
function lightenHex(hex, amount) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

/**
 * Build a map: normalized visual key label -> { commands: string[], shortcutDisplays: string[] }
 * Only includes bindings whose modifiers exactly match the active modifier toggles.
 */
function buildKeyCommandMapWithDisplay() {
  const map = {};
  for (const s of shortcuts) {
    if (s.keys.length === 0) continue;
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

    // Match modifiers exactly against active toggles
    let modsMatch = true;
    for (const am of activeModifiers) {
      if (!mods.has(am)) { modsMatch = false; break; }
    }
    if (!modsMatch) continue;
    for (const m of mods) {
      if (!activeModifiers.has(m)) { modsMatch = false; break; }
    }
    if (!modsMatch) continue;

    const visualLabel = (bindingTokenToDisplay[mainKey] || mainKey).toUpperCase();
    if (!map[visualLabel]) map[visualLabel] = { commands: [], shortcutDisplays: [] };
    map[visualLabel].commands.push(s.label);
    const displayParts = keysToDisplayParts(s.keys);
    map[visualLabel].shortcutDisplays.push(displayParts.join(''));
  }
  return map;
}

function setupCanvas() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = KEYBOARD_WIDTH * dpr;
  canvas.height = KEYBOARD_HEIGHT * dpr;
  canvas.style.width = KEYBOARD_WIDTH + 'px';
  canvas.style.height = KEYBOARD_HEIGHT + 'px';
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Draw a rounded rectangle path (caller must call beginPath first).
 */
function roundRect(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

/**
 * Truncate text to fit within maxWidth, appending ellipsis if needed.
 */
function truncateText(c, text, maxWidth) {
  if (c.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && c.measureText(t + '\u2026').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '\u2026';
}

function renderKeyboard() {
  const keyCommandMap = buildKeyCommandMapWithDisplay();
  setupCanvas();

  keyRects = [];
  ctx.clearRect(0, 0, KEYBOARD_WIDTH, KEYBOARD_HEIGHT);

  let rowY = 0;
  for (const row of canvasRows) {
    // Calculate this row's total pixel width to center it
    const rowTotalW = calcRowWidth(row);
    // Center the row within KEYBOARD_WIDTH
    let x = Math.round((KEYBOARD_WIDTH - rowTotalW) / 2);

    for (const keyDef of row.keys) {
      const keyW = keyPixelWidth(keyDef.w);

      const isMod = modifierKeyLabels.has(keyDef.label);
      const normalizedKey = keyDef.label.toUpperCase();
      const mapEntry = keyCommandMap[normalizedKey];
      const commands = mapEntry ? mapEntry.commands : null;
      const shortcutDisplay = mapEntry ? mapEntry.shortcutDisplays[0] : null;
      const isAssigned = !isMod && !!commands;
      const isSelected = selectedKeyFilter === normalizedKey;
      const modToken = keyToBindingToken[keyDef.label];
      const isModActive = isMod && modToken && activeModifiers.has(modToken);
      const isHovered = hoveredKey && hoveredKey.label === keyDef.label &&
                        hoveredKey.x === x && hoveredKey.y === rowY;

      // --- Determine colors ---
      let fillColor, borderColor;
      if (isAssigned) {
        fillColor = COLORS.assignedFill;
        borderColor = COLORS.assignedBorder;
      } else if (isModActive) {
        fillColor = COLORS.modActiveFill;
        borderColor = COLORS.modActiveBorder;
      } else if (isMod) {
        fillColor = COLORS.modifierFill;
        borderColor = COLORS.modifierBorder;
      } else {
        fillColor = COLORS.unassignedFill;
        borderColor = COLORS.unassignedBorder;
      }

      if (isHovered) {
        fillColor = lightenHex(fillColor, COLORS.hoverLighten);
      }

      // --- 1. Draw fill ---
      ctx.beginPath();
      roundRect(ctx, x + 0.5, rowY + 0.5, keyW - 1, KEY_HEIGHT - 1, BORDER_RADIUS);
      ctx.fillStyle = fillColor;
      ctx.fill();

      // --- 2. Draw border ---
      ctx.strokeStyle = isSelected ? COLORS.selectedBorder : borderColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // --- 3. Draw key label text (top) + command label text (bottom) ---
      const displayLabel = arrowSymbols[keyDef.label] || keyDef.label;
      ctx.textAlign = 'center';

      if (isAssigned) {
        // Key label at top, lighter color
        ctx.fillStyle = COLORS.keyLabelAssigned;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.textBaseline = 'top';
        ctx.fillText(displayLabel, x + keyW / 2, rowY + 4);

        // Command label at bottom, white, truncated with ellipsis
        ctx.fillStyle = COLORS.commandLabel;
        ctx.font = `bold 11px ${FONT_FAMILY}`;
        const maxTextW = keyW - 8;
        const cmdText = truncateText(ctx, commands[0], maxTextW);
        ctx.textBaseline = 'bottom';
        ctx.fillText(cmdText, x + keyW / 2, rowY + KEY_HEIGHT - 3);
      } else if (isMod) {
        // Modifier: centered label
        ctx.fillStyle = isModActive ? COLORS.textModActive : COLORS.textModifier;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(displayLabel, x + keyW / 2, rowY + KEY_HEIGHT / 2);
      } else {
        // Unassigned: centered label
        ctx.fillStyle = COLORS.keyLabel;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(displayLabel, x + keyW / 2, rowY + KEY_HEIGHT / 2);
      }

      // --- Store rect for hit detection ---
      keyRects.push({
        x, y: rowY, w: keyW, h: KEY_HEIGHT,
        label: keyDef.label,
        displayLabel,
        isMod,
        commands: commands || null,
        shortcutDisplay: shortcutDisplay || null
      });

      x += keyW + KEY_GAP;
    }
    rowY += KEY_HEIGHT + ROW_GAP;
  }
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

function showTooltip(key, clientX, clientY) {
  if (!key || !key.commands) {
    tooltipEl.style.display = 'none';
    return;
  }
  // Build tooltip: "Command Name -- shortcut"
  const cmdName = key.commands.join(', ');
  const shortcut = key.shortcutDisplay || '';
  tooltipEl.textContent = shortcut ? `${cmdName} \u2014 ${shortcut}` : cmdName;
  tooltipEl.style.display = 'block';

  // Position above the key, centered horizontally on the key
  const sectionRect = keyboardSection.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Scale factor from logical coords to screen coords
  const scaleX = canvasRect.width / KEYBOARD_WIDTH;
  const scaleY = canvasRect.height / KEYBOARD_HEIGHT;

  // Key center in screen coords relative to the keyboard-section container
  const keyCenterScreenX = canvasRect.left + (key.x + key.w / 2) * scaleX - sectionRect.left;
  const keyTopScreenY = canvasRect.top + key.y * scaleY - sectionRect.top;

  tooltipEl.style.left = keyCenterScreenX + 'px';
  tooltipEl.style.top = Math.max(0, keyTopScreenY - 30) + 'px';
  tooltipEl.style.transform = 'translateX(-50%)';
}

// Mouse event handlers
canvas.addEventListener('mousemove', (e) => {
  const bounds = canvas.getBoundingClientRect();
  const mx = (e.clientX - bounds.left) * (KEYBOARD_WIDTH / bounds.width);
  const my = (e.clientY - bounds.top) * (KEYBOARD_HEIGHT / bounds.height);

  const key = findKeyAtPoint(mx, my);
  const prevHovered = hoveredKey;
  hoveredKey = key;

  showTooltip(key, e.clientX, e.clientY);

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
  const mx = (e.clientX - bounds.left) * (KEYBOARD_WIDTH / bounds.width);
  const my = (e.clientY - bounds.top) * (KEYBOARD_HEIGHT / bounds.height);

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

// Resize handler -- keyboard is fixed size, just redraw to re-center
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
      el.setAttribute('aria-pressed', 'false');
    } else {
      activeModifiers.add(mod);
      el.classList.add('active');
      el.setAttribute('aria-pressed', 'true');
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
