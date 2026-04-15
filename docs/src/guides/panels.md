# Utility Windows

TASK uses a utility window architecture instead of in-app panels. Each secondary UI (About, Settings, Shortcuts, etc.) is a standalone HTML file with its own JavaScript, served as a separate Tauri webview window. This keeps utility windows simple, framework-agnostic, and independent of the main window.

## How It Works

Utility windows are configured in `src-tauri/src/windows.rs`. Each window has a `WindowConfig` struct that defines its label, title, URL, dimensions, and window behavior (resizable, decorations, always-on-top, etc.).

When a window is requested:
1. If a window with that label already exists, it is shown and focused.
2. Otherwise, a new window is created from the config.

## Current Utility Windows

| Name | Size | Resizable | Always on Top | Purpose |
|------|------|-----------|---------------|---------|
| `splash` | 480x300 | No | Yes | Splash screen during initialization |
| `settings` | 780x580 | Yes | No | Preferences panel |
| `about` | 360x400 | No | Yes | App info, version, links |
| `shortcuts` | 800x650 | Yes | No | Interactive keyboard shortcut editor |
| `logs` | 700x500 | Yes | No | Log viewer with filtering |
| `update` | 420x340 | No | Yes | Update checker and installer |
| `whatsnew` | 500x520 | Yes | No | Changelog / What's New |
| `welcome` | 540x480 | No | Yes | First-run onboarding |

## Opening a Window

### From the frontend (IPC)

```javascript
import { ipc } from './lib/ipc.js';

await ipc.openWindow('about');
await ipc.openWindow('settings');
```

### From Rust (menu handlers, etc.)

```rust
crate::windows::open_window_internal(app, "about");
```

This is used by the menu system -- when the user clicks "About" or "Settings" in the menu, the native handler calls `open_window_internal`.

### From menu items

Many utility windows are opened from the menu. These are handled natively in `menu.rs`:

- **About**: macOS App menu > About
- **Settings**: App menu > Settings (Cmd+,), or Window > Settings
- **Shortcuts**: Help > Keyboard Shortcuts
- **Logs**: Help > View Logs
- **Update**: Help > Check for Updates
- **What's New**: Help > What's New

## Creating a New Utility Window

### 1. Create the HTML file

Create `src/windows/mywindow.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Window</title>
  <link rel="stylesheet" href="/src/styles/shared.css" />
</head>
<body>
  <div id="app">
    <h1 id="name"></h1>
    <p>My custom window content.</p>
    <button id="close-btn">Close</button>
  </div>
  <script type="module" src="/src/windows/mywindow.js"></script>
</body>
</html>
```

### 2. Create the JavaScript file

Create `src/windows/mywindow.js`:

```javascript
import { applyBranding, setupCloseButton, invoke } from '../lib/window-utils.js';

applyBranding();
setupCloseButton('close-btn');

// Your window logic here
const info = await invoke('get_app_info');
console.debug(info.name);
```

### 3. Add the window config in Rust

In `src-tauri/src/windows.rs`, add a case to `get_window_config()`:

```rust
"mywindow" => Some(WindowConfig {
    label: "mywindow",
    title: "My Window",
    url: "src/windows/mywindow.html",
    width: 500.0,
    height: 400.0,
    resizable: true,
    decorations: true,
    always_on_top: false,
    center: true,
}),
```

### 4. Add to Vite build inputs

In `vite.config.js`, add the entry:

```javascript
rollupOptions: {
  input: {
    // ...existing entries...
    mywindow: resolve(__dirname, 'src/windows/mywindow.html'),
  },
},
```

### 5. Open it

```javascript
await ipc.openWindow('mywindow');
```

Or from a menu item by adding a native handler in `menu.rs`:

```rust
"help_mywindow" => {
    crate::windows::open_window_internal(app, "mywindow");
    return true;
}
```

## Window Utilities (`src/lib/window-utils.js`)

All utility windows share common patterns through `window-utils.js`:

### `applyBranding(options?)`

Applies branding from `branding.js` to the current window: sets the accent color CSS variable, populates name/tagline/copyright/license/logo elements by ID, and fetches the app version from the backend.

```javascript
import { applyBranding } from '../lib/window-utils.js';
applyBranding();
applyBranding({ showVersion: false }); // skip version fetch
```

### `setupCloseButton(elementId)`

Wires a button to close the current window.

### `setupCloseOnFocusLoss()`

Closes the window when it loses focus (used by splash screen).

### `showButtonFeedback(elementId, feedbackText, durationMs?)`

Temporarily changes a button's text (e.g. "Copy" to "Copied!") then reverts after the given duration (default 2000ms).

### `setupExternalLink(elementId, url)`

Wires a clickable element to open a URL in the external browser via `open_external_url`.

### Form helpers

- `setChecked(id, val)` -- set a checkbox's checked state
- `getChecked(id)` -- get a checkbox's checked state
- `setValue(id, val)` -- set an input's value
- `getValue(id)` -- get an input's value

### Re-exports

`window-utils.js` re-exports `invoke`, `listen`, and `branding` so utility windows can import everything from one module.
