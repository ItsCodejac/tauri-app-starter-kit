# Localization (i18n)

Flat-key translation system with JSON locale files, interpolation, and system locale detection. Defined in `src/lib/i18n.ts`.

## How It Works

1. Locale files live in `src/locales/` as flat JSON objects (`en.json`, `es.json`)
2. `createT(locale)` returns a `t()` function that looks up keys
3. Missing keys fall back to English, then return the raw key
4. The active locale is persisted in the `locale` setting

## Using Translations in Components

```tsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t, locale, setLocale, availableLocales } = useTranslation();

  return (
    <div>
      <h1>{t('app.welcome.title')}</h1>
      <p>{t('files.count', { count: 5 })}</p>
    </div>
  );
}
```

The hook returns:

| Property | Type | Description |
|----------|------|-------------|
| `t` | `(key, params?) => string` | Translate a key |
| `locale` | `string` | Current locale code (`"en"`) |
| `setLocale` | `(code) => void` | Switch locale (persists to settings) |
| `availableLocales` | `string[]` | List of supported locale codes |

## String Interpolation

Use `{varName}` placeholders in locale strings:

```json
{
  "files.count": "{count} file(s)",
  "toast.droppedFiles": "Dropped {count} file(s): {names}"
}
```

```ts
t('files.count', { count: 5 })        // "5 file(s)"
t('toast.droppedFiles', { count: 2, names: 'a.txt, b.txt' })
```

## Adding a New Language

### 1. Create the locale file

Copy `src/locales/en.json` to `src/locales/fr.json` and translate each value:

```json
{
  "app.welcome.title": "Bienvenue",
  "status.ready": "Pret"
}
```

### 2. Register it in `src/lib/i18n.ts`

```ts
import frMessages from '../locales/fr.json';

export const locales: Record<string, LocaleMessages> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,     // add here
};

export const localeLabels: Record<string, string> = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',    // add here
};
```

That's it. The locale will appear in `availableLocales` and can be selected with `setLocale('fr')`.

## System Locale Detection

On first launch (before the user picks a locale), `detectLocale()` reads `navigator.language`, extracts the language subtag (e.g. `"en"` from `"en-US"`), and uses it if a matching locale file exists. Otherwise falls back to `"en"`.

```ts
export function detectLocale(): string {
  const lang = navigator.language?.split('-')[0] ?? 'en';
  return lang in locales ? lang : 'en';
}
```

## Locale Selector Pattern

A simple dropdown using the hook:

```tsx
function LocaleSelector() {
  const { locale, setLocale, availableLocales } = useTranslation();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      {availableLocales.map((code) => (
        <option key={code} value={code}>{code.toUpperCase()}</option>
      ))}
    </select>
  );
}
```

## Limitation: Rust Menus

Native menu items (File, Edit, Help, etc.) are built in Rust and are **not** translated by this i18n system. They use hardcoded English strings. To localize menus, you would need to rebuild the menu when the locale changes from the Rust side, which is not yet implemented.
