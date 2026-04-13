import { useEffect, useRef, useState } from 'react';
import type { ContextMenuState } from '../../hooks/useContextMenu';

interface ContextMenuProps {
  menu: ContextMenuState | null;
  onClose: () => void;
}

export default function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!menu || !menuRef.current) return;

    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = menu.x;
    let y = menu.y;

    if (x + rect.width > vw) {
      x = menu.x - rect.width;
    }
    if (y + rect.height > vh) {
      y = menu.y - rect.height;
    }
    // Clamp to viewport edges
    x = Math.max(0, x);
    y = Math.max(0, y);

    // Only update if position actually changed to avoid cascading renders
    setPosition((prev) => {
      if (prev.x === x && prev.y === y) return prev;
      return { x, y };
    });
  }, [menu]);

  // Close on click outside
  useEffect(() => {
    if (!menu) return;

    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout so the opening right-click doesn't immediately close it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', onMouseDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        minWidth: 180,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-emphasis)',
        borderRadius: 6,
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        padding: '4px 0',
        zIndex: 10001,
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
      }}
    >
      {menu.items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${i}`}
              style={{
                height: 1,
                background: 'var(--border-standard)',
                margin: '4px 8px',
              }}
            />
          );
        }

        return (
          <div
            key={`${item.label}-${i}`}
            onClick={() => {
              if (item.disabled) return;
              onClose();
              item.action();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 28,
              padding: '0 12px',
              cursor: item.disabled ? 'default' : 'pointer',
              color: item.disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--accent-blue-dim)';
                (e.currentTarget as HTMLDivElement).style.color = 'var(--text-bright)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              (e.currentTarget as HTMLDivElement).style.color = item.disabled
                ? 'var(--text-tertiary)'
                : 'var(--text-primary)';
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                marginLeft: 24,
              }}>
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
