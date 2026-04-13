import type { CSSProperties } from 'react';

interface DropOverlayProps {
  visible: boolean;
  message?: string;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.55)',
  pointerEvents: 'none',
};

const innerStyle: CSSProperties = {
  border: '2px dashed var(--border-bright)',
  borderRadius: 12,
  padding: '48px 64px',
  color: 'var(--text-primary)',
  fontSize: 16,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500,
  letterSpacing: 0.3,
  userSelect: 'none',
  background: 'var(--surface-secondary)',
};

/**
 * Full-screen overlay shown when files are dragged over the window.
 *
 * Renders a semi-transparent dark backdrop with a dashed-border drop zone
 * and a message (defaults to "Drop files here").
 */
export default function DropOverlay({ visible, message = 'Drop files here' }: DropOverlayProps) {
  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={innerStyle}>{message}</div>
    </div>
  );
}
