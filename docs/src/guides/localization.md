# Localization (i18n)

TASK includes the `locale` setting (defaults to `"en"`) and the `tauri-plugin-os` plugin for detecting the system locale, but does not include a built-in i18n framework. You can implement localization in whichever way suits your chosen frontend framework.

## Settings Support

The `locale` setting is already defined in `settings.rs`:

```rust
("locale", serde_json::json!("en")),
```

Read and write it from the frontend:

```javascript
import { ipc } from './lib/ipc.js';

const locale = await ipc.getSetting('locale');
await ipc.setSetting('locale', 'es');
```

## Implementing Localization

### Simple approach (vanilla JS)

Create a locale map and a translation function:

```javascript
const messages = {
  en: { 'app.title': 'My App', 'file.save': 'Save' },
  es: { 'app.title': 'Mi App', 'file.save': 'Guardar' },
};

let currentLocale = 'en';

function t(key) {
  return messages[currentLocale]?.[key] ?? messages.en[key] ?? key;
}
```

### Framework approach

If using React, Vue, or Svelte, use that framework's standard i18n library (e.g. `react-i18next`, `vue-i18n`, `svelte-i18n`).

## System Locale Detection

Use `tauri-plugin-os` to detect the system locale:

```javascript
import { locale as osLocale } from '@tauri-apps/plugin-os';

const systemLocale = await osLocale();
// e.g. "en-US", "es-ES"
const lang = systemLocale?.split('-')[0] ?? 'en';
```

## Limitation: Rust Menus

Native menu items (File, Edit, Help, etc.) are built in Rust and use hardcoded English strings. To localize menus, you would need to rebuild the menu when the locale changes from the Rust side, which is not yet implemented.
