# Keyboard Shortcuts & Command Palette

## useKeyboardShortcuts Hook

Register keyboard shortcuts with the `useKeyboardShortcuts` hook:

```tsx
import { useKeyboardShortcuts, Shortcut } from '../hooks/useKeyboardShortcuts';

const shortcuts: Shortcut[] = [
  {
    key: 's',
    modifiers: ['meta'],
    action: () => saveFile(),
    description: 'Save file',
  },
  {
    key: 'z',
    modifiers: ['meta', 'shift'],
    action: () => redo(),
    description: 'Redo',
  },
  {
    key: 'Escape',
    action: () => deselect(),
    description: 'Deselect',
  },
];

function MyComponent() {
  useKeyboardShortcuts(shortcuts);
  return <div>...</div>;
}
```

### Shortcut Interface

```ts
interface Shortcut {
  key: string;                              // KeyboardEvent.key value
  modifiers?: ('meta' | 'ctrl' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
}
```

## Cross-Platform Modifier Handling

The `meta` modifier maps to the correct platform key automatically:

| Modifier | macOS | Windows/Linux |
|----------|-------|---------------|
| `meta` | Cmd | Ctrl |
| `ctrl` | Ctrl | Ctrl |
| `shift` | Shift | Shift |
| `alt` | Option | Alt |

Use `meta` for standard app shortcuts (save, undo, copy). Use `ctrl` only when you specifically need the Ctrl key on all platforms.

## Formatting for Display

Use `formatShortcut()` to render shortcut hints in the UI:

```ts
import { formatShortcut, Shortcut } from '../hooks/useKeyboardShortcuts';

const shortcut: Shortcut = {
  key: 's',
  modifiers: ['meta', 'shift'],
  action: () => {},
  description: 'Save as',
};

formatShortcut(shortcut);
// macOS:    "⌘⇧S"
// Windows:  "Ctrl+Shift+S"
```

## Command Palette

The command palette provides a fuzzy-search command launcher (like VS Code's `Cmd+Shift+P`).

### Command Interface

```ts
interface Command {
  id: string;        // Unique identifier
  label: string;     // Display text
  shortcut?: string; // Shortcut hint string (display only)
  action: () => void;
}
```

### Registering Commands

```tsx
import CommandPalette, { Command } from '../components/ui/CommandPalette';

const [paletteOpen, setPaletteOpen] = useState(false);

const commands: Command[] = [
  { id: 'save', label: 'Save File', shortcut: '⌘S', action: saveFile },
  { id: 'open', label: 'Open File', shortcut: '⌘O', action: openFile },
  { id: 'theme', label: 'Toggle Theme', action: toggleTheme },
];

return (
  <>
    <CommandPalette
      commands={commands}
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
    />
  </>
);
```

### Opening the Palette

Register a shortcut to toggle it:

```ts
const shortcuts: Shortcut[] = [
  {
    key: 'p',
    modifiers: ['meta', 'shift'],
    action: () => setPaletteOpen(true),
    description: 'Command palette',
  },
];
```

### Palette Navigation

| Key | Action |
|-----|--------|
| Type | Fuzzy filter commands |
| Arrow Up/Down | Move selection |
| Enter | Execute selected command |
| Escape | Close palette |

## Connecting Shortcuts to Commands

Keep a single source of truth for actions, then wire them into both systems:

```tsx
const actions = {
  save: () => invoke('save_file'),
  open: () => invoke('open_file'),
  redo: () => invoke('redo'),
};

const shortcuts: Shortcut[] = [
  { key: 's', modifiers: ['meta'], action: actions.save, description: 'Save' },
  { key: 'o', modifiers: ['meta'], action: actions.open, description: 'Open' },
];

const commands: Command[] = [
  { id: 'save', label: 'Save File', shortcut: '⌘S', action: actions.save },
  { id: 'open', label: 'Open File', shortcut: '⌘O', action: actions.open },
  { id: 'redo', label: 'Redo', shortcut: '⌘⇧Z', action: actions.redo },
];
```

## Best Practices

- **Avoid OS conflicts**: Don't bind `Cmd+Q`, `Cmd+H`, `Cmd+Tab`, `Cmd+W` -- the OS or Tauri handles these.
- **Avoid browser conflicts**: Don't bind `Cmd+L`, `Cmd+R`, `F5`, `F12` in development.
- **Use `meta` not `ctrl`**: For app shortcuts, always use `meta` so it maps correctly per platform.
- **Single-key shortcuts**: Only use unmodified keys (like `Space`, `Delete`) when a specific panel or mode has focus, not globally.
- **`description` is required**: It powers the command palette and future shortcut reference UI.
