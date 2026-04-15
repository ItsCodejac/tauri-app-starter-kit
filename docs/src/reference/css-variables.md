# CSS Variables Reference

All custom properties are defined in `src/styles/shared.css` on `:root`. Utility classes are also in `shared.css`.

## Surfaces

| Variable | Value | Use |
|----------|-------|-----|
| `--surface-base` | `#0d0d0d` | App background, deepest layer |
| `--surface-primary` | `#1a1a1a` | Side panels, inputs |
| `--surface-secondary` | `#222` | Group boxes, secondary regions |
| `--surface-tertiary` | `#2a2a2a` | Buttons, nested panels |
| `--surface-hover` | `#333` | Hover state for interactive items |
| `--surface-active` | `#3a3a3a` | Active/pressed state |
| `--surface-elevated` | `#444` | Floating elements with high prominence |

## Borders

| Variable | Value | Use |
|----------|-------|-----|
| `--border-subtle` | `#2a2a2a` | Panel dividers, section separators |
| `--border-standard` | `#3a3a3a` | Input borders, dialog borders |
| `--border-emphasis` | `#555` | Scrollbar thumbs, stronger dividers |
| `--border-bright` | `#666` | Scrollbar thumb hover, high-contrast borders |

## Text

| Variable | Value | Use |
|----------|-------|-----|
| `--text-primary` | `#e0e0e0` | Default body text |
| `--text-secondary` | `#999` | Labels, secondary info |
| `--text-tertiary` | `#777` | Placeholders, disabled text |
| `--text-bright` | `#fff` | Active items, headings |

## Accents

| Variable | Value | Use |
|----------|-------|-----|
| `--accent-blue` | `#4a9eff` | Primary action, focus rings, links |
| `--accent-blue-dim` | `rgba(74, 158, 255, 0.15)` | Selection background |
| `--accent-green` | `#4caf50` | Success indicators |
| `--accent-orange` | `#ff9800` | Warning indicators |
| `--accent-red` | `#f44336` | Error, destructive actions |

## Fonts

| Variable | Value | Use |
|----------|-------|-----|
| `--font-ui` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All UI text |
| `--font-mono` | `'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace` | Code, shortcuts |

## Color Scheme

```css
:root {
  color-scheme: dark;
}
```

The `color-scheme: dark` declaration tells the browser to render native controls (scrollbars, checkboxes, select dropdowns, date pickers, etc.) using their dark-mode appearance. Without this, native controls would appear in light mode even though the rest of the UI is dark.

## Dynamic Variables

These variables are set at runtime from user settings, not hardcoded in the stylesheet.

| Variable | Source | Use |
|----------|--------|-----|
| `--font-size-base` | `font_size` setting | Base font size applied to `body`. Values map to: Small = `12px`, Default = `13px`, Large = `14px`, Extra Large = `16px`. |
| `--reduce-motion` | `reduce_motion` setting | Used in conjunction with the `prefers-reduced-motion` media query to disable transitions and animations. |

## Base Styles

Applied globally via `shared.css`:

- `* { margin: 0; padding: 0; box-sizing: border-box; }`
- `body` font size: `13px`
- `body` user-select: `none` (drag prevention)
- `#app` is a full-viewport flex column
- Styled scrollbars: 6px wide, rounded, `--border-emphasis` / `--border-bright` thumb colors, transparent track
- Focus ring: 2px `--accent-blue` outline with `-2px` offset
- Selection: `--accent-blue-dim` background with `--text-bright` text
- Buttons: standard and `.primary` variants with hover/active/disabled states
- Inputs/textareas/selects: styled with border, focus states, placeholder color
- Checkboxes: 14px with accent color

## Component Styles

| Class | Use |
|-------|-----|
| `.group-box` | Bordered section container |
| `.group-box-title` | Uppercase section title in group box |
| `.section` | Padded section with bottom border |
| `.section-title` | Uppercase section title |
| `.setting-row` | Flex row for label + control |
| `.setting-label` | Label text in setting row |
| `.setting-hint` | Small hint text below a setting |

## Utility Classes

### Text

| Class | Effect |
|-------|--------|
| `.text-primary` | `color: var(--text-primary)` |
| `.text-secondary` | `color: var(--text-secondary)` |
| `.text-tertiary` | `color: var(--text-tertiary)` |
| `.text-bright` | `color: var(--text-bright)` |
| `.text-accent` | `color: var(--accent-blue)` |
| `.mono` | `font-family: var(--font-mono)` |

### Layout

| Class | Effect |
|-------|--------|
| `.flex` | `display: flex` |
| `.flex-col` | `flex-direction: column` |
| `.flex-1` | `flex: 1` |
| `.items-center` | `align-items: center` |
| `.justify-between` | `justify-content: space-between` |
| `.justify-center` | `justify-content: center` |
| `.gap-4` | `gap: 4px` |
| `.gap-8` | `gap: 8px` |
| `.gap-12` | `gap: 12px` |
| `.gap-16` | `gap: 16px` |

### Behavior

| Class | Effect |
|-------|--------|
| `.truncate` | Single-line text with ellipsis overflow |
| `.selectable` | Enables text selection (overrides global `user-select: none`) |
| `.hidden` | `display: none !important` |

### Links

Links (`<a>`) are styled with `--accent-blue` color, no underline, and transition to `--text-bright` on hover.
