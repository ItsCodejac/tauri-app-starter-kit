import { applyBranding, showButtonFeedback, setupEscapeToClose } from '../lib/window-utils.js';
import { ipc } from '../lib/ipc.js';

applyBranding({ showVersion: false });

const logContent = document.getElementById('log-content');
const logContainer = document.getElementById('log-container');
const filterEl = document.getElementById('filter');
const statusBar = document.getElementById('status-bar');

let rawLog = '';

function colorize(text) {
  return text
    .replace(/^(.*\bERROR\b.*)$/gm, '<span class="error">$1</span>')
    .replace(/^(.*\bWARN\b.*)$/gm, '<span class="warn">$1</span>')
    .replace(/^(.*\bINFO\b.*)$/gm, '<span class="info">$1</span>');
}

function render() {
  const filter = filterEl.value.toLowerCase();
  let lines = rawLog.split('\n');

  if (filter) {
    lines = lines.filter((l) => l.toLowerCase().includes(filter));
  }

  const text = lines.join('\n');
  logContent.innerHTML = colorize(text);
  statusBar.textContent = `${lines.length} lines`;

  // Scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function loadLogs() {
  try {
    rawLog = await ipc.getLogContents();
    render();
  } catch (e) {
    logContent.textContent = 'Failed to load logs: ' + e;
  }
}

filterEl.addEventListener('input', render);

document.getElementById('copy-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(rawLog);
    showButtonFeedback('copy-btn', 'Copied!', 2000);
  } catch (e) {
    console.error('Failed to copy:', e);
  }
});

document.getElementById('refresh-btn').addEventListener('click', loadLogs);

// Escape to close
setupEscapeToClose();

// Cmd+F / Ctrl+F focuses filter input
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault();
    document.getElementById('filter')?.focus();
  }
});

// Right-click on log content: copy selected text if any
logContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const selection = window.getSelection().toString();
  if (selection) {
    navigator.clipboard.writeText(selection);
  }
});

// Initial load
loadLogs();
