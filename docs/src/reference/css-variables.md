# CSS Variables Reference

All custom properties are defined in `src/styles/theme.css` on `:root`. Utility classes are in `src/styles/global.css`.

## Surfaces

| Variable | Value | Use |
|----------|-------|-----|
| `--surface-base` | `#0d0d0d` | App background, deepest layer |
| `--surface-primary` | `#1a1a1a` | Side panels, secondary regions |
| `--surface-secondary` | `#222` | Dialogs, popovers, dropdowns |
| `--surface-tertiary` | `#2a2a2a` | Tab bars, status bar, panel headers |
| `--surface-hover` | `#333` | Hover state for interactive items |
| `--surface-active` | `#3a3a3a` | Active/pressed state |
| `--surface-elevated` | `#444` | Toasts, floating elements with high prominence |

## Borders

| Variable | Value | Use |
|----------|-------|-----|
| `--border-subtle` | `#2a2a2a` | Panel dividers, section separators |
| `--border-standard` | `#3a3a3a` | Dialog borders, input borders |
| `--border-emphasis` | `#555` | Scrollbar thumbs, stronger dividers |
| `--border-bright` | `#666` | Scrollbar thumb hover, high-contrast borders |

## Text

| Variable | Value | Use |
|----------|-------|-----|
| `--text-primary` | `#e0e0e0` | Default body text |
| `--text-secondary` | `#999` | Labels, secondary info, tab text |
| `--text-tertiary` | `#666` | Placeholders, disabled text, shortcuts |
| `--text-bright` | `#fff` | Active tabs, selected items, headings |

## Accents

| Variable | Value | Use |
|----------|-------|-----|
| `--accent-blue` | `#4a9eff` | Active tab indicator, focus rings, links |
| `--accent-blue-dim` | `rgba(74, 158, 255, 0.15)` | Selection background, resize handle hover |
| `--accent-green` | `#4caf50` | Success toasts |
| `--accent-orange` | `#ff9800` | Warning toasts |
| `--accent-red` | `#f44336` | Error toasts |

## Fonts

| Variable | Value | Use |
|----------|-------|-----|
| `--font-ui` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All UI text |
| `--font-mono` | `'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace` | Code, shortcuts, keyboard hints |

## Base Styles (theme.css)

Applied globally via `theme.css`:

- `* { margin: 0; padding: 0; box-sizing: border-box; }`
- `body` font size: `12px`
- `body` user-select: `none` (drag prevention)
- `#root` is a full-viewport flex column

## Utility Classes (global.css)

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
| `.gap-4` | `gap: 4px` |
| `.gap-8` | `gap: 8px` |

### Behavior

| Class | Effect |
|-------|--------|
| `.truncate` | Single-line text with ellipsis overflow |
| `.selectable` | Enables text selection (overrides global `user-select: none`) |

### Scrollbars

Styled globally in `global.css`: 6px wide, rounded, uses `--border-emphasis` / `--border-bright` for thumb colors. Track is transparent.

### Focus

`:focus-visible` applies a 2px `--accent-blue` outline with `-2px` offset.

### Selection

`::selection` uses `--accent-blue-dim` background with `--text-bright` text.
