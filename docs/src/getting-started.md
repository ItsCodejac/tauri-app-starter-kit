# Getting Started

## Prerequisites

- **Rust** (stable, 1.77.2+) -- [rustup.rs](https://rustup.rs)
- **Node.js** (18+) -- [nodejs.org](https://nodejs.org)
- **Tauri CLI** -- `cargo install tauri-cli` (or use `npx @tauri-apps/cli`)
- Platform-specific dependencies: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Clone and run

```bash
git clone <your-repo-url> my-app
cd my-app
npm install
cargo tauri dev
```

On first launch, a branded splash screen appears for 3 seconds while settings initialize. Then the main window opens showing a welcome page with interactive buttons that let you try every utility window.

## What happens on first launch

1. The **splash window** (`src/windows/splash.html`) appears immediately -- it is the only window defined in `tauri.conf.json`.
2. Rust initialization runs asynchronously: settings are loaded, crash recovery is checked, the keyboard shortcut registry is initialized, and the system tray is set up.
3. Progress messages are emitted to the splash screen via the `splash:status` event.
4. After a minimum 3-second splash duration, the **main window** is created programmatically in Rust (`lib.rs` setup) and the splash closes.
5. The main window loads `index.html`, which includes the template's welcome page with interactive demos. Replace this with your own UI.

## First customizations

After cloning, make these changes to turn the template into your app:

### 1. Change app name and identifier

Edit `src-tauri/tauri.conf.json`:

```json
{
  "productName": "My App",
  "identifier": "com.yourcompany.myapp"
}
```

### 2. Change package names

Edit `src-tauri/Cargo.toml`:

```toml
[package]
name = "my-app"

[lib]
name = "my_app_lib"
```

Edit `package.json`:

```json
{
  "name": "my-app"
}
```

After renaming the lib, update the import in `src-tauri/src/main.rs`:

```rust
fn main() {
    my_app_lib::run();
}
```

### 3. Set branding

Edit `src/lib/branding.js` -- this single file drives the name, tagline, logo, accent color, and copyright across all utility windows:

```javascript
export const branding = {
  name: "My App",
  tagline: "Does something great",
  logo: "",                    // path relative to public/, or empty for first-letter fallback
  accentColor: "#4a9eff",
  copyright: "\u00A9 2026 Your Company",
  website: "https://yourapp.com",
  github: "https://github.com/you/my-app",
  licenseInfo: "MIT License",
};
```

### 4. Add custom menus

In `src-tauri/src/menu.rs`, add menus in `custom_menus()`. These appear between View and Window in the menu bar:

```rust
fn custom_menus() -> Vec<MenuConfig> {
    vec![
        MenuConfig {
            label: "Project",
            items: vec![
                MenuDef::Item { id: "project_build", label: "Build", accel: Some("CmdOrCtrl+B") },
                MenuDef::Item { id: "project_run", label: "Run", accel: Some("CmdOrCtrl+R") },
                MenuDef::Separator,
                MenuDef::Item { id: "project_settings", label: "Project Settings...", accel: None },
            ],
        },
    ]
}
```

Menu events are auto-forwarded to the frontend. The ID `project_build` emits the event `menu:project:build`. Listen in your frontend:

```javascript
const { listen } = window.__TAURI__.event;

listen('menu:project:build', () => {
  // handle build
});
```

Or use the IPC facade:

```javascript
import { events } from './lib/ipc.js';

events.onMenuEvent('menu:project:build', () => {
  // handle build
});
```

### 5. Customize theme colors

Edit `src/styles/shared.css`. All colors are CSS custom properties:

```css
:root {
  --surface-base: #0d0d0d;
  --accent-blue: #4a9eff;
  /* ... see file for full list */
}
```

### 6. Add your frontend framework

The template ships with no framework. `index.html` loads `src/main.js` and `src/styles/shared.css`. Replace the page content with your own UI:

```bash
# React
npm install react react-dom @vitejs/plugin-react

# Svelte
npm install svelte @sveltejs/vite-plugin-svelte

# Vue
npm install vue @vitejs/plugin-vue

# Or just write vanilla HTML/JS in index.html
```

The Rust backbone and utility windows work regardless of which framework you choose. Utility windows are always plain HTML + JS and are not affected by your framework choice.
