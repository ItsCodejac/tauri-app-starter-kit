import type { ReactNode } from 'react';

interface StatusBarProps {
  statusText?: string;
  rightContent?: ReactNode;
}

export default function StatusBar({ statusText = 'Ready', rightContent }: StatusBarProps) {
  return (
    <div
      style={{
        height: 24,
        minHeight: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        background: 'var(--surface-tertiary)',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 11,
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}
    >
      <span className="truncate" style={{ flex: 1 }}>{statusText}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {rightContent}
      </span>
    </div>
  );
}
