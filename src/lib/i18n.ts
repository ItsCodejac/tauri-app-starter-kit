/**
 * Simple i18n system for the template.
 *
 * - Loads JSON locale files from src/locales/
 * - Flat key lookup with dot-notation: t('menu.file.new')
 * - Interpolation: t('files.count', { count: 5 }) => "5 files"
 * - Falls back to English when a key is missing in the active locale
 * - Detects system locale via navigator.language
 */

import enMessages from '../locales/en.json';
import esMessages from '../locales/es.json';

export type LocaleMessages = Record<string, string>;

/** All bundled locales. Add new ones here. */
export const locales: Record<string, LocaleMessages> = {
  en: enMessages,
  es: esMessages,
};

export const availableLocales = Object.keys(locales);

export const localeLabels: Record<string, string> = {
  en: 'English',
  es: 'Espanol',
};

/**
 * Detect the best locale from navigator.language.
 * Returns the language subtag (e.g. "en" from "en-US") if we support it,
 * otherwise falls back to "en".
 */
export function detectLocale(): string {
  try {
    const lang = navigator.language?.split('-')[0] ?? 'en';
    return lang in locales ? lang : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Create a translation function for the given locale.
 *
 * Looks up `key` in the locale's messages. If not found, falls back to
 * English. If still not found, returns the key itself.
 *
 * Supports interpolation: `{varName}` in the string is replaced with the
 * corresponding value from `params`.
 */
export function createT(locale: string) {
  const messages = locales[locale] ?? locales.en;
  const fallback = locales.en;

  return function t(key: string, params?: Record<string, string | number>): string {
    let text = messages[key] ?? fallback[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }

    return text;
  };
}

export type TFunction = ReturnType<typeof createT>;
