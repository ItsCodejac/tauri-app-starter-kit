import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

interface PanelLayoutProps {
  leftPanel?: ReactNode;
  centerPanel?: ReactNode;
  rightPanel?: ReactNode;
  bottomPanel?: ReactNode;
  leftLabel?: string;
  centerLabel?: string;
  rightLabel?: string;
  bottomLabel?: string;
  leftWidth?: number;
  rightWidth?: number;
  bottomHeight?: number;
}

const STORAGE_KEY = 'panel-layout-sizes';
const MIN_PANEL = 80;
const HEADER_HEIGHT = 28;

function loadSizes(defaults: { left: number; right: number; bottom: number }) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return defaults;
}

function saveSizes(sizes: { left: number; right: number; bottom: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch { /* ignore */ }
}

function PanelHeader({ label, collapsed, onDoubleClick }: {
  label: string;
  collapsed: boolean;
  onDoubleClick: () => void;
}) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      style={{
        height: HEADER_HEIGHT,
        minHeight: HEADER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        background: 'var(--surface-secondary)',
        borderBottom: '1px solid var(--border-standard)',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <span style={{
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s',
        marginRight: 6,
        fontSize: 9,
      }}>
        &#9660;
      </span>
      {label}
    </div>
  );
}

export default function PanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
  leftLabel = 'Left',
  centerLabel = 'Center',
  rightLabel = 'Right',
  bottomLabel = 'Bottom',
  leftWidth: defaultLeft = 240,
  rightWidth: defaultRight = 240,
  bottomHeight: defaultBottom = 200,
}: PanelLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState(() =>
    loadSizes({ left: defaultLeft, right: defaultRight, bottom: defaultBottom })
  );
  const [collapsed, setCollapsed] = useState({ left: false, right: false, bottom: false });
  const dragging = useRef<{ edge: 'left' | 'right' | 'bottom'; startPos: number; startSize: number } | null>(null);

  useEffect(() => { saveSizes(sizes); }, [sizes]);

  const onMouseDown = useCallback((edge: 'left' | 'right' | 'bottom', e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = edge === 'bottom' ? e.clientY : e.clientX;
    const startSize = sizes[edge];
    dragging.current = { edge, startPos, startSize };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const { edge, startPos, startSize } = dragging.current;
      if (edge === 'bottom') {
        const delta = startPos - ev.clientY;
        setSizes((s: typeof sizes) => ({ ...s, bottom: Math.max(MIN_PANEL, startSize + delta) }));
      } else if (edge === 'left') {
        const delta = ev.clientX - startPos;
        setSizes((s: typeof sizes) => ({ ...s, left: Math.max(MIN_PANEL, startSize + delta) }));
      } else {
        const delta = startPos - ev.clientX;
        setSizes((s: typeof sizes) => ({ ...s, right: Math.max(MIN_PANEL, startSize + delta) }));
      }
    };

    const onMouseUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = edge === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sizes]);

  const toggleCollapse = useCallback((panel: 'left' | 'right' | 'bottom') => {
    setCollapsed((c) => ({ ...c, [panel]: !c[panel] }));
  }, []);

  const leftW = collapsed.left ? HEADER_HEIGHT : sizes.left;
  const rightW = collapsed.right ? HEADER_HEIGHT : sizes.right;
  const bottomH = collapsed.bottom ? HEADER_HEIGHT : sizes.bottom;

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top row: left | handle | center | handle | right */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left panel */}
        {leftPanel && (
          <>
            <div style={{
              width: leftW,
              minWidth: collapsed.left ? HEADER_HEIGHT : MIN_PANEL,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'var(--surface-primary)',
              borderRight: '1px solid var(--border-standard)',
            }}>
              <PanelHeader
                label={leftLabel}
                collapsed={collapsed.left}
                onDoubleClick={() => toggleCollapse('left')}
              />
              {!collapsed.left && (
                <div style={{ flex: 1, overflow: 'auto' }}>{leftPanel}</div>
              )}
            </div>
            <div
              onMouseDown={(e) => onMouseDown('left', e)}
              style={{
                width: 4,
                cursor: 'col-resize',
                flexShrink: 0,
                background: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border-standard)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            />
          </>
        )}

        {/* Center panel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--surface-base)',
          minWidth: 200,
        }}>
          <PanelHeader
            label={centerLabel}
            collapsed={false}
            onDoubleClick={() => {}}
          />
          <div style={{ flex: 1, overflow: 'auto' }}>{centerPanel}</div>
        </div>

        {/* Right panel */}
        {rightPanel && (
          <>
            <div
              onMouseDown={(e) => onMouseDown('right', e)}
              style={{
                width: 4,
                cursor: 'col-resize',
                flexShrink: 0,
                background: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border-standard)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            />
            <div style={{
              width: rightW,
              minWidth: collapsed.right ? HEADER_HEIGHT : MIN_PANEL,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'var(--surface-primary)',
              borderLeft: '1px solid var(--border-standard)',
            }}>
              <PanelHeader
                label={rightLabel}
                collapsed={collapsed.right}
                onDoubleClick={() => toggleCollapse('right')}
              />
              {!collapsed.right && (
                <div style={{ flex: 1, overflow: 'auto' }}>{rightPanel}</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom panel */}
      {bottomPanel && (
        <>
          <div
            onMouseDown={(e) => onMouseDown('bottom', e)}
            style={{
              height: 4,
              cursor: 'row-resize',
              flexShrink: 0,
              background: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-blue-dim)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          />
          <div style={{
            height: bottomH,
            minHeight: collapsed.bottom ? HEADER_HEIGHT : MIN_PANEL,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--surface-primary)',
            borderTop: '1px solid var(--border-standard)',
          }}>
            <PanelHeader
              label={bottomLabel}
              collapsed={collapsed.bottom}
              onDoubleClick={() => toggleCollapse('bottom')}
            />
            {!collapsed.bottom && (
              <div style={{ flex: 1, overflow: 'auto' }}>{bottomPanel}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
