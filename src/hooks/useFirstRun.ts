import { useState, useEffect, useCallback } from 'react';
import { ipc } from '../lib/ipc';

/**
 * Checks whether this is the user's first launch.
 *
 * On first mount reads `first_run` from settings (defaults to true).
 * `dismissFirstRun()` sets it to false so the welcome screen won't appear again.
 */
export function useFirstRun() {
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    ipc.getSetting('first_run')
      .then((value) => {
        // If the key doesn't exist yet it's a first run
        setIsFirstRun(value === true);
      })
      .catch(() => {
        // Key not found -> first run
        setIsFirstRun(true);
      })
      .finally(() => setLoaded(true));
  }, []);

  const dismissFirstRun = useCallback(async () => {
    setIsFirstRun(false);
    try {
      await ipc.setSetting('first_run', false);
    } catch (err) {
      console.error('Failed to dismiss first run:', err);
    }
  }, []);

  return { isFirstRun, loaded, dismissFirstRun };
}
