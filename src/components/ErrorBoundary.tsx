import { Component, type ErrorInfo, type ReactNode } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { reportFrontendError } from '../lib/crash';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary that catches render errors in the component tree.
 * Shows a dark-themed recovery UI instead of a white screen, and reports
 * the error to the Rust crash reporter via IPC.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportFrontendError(error, info.componentStack ?? undefined);
  }

  private handleReload = (): void => {
    relaunch().catch(() => {
      // Fallback if relaunch fails
      window.location.reload();
    });
  };

  private handleCopyError = (): void => {
    const { error } = this.state;
    if (!error) return;
    const text = `${error.message}\n\n${error.stack ?? '(no stack trace)'}`;
    writeText(text).catch(() => {
      // Clipboard plugin may not be available
    });
  };

  override render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const { error } = this.state;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#e0e0e0',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          zIndex: 999999,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: 32,
            borderRadius: 8,
            backgroundColor: '#2a2a2a',
            border: '1px solid #3a3a3a',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              margin: '0 0 12px',
              color: '#ffffff',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#aaaaaa',
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}
          >
            {error.message}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
              }}
            >
              Reload
            </button>
            <button
              onClick={this.handleCopyError}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid #555555',
                borderRadius: 6,
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#cccccc',
              }}
            >
              Copy Error
            </button>
          </div>
        </div>
      </div>
    );
  }
}
