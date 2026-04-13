import { useState, useEffect, useCallback } from 'react';
import { ipc } from '../lib/ipc';

interface SettingsState {
  settings: Record<string, unknown>;
  loading: boolean;
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({ settings: {}, loading: true });

  useEffect(() => {
    let cancelled = false;
    ipc.getAllSettings()
      .then((settings) => {
        if (!cancelled) setState({ settings, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ settings: {}, loading: false });
      });
    return () => { cancelled = true; };
  }, []);

  const getSetting = useCallback(<T = unknown>(key: string, defaultValue?: T): T => {
    return (state.settings[key] as T) ?? (defaultValue as T);
  }, [state.settings]);

  const setSetting = useCallback(async <T = unknown>(key: string, value: T) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
    try {
      await ipc.setSetting(key, value);
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  }, []);

  return {
    settings: state.settings,
    getSetting,
    setSetting,
    loading: state.loading,
  };
}
