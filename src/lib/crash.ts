/**
 * Frontend crash reporting utilities.
 *
 * Sends unhandled JS errors and unhandled promise rejections to the Rust
 * backend so they are persisted alongside native crash reports.
 */

import { ipc, type CrashReport } from './ipc';

// Re-export for convenience
export type { CrashReport };

// ---------------------------------------------------------------------------
// Error reporting
// ---------------------------------------------------------------------------

export function reportFrontendError(error: Error, componentStack?: string): void {
  ipc.logFrontendError(
    error.message,
    error.stack ?? undefined,
    componentStack,
  ).catch((e: unknown) => {
    // Last resort -- don't let reporting failures cascade
    console.error('Failed to report frontend error to backend:', e);
  });
}

// ---------------------------------------------------------------------------
// Crash report queries (convenience re-exports from facade)
// ---------------------------------------------------------------------------

export const hasRecentCrash = (): Promise<CrashReport | null> => ipc.hasRecentCrash();
export const listCrashReports = (): Promise<CrashReport[]> => ipc.listCrashReports();
export const getCrashReport = (name: string): Promise<string> => ipc.getCrashReport(name);
export const clearCrashReports = (): Promise<void> => ipc.clearCrashReports();

// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------

/**
 * Install global `onerror` and `onunhandledrejection` handlers that forward
 * uncaught errors to the Rust crash reporter.  Call once at app startup.
 */
export function installGlobalErrorHandlers(): void {
  window.onerror = (
    _event: Event | string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error,
  ) => {
    const err = error ?? new Error(String(_event));
    if (!err.stack && source) {
      err.stack = `${source}:${lineno ?? 0}:${colno ?? 0}`;
    }
    reportFrontendError(err);
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const err =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    reportFrontendError(err);
  };
}
