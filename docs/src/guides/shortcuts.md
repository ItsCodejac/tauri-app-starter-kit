# Keyboard Shortcuts

TASK includes a full keyboard shortcut registry with persistence, conflict detection, an interactive editor window, and preset support. Defined in `src-tauri/src/shortcuts.rs` with the UI in `src/windows/shortcuts.html`.

## How It Works

The shortcut system is a Rust-side registry that stores bindings in `shortcuts.json` (via `tauri-plugin-store`). Each binding maps a `command_id` to a key combination, along with metadata like label and category.

On app startup, `init_shortcuts()` loads the registry from disk (or creates defaults). New default bindings added in future versions are automatically merged in -- existing user customizations are preserved.

## Data Model

```rust
struct ShortcutBinding {
    command_id: String,     // e.g. "file.new"
    label: String,          // e.g. "New"
    category: String,       // e.g. "File"
    keys: Vec<String>,      // e.g. ["CmdOrCtrl", "N"]
    default_keys: Vec<String>, // original defaults for reset
}
```

## Default Bindings

| Command ID | Label | Category | Default Keys |
|-----------|-------|----------|-------------|
| `file.new` | New | File | CmdOrCtrl+N |
| `file.open` | Open... | File | CmdOrCtrl+O |
| `file.save` | Save | File | CmdOrCtrl+S |
| `file.save_as` | Save As... | File | CmdOrCtrl+Shift+S |
| `edit.find` | Find... | Edit | CmdOrCtrl+F |
| `edit.find_replace` | Find and Replace... | Edit | CmdOrCtrl+Shift+F |
| `view.fullscreen` | Toggle Fullscreen | View | Ctrl+CmdOrCtrl+F |
| `view.zoom_in` | Zoom In | View | CmdOrCtrl+= |
| `view.zoom_out` | Zoom Out | View | CmdOrCtrl+- |
| `view.actual_size` | Actual Size | View | CmdOrCtrl+0 |
| `view.devtools` | Developer Tools | View | CmdOrCtrl+Alt+I |
| `app.preferences` | Settings... | App | CmdOrCtrl+, |
| `app.command_palette` | Command Palette | App | CmdOrCtrl+Shift+P |

## Interactive Editor

The Shortcuts window (`Help > Keyboard Shortcuts` or `ipc.openWindow('shortcuts')`) provides:

- List of all shortcuts grouped by category
- Click a shortcut to record a new key combination
- Conflict detection -- warns if the combo is already in use
- Reset individual shortcuts to defaults
- Reset all shortcuts to defaults
- Save and load named presets

### Canvas-Based Keyboard Visualization

The keyboard in the shortcuts window is rendered on an HTML `<canvas>` element, not built from DOM elements (HTML divs). This provides:

- Pixel-perfect rendering of keys, labels, and highlights
- Smooth animations when keys are pressed or assigned
- Command labels displayed directly on the assigned keys
- Better performance compared to hundreds of individual DOM nodes

### Window Properties

The shortcuts window is **fixed-size (800x680)** and **non-resizable**. This ensures the keyboard layout renders at a consistent scale without needing responsive adjustments.

### Modifier Toggle Bar

A row of modifier buttons (Cmd, Shift, Alt, Ctrl) at the top of the window acts as a filter. Clicking a modifier highlights only shortcuts that use that modifier, making it easy to browse by modifier group.

### Collapsible Categories

The command list on the right side groups shortcuts by category (File, Edit, View, App, etc.). Each category header is collapsible -- click it to expand or collapse the group.

### Right-Click Context Menu

Right-clicking a shortcut in the command list opens a context menu with an option to **reset that individual shortcut** to its default binding.

### Record-Search Mode

Press keys directly (without clicking a shortcut first) to enter **record-search mode**. The keyboard highlights the pressed keys and the command list filters to show only shortcuts matching that key combination. This lets you search by binding rather than by name.

## IPC Commands

### Reading shortcuts

```javascript
import { ipc } from './lib/ipc.js';

// Get all bindings from the active preset
const shortcuts = await ipc.getShortcuts();
// Returns: ShortcutBinding[]
```

### Modifying shortcuts

```javascript
// Set a new key combination
await ipc.setShortcut('file.new', ['CmdOrCtrl', 'Shift', 'N']);

// Remove a shortcut (set to empty keys)
await ipc.removeShortcut('file.new');

// Reset one shortcut to its default
await ipc.resetShortcut('file.new');

// Reset all shortcuts to defaults
await ipc.resetAllShortcuts();
```

### Conflict detection

```javascript
// Check if a key combo conflicts with an existing binding
// Exclude the command being edited from the check
const conflict = await ipc.checkConflict(
  ['CmdOrCtrl', 'S'],
  'file.save'  // don't flag conflict with itself
);

if (conflict) {
  console.debug(`Conflicts with: ${conflict.label} (${conflict.command_id})`);
}
```

### Presets

```javascript
// List all presets (id, name, is_builtin)
const presets = await ipc.getPresets();

// Save current bindings as a new preset
const newId = await ipc.savePreset('My Custom Layout');

// Switch to a different preset (returns the new bindings)
const bindings = await ipc.loadPreset(presetId);

// Delete a custom preset (cannot delete built-in)
await ipc.deletePreset(presetId);
```

## Adding a New Shortcut

Add a new `ShortcutBinding` to the `default_bindings()` function in `shortcuts.rs`:

```rust
ShortcutBinding {
    command_id: "project.build".into(),
    label: "Build Project".into(),
    category: "Project".into(),
    keys: vec!["CmdOrCtrl".into(), "B".into()],
    default_keys: vec!["CmdOrCtrl".into(), "B".into()],
},
```

The new binding is automatically merged into existing user registries on next load -- users who have customized their shortcuts will get the new binding added without losing their changes.

## Persistence

Shortcuts are stored in `shortcuts.json` in the app data directory (alongside `settings.json`). The file contains a `ShortcutRegistry` with:

- `active_preset_id` -- which preset is currently active
- `presets` -- array of presets, each containing the full set of bindings

The built-in "Default" preset (`id: "default"`) is always present and cannot be deleted.
