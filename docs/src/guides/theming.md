# Theming

All colors, fonts, and visual tokens are CSS custom properties defined in `src/styles/shared.css`. All windows (main and utility) import this file for consistent styling.

## Surface Scale

Background layers from darkest to lightest:

```css
--surface-base:      #0d0d0d;   /* App background */
--surface-primary:   #1a1a1a;   /* Main panels, inputs */
--surface-secondary: #222;      /* Sidebars, group boxes */
--surface-tertiary:  #2a2a2a;   /* Nested panels, buttons */
--surface-hover:     #333;      /* Hover state */
--surface-active:    #3a3a3a;   /* Active/pressed state */
--surface-elevated:  #444;      /* Tooltips, popovers */
```

## Border Scale

```css
--border-subtle:    #2a2a2a;   /* Panel dividers, section separators */
--border-standard:  #3a3a3a;   /* Input borders, dialog borders */
--border-emphasis:  #555;      /* Scrollbar thumbs, active borders */
--border-bright:    #666;      /* Scrollbar thumb hover, strong emphasis */
```

## Text Scale

```css
--text-primary:   #e0e0e0;   /* Body text */
--text-secondary: #999;      /* Labels, captions */
--text-tertiary:  #666;      /* Disabled, placeholder */
--text-bright:    #fff;      /* Headings, selected items */
```

## Accent Colors

```css
--accent-blue:     #4a9eff;                  /* Primary action, links, focus rings */
--accent-blue-dim: rgba(74, 158, 255, 0.15); /* Selection background */
--accent-green:    #4caf50;                  /* Success */
--accent-orange:   #ff9800;                  /* Warning */
--accent-red:      #f44336;                  /* Error, destructive */
```

## Font Stacks

```css
--font-ui:   -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
```

## Changing the Accent Color

There are two places to set the accent color:

1. **CSS custom property** in `src/styles/shared.css` -- sets the default `--accent-blue` value
2. **Branding config** in `src/lib/branding.js` -- the `accentColor` field, which is applied dynamically via JavaScript to override `--accent-blue` at runtime

To change your accent color, update both:

```css
/* src/styles/shared.css */
:root {
  --accent-blue:     #8b5cf6;                   /* Purple accent */
  --accent-blue-dim: rgba(139, 92, 246, 0.15);
}
```

```javascript
/* src/lib/branding.js */
export const branding = {
  accentColor: "#8b5cf6",
  // ...
};
```

## Adding a Light Theme

Create a class or media query override in `shared.css`:

```css
:root[data-theme="light"] {
  --surface-base:      #f5f5f5;
  --surface-primary:   #fff;
  --surface-secondary: #fafafa;
  --surface-tertiary:  #f0f0f0;
  --surface-hover:     #e8e8e8;
  --surface-active:    #ddd;
  --surface-elevated:  #fff;

  --border-subtle:    #e5e5e5;
  --border-standard:  #d5d5d5;
  --border-emphasis:  #bbb;
  --border-bright:    #999;

  --text-primary:   #1a1a1a;
  --text-secondary: #666;
  --text-tertiary:  #999;
  --text-bright:    #000;

  --accent-blue-dim: rgba(74, 158, 255, 0.1);
}
```

Toggle by setting the attribute on `<html>`:

```javascript
document.documentElement.setAttribute('data-theme', 'light');
```

Persist the choice with the settings system:

```javascript
import { ipc } from './lib/ipc.js';

const theme = await ipc.getSetting('theme');
```

## Color Scheme and Native Controls

`shared.css` declares `color-scheme: dark` on `:root`. This instructs the browser to render all native form controls (scrollbars, checkboxes, select dropdowns, date pickers, color pickers, etc.) in their dark appearance. Without it, native controls would render in light mode, clashing with the dark UI.

If you add a light theme, update the color-scheme accordingly:

```css
:root[data-theme="light"] {
  color-scheme: light;
}
```

## Accessibility CSS Features

### Reduced Motion

The `reduce_motion` setting (boolean, default `false`) disables transitions and animations app-wide. When enabled, the app applies:

```css
@media (prefers-reduced-motion: reduce), [data-reduce-motion="true"] {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

When adding new animations or transitions, always respect this setting. Use the `--reduce-motion` CSS variable or the `prefers-reduced-motion` media query.

### High Contrast

The `high_contrast` setting (boolean, default `false`) increases contrast for text and borders. When enabled, key adjustments include stronger border colors and brighter text values.

## Font Size Customization

The `font_size` setting controls the base font size for the entire app via the `--font-size-base` CSS variable:

| Setting Value | CSS Value |
|--------------|-----------|
| `"small"` | `12px` |
| `"default"` | `13px` |
| `"large"` | `14px` |
| `"extra-large"` | `16px` |

The variable is set dynamically on `document.documentElement` when the setting changes. All text sizes derive from this base, so changing it scales the entire UI proportionally.

```javascript
// Applied automatically by the settings window
document.documentElement.style.setProperty('--font-size-base', '14px');
```

## Base Styles

`shared.css` includes a full reset and base styles:

- `* { margin: 0; padding: 0; box-sizing: border-box; }`
- Body font size: `13px`
- Body `user-select: none` (drag prevention)
- `#app` is a full-viewport flex column
- Styled scrollbars (6px wide, rounded, themed)
- Focus ring: 2px `--accent-blue` outline
- Text selection: `--accent-blue-dim` background
- Button styles: standard and `.primary` variants
- Input/select/textarea styles with focus states
- Checkbox with accent color

## Built-in UI Components

`shared.css` includes styles for common desktop patterns:

- **`.group-box`** -- bordered section with `.group-box-title` header
- **`.section`** -- padded section with `.section-title` header
- **`.setting-row`** -- flex row for label + control pairs
- **Links** -- styled with accent color

## Utility Classes

| Class | Effect |
|-------|--------|
| `.text-primary` | `color: var(--text-primary)` |
| `.text-secondary` | `color: var(--text-secondary)` |
| `.text-tertiary` | `color: var(--text-tertiary)` |
| `.text-bright` | `color: var(--text-bright)` |
| `.text-accent` | `color: var(--accent-blue)` |
| `.mono` | Monospace font |
| `.truncate` | Single-line text with ellipsis overflow |
| `.selectable` | Enables text selection (overrides global `user-select: none`) |
| `.hidden` | `display: none !important` |
| `.flex`, `.flex-col`, `.flex-1` | Flexbox helpers |
| `.items-center`, `.justify-between`, `.justify-center` | Alignment |
| `.gap-4`, `.gap-8`, `.gap-12`, `.gap-16` | 4px / 8px / 12px / 16px gap |

## Cross-Platform CSS Normalization

TASK includes a basic cross-platform CSS reset in `shared.css`. For more comprehensive normalization across WebKit (macOS/Linux) and Chromium (Windows) webviews, consider using [tauri-plugin-normalize](https://github.com/ItsCodejac/tauri-plugin-normalize):

```toml
tauri-plugin-normalize = { git = "https://github.com/ItsCodejac/tauri-plugin-normalize" }
```

The plugin auto-injects normalizing CSS on every page load and adds platform classes (`.webview-webkit` or `.webview-chromium`) for targeted styling.
