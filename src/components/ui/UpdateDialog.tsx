import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { ipc } from '../../lib/ipc';

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
}

type UpdateState = 'checking' | 'update-available' | 'downloading' | 'up-to-date' | 'error';

interface UpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
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
  width: 420,
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-standard)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  padding: '28px',
};

const titleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text-bright)',
  marginBottom: 16,
};

const bodyTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  marginBottom: 20,
  whiteSpace: 'pre-wrap',
  maxHeight: 200,
  overflowY: 'auto',
};

const buttonRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const btnBase: CSSProperties = {
  padding: '6px 16px',
  border: '1px solid var(--border-standard)',
  borderRadius: 5,
  background: 'var(--surface-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: 'var(--accent-blue)',
  borderColor: 'var(--accent-blue)',
  color: '#fff',
};

const progressBar: CSSProperties = {
  width: '100%',
  height: 4,
  borderRadius: 2,
  background: 'var(--surface-elevated)',
  marginBottom: 16,
  overflow: 'hidden',
};

const progressFill: CSSProperties = {
  height: '100%',
  borderRadius: 2,
  background: 'var(--accent-blue)',
  transition: 'width 0.3s',
};

const spinnerStyle: CSSProperties = {
  display: 'inline-block',
  width: 16,
  height: 16,
  border: '2px solid var(--border-subtle)',
  borderTopColor: 'var(--accent-blue)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  marginRight: 8,
  verticalAlign: 'middle',
};

export default function UpdateDialog({ open, onClose }: UpdateDialogProps) {
  const [state, setState] = useState<UpdateState>('checking');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState('0.0.0');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;

    setState('checking');
    setUpdateInfo(null);
    setErrorMessage('');

    ipc.getAppInfo().then((info) => {
      setCurrentVersion(info.version);
    }).catch(() => {});

    ipc.checkForUpdates().then((info) => {
      if (info) {
        setUpdateInfo(info);
        setState('update-available');
      } else {
        setState('up-to-date');
      }
    }).catch((err) => {
      setErrorMessage(String(err));
      setState('error');
    });

    // Update last check timestamp
    ipc.setSetting('updates.lastCheck', Date.now()).catch(() => {});
  }, [open]);

  const handleInstall = useCallback(() => {
    setState('downloading');
    ipc.installUpdate().catch((err) => {
      setErrorMessage(String(err));
      setState('error');
    });
    // If successful, the app restarts -- we won't reach here
  }, []);

  const handleSkipVersion = useCallback(() => {
    if (updateInfo) {
      ipc.setSetting('updates.skippedVersion', updateInfo.version).catch(() => {});
    }
    onClose();
  }, [updateInfo, onClose]);

  if (!open) return null;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {/* Inline keyframe for spinner */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {state === 'checking' && (
          <>
            <div style={titleStyle}>Checking for Updates</div>
            <div style={bodyTextStyle}>
              <span style={spinnerStyle} />
              Checking for available updates...
            </div>
            <div style={buttonRow}>
              <button style={btnBase} onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {state === 'up-to-date' && (
          <>
            <div style={titleStyle}>You're Up to Date</div>
            <div style={bodyTextStyle}>
              Version {currentVersion} is the latest version available.
            </div>
            <div style={buttonRow}>
              <button style={btnPrimary} onClick={onClose}>OK</button>
            </div>
          </>
        )}

        {state === 'update-available' && updateInfo && (
          <>
            <div style={titleStyle}>Update Available</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
              {currentVersion} &rarr; {updateInfo.version}
            </div>
            {updateInfo.body && (
              <div style={bodyTextStyle}>
                {updateInfo.body}
              </div>
            )}
            <div style={buttonRow}>
              <button style={btnBase} onClick={handleSkipVersion}>Skip This Version</button>
              <button style={btnBase} onClick={onClose}>Remind Me Later</button>
              <button style={btnPrimary} onClick={handleInstall}>Download &amp; Install</button>
            </div>
          </>
        )}

        {state === 'downloading' && (
          <>
            <div style={titleStyle}>Downloading Update</div>
            <div style={progressBar}>
              <div style={{ ...progressFill, width: '60%' }} />
            </div>
            <div style={bodyTextStyle}>
              Downloading and installing update. The app will restart automatically.
            </div>
            <div style={buttonRow}>
              <button style={btnBase} disabled>Please wait...</button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={titleStyle}>Update Error</div>
            <div style={{ ...bodyTextStyle, color: 'var(--accent-red)' }}>
              {errorMessage || 'An unknown error occurred while checking for updates.'}
            </div>
            <div style={buttonRow}>
              <button style={btnPrimary} onClick={onClose}>OK</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
