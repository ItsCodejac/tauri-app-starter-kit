import { useState, useEffect, type CSSProperties } from 'react';
import { ipc } from '../../lib/ipc';

interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
}

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
  width: 480,
  maxHeight: '70vh',
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-standard)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  padding: '24px 28px 16px',
  borderBottom: '1px solid var(--border-subtle)',
  flexShrink: 0,
};

const bodyStyle: CSSProperties = {
  flex: 1,
  padding: '20px 28px',
  overflowY: 'auto',
  fontSize: 13,
  lineHeight: 1.7,
  color: 'var(--text-secondary)',
  whiteSpace: 'pre-wrap',
};

const footerStyle: CSSProperties = {
  padding: '12px 28px 20px',
  display: 'flex',
  justifyContent: 'flex-end',
  flexShrink: 0,
};

const btnPrimary: CSSProperties = {
  padding: '6px 20px',
  border: '1px solid var(--accent-blue)',
  borderRadius: 5,
  background: 'var(--accent-blue)',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

/**
 * Changelog entries. Update this array for each release.
 * The first entry should be the current version.
 */
const changelog: { version: string; date: string; notes: string }[] = [
  {
    version: '0.1.0',
    date: '2026-04-13',
    notes: [
      '- Initial release',
      '- Multi-panel workspace layout with resizable panels',
      '- Command palette with fuzzy search',
      '- Keyboard shortcuts system',
      '- System tray with minimize-to-tray support',
      '- Autosave and crash recovery',
      '- Settings persistence with tauri-plugin-store',
      '- Internationalization (English, Spanish)',
      '- Drag-and-drop file support',
      '- Native menu bar with zoom, fullscreen, and stay-on-top',
      '- Auto-updater infrastructure',
      '- Application log viewer',
      '- Crash report viewer and diagnostics',
    ].join('\n'),
  },
];

export default function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps) {
  const [version, setVersion] = useState('0.0.0');

  useEffect(() => {
    if (open) {
      ipc.getAppInfo().then((info) => {
        setVersion(info.version);
      }).catch(() => {});
    }
  }, [open]);

  const handleClose = () => {
    // Mark current version as seen
    ipc.setSetting('app.lastSeenVersion', version).catch(() => {});
    onClose();
  };

  if (!open) return null;

  // Find changelog entry for current version, or show the latest
  const entry = changelog.find((c) => c.version === version) ?? changelog[0];

  return (
    <div style={backdrop} onClick={handleClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>
            What's New
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Version {entry?.version ?? version} {entry?.date ? `(${entry.date})` : ''}
          </div>
        </div>
        <div style={bodyStyle}>
          {entry?.notes ?? 'No release notes available for this version.'}
        </div>
        <div style={footerStyle}>
          <button style={btnPrimary} onClick={handleClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
