import { useContext } from 'react';
import { I18nContext } from '../contexts/I18nContext';

/**
 * Hook to access translations.
 *
 * Returns:
 * - `t(key, params?)` -- translate a key with optional interpolation
 * - `locale` -- current locale code
 * - `setLocale(code)` -- switch locale (persists to settings)
 * - `availableLocales` -- list of supported locale codes
 */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}
