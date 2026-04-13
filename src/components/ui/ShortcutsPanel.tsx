import { useState, useEffect, useRef, type CSSProperties } from 'react';

interface ShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  label: string;
  keys: string;
}

interface ShortcutGroup {
  category: string;
  shortcuts: ShortcutEntry[];
}

const isMac = navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '\u2318' : 'Ctrl+';
const shift = isMac ? '\u21E7' : 'Shift+';
const alt = isMac ? '\u2325' : 'Alt+';
const ctrl = isMac ? '\u2303' : 'Ctrl+';

/** All keyboard shortcuts, grouped by category. */
const shortcutGroups: ShortcutGroup[] = [
  {
    category: 'File',
    shortcuts: [
      { label: 'New', keys: `${mod}N` },
      { label: 'Open', keys: `${mod}O` },
      { label: 'Save', keys: `${mod}S` },
      { label: 'Save As', keys: `${mod}${shift}S` },
      { label: 'Close Window', keys: `${mod}W` },
    ],
  },
  {
    category: 'Edit',
    shortcuts: [
      { label: 'Undo', keys: `${mod}Z` },
      { label: 'Redo', keys: `${mod}${shift}Z` },
      { label: 'Cut', keys: `${mod}X` },
      { label: 'Copy', keys: `${mod}C` },
      { label: 'Paste', keys: `${mod}V` },
      { label: 'Select All', keys: `${mod}A` },
      { label: 'Find', keys: `${mod}F` },
      { label: 'Find & Replace', keys: `${mod}${shift}F` },
    ],
  },
  {
    category: 'View',
    shortcuts: [
      { label: 'Toggle Fullscreen', keys: `${ctrl}${mod}F` },
      { label: 'Zoom In', keys: `${mod}=` },
      { label: 'Zoom Out', keys: `${mod}-` },
      { label: 'Actual Size', keys: `${mod}0` },
      ...(import.meta.env.DEV
        ? [{ label: 'Developer Tools', keys: `${mod}${alt}I` }]
        : []),
    ],
  },
  {
    category: 'App',
    shortcuts: [
      { label: 'Settings', keys: `${mod},` },
      { label: 'Command Palette', keys: `${mod}${shift}P` },
      { label: 'Keyboard Shortcuts', keys: `${mod}/` },
      { label: 'Quit', keys: `${mod}Q` },
    ],
  },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20000,
};

const card: CSSProperties = {
  width: 520,
  maxHeight: '70vh',
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-standard)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const searchStyle: CSSProperties = {
  padding: '10px 14px',
  background: 'var(--surface-primary)',
  border: 'none',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--font-ui)',
};

const categoryStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '12px 16px 4px',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px',
  fontSize: 12,
  color: 'var(--text-primary)',
};

const kbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--text-secondary)',
  background: 'var(--surface-tertiary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  padding: '2px 6px',
  display: 'inline-block',
};

export default function ShortcutsPanel({ open, onClose }: ShortcutsPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const q = query.toLowerCase();

  const filtered = shortcutGroups
    .map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        (s) => s.label.toLowerCase().includes(q) || s.keys.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.shortcuts.length > 0);

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          placeholder="Search shortcuts..."
          style={searchStyle}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 12px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center' }}>
              No matching shortcuts
            </div>
          )}
          {filtered.map((group) => (
            <div key={group.category}>
              <div style={categoryStyle}>{group.category}</div>
              {group.shortcuts.map((s) => (
                <div key={s.label} style={rowStyle}>
                  <span>{s.label}</span>
                  <kbd style={kbdStyle}>{s.keys}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
