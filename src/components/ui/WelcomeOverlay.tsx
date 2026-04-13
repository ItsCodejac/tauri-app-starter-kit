import type { CSSProperties } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.7)',
  zIndex: 50000,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const card: CSSProperties = {
  maxWidth: 440,
  width: '90%',
  padding: '40px 36px',
  borderRadius: 12,
  background: '#1e1e1e',
  border: '1px solid #333',
  textAlign: 'center',
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  margin: '0 0 12px',
  color: '#ffffff',
};

const messageStyle: CSSProperties = {
  fontSize: 14,
  color: '#aaaaaa',
  margin: '0 0 28px',
  lineHeight: 1.6,
};

const buttonStyle: CSSProperties = {
  padding: '10px 32px',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  transition: 'background-color 0.15s',
};

/**
 * Full-screen welcome overlay shown on first launch.
 *
 * Replace the placeholder content with your own onboarding experience.
 */
export default function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { t } = useTranslation();

  return (
    <div style={backdrop}>
      <div style={card}>
        <h1 style={titleStyle}>{t('app.welcome.title')}</h1>
        <p style={messageStyle}>{t('app.welcome.message')}</p>
        <button
          style={buttonStyle}
          onClick={onDismiss}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3b82f6';
          }}
        >
          {t('app.welcome.getStarted')}
        </button>
      </div>
    </div>
  );
}
