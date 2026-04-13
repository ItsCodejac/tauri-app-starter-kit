import { useState, useEffect, type CSSProperties } from 'react';
import { ipc } from '../../lib/ipc';
import { branding } from '../../lib/branding';

interface AboutDialogProps {
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
  width: 360,
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-standard)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  padding: '32px 28px 24px',
  textAlign: 'center',
};

const iconStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 14,
  background: 'var(--surface-elevated)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--accent-blue)',
  marginBottom: 16,
  overflow: 'hidden',
};

const logoImgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

const linkBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--accent-blue)',
  fontSize: 12,
  cursor: 'pointer',
  padding: '4px 8px',
  fontFamily: 'var(--font-ui)',
};

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [appName, setAppName] = useState(branding.name || 'TASK App');
  const [version, setVersion] = useState('0.1.0');

  useEffect(() => {
    if (open) {
      ipc.getAppInfo().then((info) => {
        setAppName(info.name || branding.name);
        setVersion(info.version);
      }).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const initial = appName.charAt(0).toUpperCase();
  const websiteUrl = branding.website;
  const githubUrl = branding.github;
  const hasLinks = websiteUrl || githubUrl || branding.licenseInfo;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={iconStyle}>
          {branding.logo ? (
            <img src={branding.logo} alt={appName} style={logoImgStyle} draggable={false} />
          ) : (
            initial
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>
          {appName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
          Version {version}
        </div>
        {branding.tagline && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
            {branding.tagline}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          {branding.copyright}
        </div>
        {hasLinks && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
            {websiteUrl && (
              <button
                style={linkBtn}
                onClick={() => ipc.openExternalUrl(websiteUrl).catch(() => {})}
              >
                Website
              </button>
            )}
            {websiteUrl && githubUrl && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: '24px' }}>|</span>
            )}
            {githubUrl && (
              <button
                style={linkBtn}
                onClick={() => ipc.openExternalUrl(githubUrl).catch(() => {})}
              >
                GitHub
              </button>
            )}
            {(websiteUrl || githubUrl) && branding.licenseInfo && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: '24px' }}>|</span>
            )}
            {branding.licenseInfo && (
              <button
                style={linkBtn}
                onClick={() => {
                  if (branding.licenseInfo.startsWith('http')) {
                    ipc.openExternalUrl(branding.licenseInfo).catch(() => {});
                  }
                }}
              >
                Licenses
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
