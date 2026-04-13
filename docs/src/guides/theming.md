# Theming

All colors, fonts, and visual tokens are CSS custom properties defined in `src/styles/theme.css`. Components reference these variables instead of hard-coded values.

## Surface Scale

Background layers from darkest to lightest:

```css
--surface-base:      #0d0d0d;   /* App background */
--surface-primary:   #1a1a1a;   /* Main panels */
--surface-secondary: #222;      /* Sidebars, dialogs */
--surface-tertiary:  #2a2a2a;   /* Nested panels */
--surface-hover:     #333;      /* Hover state */
--surface-active:    #3a3a3a;   /* Active/pressed state */
--surface-elevated:  #444;      /* Tooltips, popovers */
```

## Border Scale

```css
--border-subtle:    #2a2a2a;   /* Dividers within a panel */
--border-standard:  #3a3a3a;   /* Panel edges */
--border-emphasis:  #555;      /* Active borders, scrollbar thumb */
--border-bright:    #666;      /* Strong emphasis */
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
--accent-blue:     #4a9eff;                  /* Primary action */
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

Replace `--accent-blue` with your brand color. Update the dim variant to match:

```css
:root {
  --accent-blue:     #8b5cf6;                   /* Purple accent */
  --accent-blue-dim: rgba(139, 92, 246, 0.15);
}
```

Or rename the variables entirely if you prefer semantic naming:

```css
:root {
  --accent-primary:     #8b5cf6;
  --accent-primary-dim: rgba(139, 92, 246, 0.15);
}
```

## Adding a Light Theme

Create a class or media query override in `theme.css`:

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

```ts
document.documentElement.setAttribute('data-theme', 'light');
```

Persist the choice with the settings system:

```ts
const { getSetting, setSetting } = useSettings();
const theme = getSetting<string>('theme', 'dark');
```

## Global Styles (`global.css`)

`src/styles/global.css` provides:

### Scrollbar Styling

```css
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-emphasis); border-radius: 3px; }
```

### Focus Ring

```css
:focus-visible {
  outline: 2px solid var(--accent-blue);
  outline-offset: -2px;
}
```

### Text Selection

```css
::selection {
  background: var(--accent-blue-dim);
  color: var(--text-bright);
}
```

### Utility Classes

| Class | Effect |
|-------|--------|
| `.text-primary` | `color: var(--text-primary)` |
| `.text-secondary` | `color: var(--text-secondary)` |
| `.text-tertiary` | `color: var(--text-tertiary)` |
| `.text-bright` | `color: var(--text-bright)` |
| `.text-accent` | `color: var(--accent-blue)` |
| `.mono` | Monospace font |
| `.truncate` | Ellipsis overflow |
| `.selectable` | Enables text selection (off by default) |
| `.flex`, `.flex-col`, `.flex-1` | Flexbox helpers |
| `.items-center`, `.justify-between` | Alignment |
| `.gap-4`, `.gap-8` | 4px / 8px gap |
