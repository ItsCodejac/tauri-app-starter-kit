import { useEffect, useState, type CSSProperties } from 'react';
import { branding } from '../../lib/branding';

export interface SplashScreenProps {
  /** Application name displayed prominently. */
  appName: string;
  /** Version string (e.g. "v0.1.0"). */
  version: string;
  /** Optional tagline shown below the version. */
  tagline?: string;
  /** Optional path to a logo image. When omitted, a styled first-letter is shown. */
  logoSrc?: string;
  /** Optional path to a background image for the splash screen. */
  backgroundSrc?: string;
  /** Status text shown below the progress bar (e.g. "Loading settings..."). */
  statusText?: string;
  /** When true the splash fades out and calls onExit after the transition. */
  ready: boolean;
  /** Called after the fade-out transition completes. */
  onExit: () => void;
}

/**
 * Full-screen splash / loading screen shown while the app initializes.
 *
 * Uses only inline styles so it renders before any external CSS is loaded.
 * Reads accent color and copyright from branding.ts.
 * Customize by passing your own props or updating branding.ts.
 */
export default function SplashScreen({
  appName,
  version,
  tagline,
  logoSrc,
  backgroundSrc,
  statusText = 'Loading\u2026',
  ready,
  onExit,
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      // Wait for the CSS fade-out transition to finish, then unmount.
      const timer = setTimeout(() => {
        setVisible(false);
        onExit();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [ready, onExit]);

  if (!visible) return null;

  const firstLetter = appName.charAt(0).toUpperCase();
  const accent = branding.accentColor || '#4a9eff';

  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    transition: 'opacity 300ms ease-out',
    opacity: ready ? 0 : 1,
    // Allow pointer events through once fading so the app below is interactive
    pointerEvents: ready ? 'none' : 'auto',
  };

  const bgImage: CSSProperties | undefined = backgroundSrc
    ? {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${backgroundSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }
    : undefined;

  const bgOverlay: CSSProperties | undefined = backgroundSrc
    ? {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        zIndex: 1,
      }
    : undefined;

  const container: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    animation: 'splash-fade-in 400ms ease-out',
  };

  const logoContainer: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: 14,
    background: logoSrc ? 'transparent' : `linear-gradient(135deg, ${accent} 0%, #2563eb 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: -1,
    userSelect: 'none',
    overflow: 'hidden',
    animation: ready ? 'none' : 'splash-logo-pulse 2s ease-in-out infinite',
  };

  const logoImg: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  const nameStyle: CSSProperties = {
    fontSize: 20,
    fontWeight: 600,
    color: '#e0e0e0',
    letterSpacing: 0.3,
    marginTop: 4,
  };

  const versionStyle: CSSProperties = {
    fontSize: 12,
    color: '#666',
    fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
  };

  const taglineStyle: CSSProperties = {
    fontSize: 11,
    color: '#555',
    fontStyle: 'italic',
  };

  const loaderTrack: CSSProperties = {
    width: 120,
    height: 2,
    background: '#2a2a2a',
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 16,
  };

  const loaderBar: CSSProperties = {
    height: '100%',
    width: '40%',
    background: `linear-gradient(90deg, ${accent}, #2563eb)`,
    borderRadius: 1,
    animation: 'splash-loader 1.2s ease-in-out infinite',
  };

  const statusStyle: CSSProperties = {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    transition: 'opacity 200ms ease',
  };

  const copyrightStyle: CSSProperties = {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#444',
    zIndex: 2,
  };

  return (
    <>
      {/* Keyframe animations injected inline */}
      <style>{`
        @keyframes splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-loader {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes splash-logo-pulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div style={overlay}>
        {backgroundSrc && <div style={bgImage} />}
        {backgroundSrc && <div style={bgOverlay} />}

        <div style={container}>
          <div style={logoContainer}>
            {logoSrc ? (
              <img src={logoSrc} alt={appName} style={logoImg} draggable={false} />
            ) : (
              firstLetter
            )}
          </div>

          <span style={nameStyle}>{appName}</span>
          <span style={versionStyle}>{version}</span>
          {tagline && <span style={taglineStyle}>{tagline}</span>}

          <div style={loaderTrack}>
            <div style={loaderBar} />
          </div>
          <span style={statusStyle}>{statusText}</span>
        </div>

        <span style={copyrightStyle}>{branding.copyright}</span>
      </div>
    </>
  );
}
