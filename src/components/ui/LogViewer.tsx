import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { ipc } from '../../lib/ipc';

interface LogViewerProps {
  open: boolean;
  onClose: () => void;
}

type LogLevel = 'all' | 'info' | 'warn' | 'error';

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
  width: 720,
  maxHeight: '80vh',
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-standard)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  padding: '16px 20px 12px',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-bright)',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

const selectStyle: CSSProperties = {
  background: 'var(--surface-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontSize: 11,
  padding: '3px 6px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  cursor: 'pointer',
};

const btnStyle: CSSProperties = {
  padding: '4px 12px',
  border: '1px solid var(--border-standard)',
  borderRadius: 4,
  background: 'var(--surface-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const logAreaStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '12px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  minHeight: 300,
  maxHeight: 'calc(80vh - 100px)',
};

function levelColor(line: string): string {
  if (line.includes('[ERROR]') || line.includes(' ERROR ')) return 'var(--accent-red)';
  if (line.includes('[WARN]') || line.includes(' WARN ')) return 'var(--accent-yellow, #e5a100)';
  return 'var(--text-secondary)';
}

function matchesLevel(line: string, level: LogLevel): boolean {
  if (level === 'all') return true;
  const upper = level.toUpperCase();
  return line.includes(`[${upper}]`) || line.includes(` ${upper} `);
}

export default function LogViewer({ open, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState('');
  const [filter, setFilter] = useState<LogLevel>('all');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const contents = await ipc.getLogContents();
      setLogs(contents);
    } catch (err) {
      setLogs(`Failed to load logs: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, loadLogs]);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, filter]);

  const handleCopy = useCallback(async () => {
    try {
      await ipc.clipboardWriteText(filteredLines.join('\n'));
    } catch {
      // Fallback
      await navigator.clipboard.writeText(filteredLines.join('\n'));
    }
  }, [logs, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = useCallback(() => {
    setLogs('');
  }, []);

  if (!open) return null;

  const lines = logs.split('\n');
  const filteredLines = filter === 'all' ? lines : lines.filter((l) => matchesLevel(l, filter));

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>Application Logs</div>
          <div style={toolbarStyle}>
            <select
              style={selectStyle}
              value={filter}
              onChange={(e) => setFilter(e.target.value as LogLevel)}
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <button style={btnStyle} onClick={loadLogs} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button style={btnStyle} onClick={handleCopy}>Copy All</button>
            <button style={btnStyle} onClick={handleClear}>Clear</button>
          </div>
        </div>
        <div ref={scrollRef} style={logAreaStyle}>
          {filteredLines.length === 0 ? (
            <span style={{ color: 'var(--text-tertiary)' }}>No log entries found.</span>
          ) : (
            filteredLines.map((line, i) => (
              <div key={i} style={{ color: levelColor(line) }}>{line}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
