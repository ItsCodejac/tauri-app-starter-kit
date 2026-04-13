import { createContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import {
  createT,
  detectLocale,
  availableLocales as localeList,
  type TFunction,
} from '../lib/i18n';
import { ipc } from '../lib/ipc';

interface I18nContextValue {
  /** Translate a key, optionally with interpolation params. */
  t: TFunction;
  /** Current active locale code (e.g. "en"). */
  locale: string;
  /** Switch to a different locale. Persists to settings. */
  setLocale: (locale: string) => void;
  /** List of available locale codes. */
  availableLocales: string[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(detectLocale);
  const [loaded, setLoaded] = useState(false);

  // On mount, check if a locale was previously saved in settings
  useEffect(() => {
    ipc.getSetting('locale')
      .then((saved) => {
        if (typeof saved === 'string' && localeList.includes(saved)) {
          setLocaleState(saved);
        }
      })
      .catch(() => {
        // No saved locale -- use detected
      })
      .finally(() => setLoaded(true));
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    if (localeList.includes(newLocale)) {
      setLocaleState(newLocale);
      ipc.setSetting('locale', newLocale).catch(() => {
        // Best-effort persist
      });
    }
  }, []);

  const t = useMemo(() => createT(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ t, locale, setLocale, availableLocales: localeList }),
    [t, locale, setLocale],
  );

  // Don't render children until we've checked for a saved locale
  if (!loaded) return null;

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
