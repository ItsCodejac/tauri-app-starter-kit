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

The app opens with three workspace tabs, a 4-panel layout, a status bar, and full native menus.

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

### 3. Edit workspace tabs

In `src/App.tsx`, replace the default tabs:

```tsx
const tabs: Tab[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'preview', label: 'Preview' },
];
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

Menu events are auto-forwarded to the frontend. The ID `project_build` emits the event `menu:project:build`. Listen in React:

```tsx
import { listen } from '@tauri-apps/api/event';

listen('menu:project:build', () => {
  // handle build
});
```

### 5. Customize theme colors

Edit `src/styles/theme.css`. All colors are CSS custom properties:

```css
:root {
  --surface-base: #0d0d0d;
  --accent-blue: #4a9eff;
  /* ... see file for full list */
}
```

## Layout presets

The `PanelLayout` component accepts optional panel props. Omit a panel to remove it.

### Minimal -- no panels, just center content

```tsx
<PanelLayout
  centerLabel="Main"
  centerPanel={<MyContent />}
/>
```

### Sidebar + Main -- 2 panels

```tsx
<PanelLayout
  leftLabel="Explorer"
  centerLabel="Editor"
  leftPanel={<Sidebar />}
  centerPanel={<Editor />}
  leftWidth={260}
/>
```

### Full workspace -- 4 panels (the default)

```tsx
<PanelLayout
  leftLabel="Navigator"
  centerLabel="Canvas"
  rightLabel="Inspector"
  bottomLabel="Console"
  leftPanel={<Navigator />}
  centerPanel={<Canvas />}
  rightPanel={<Inspector />}
  bottomPanel={<Console />}
  leftWidth={240}
  rightWidth={240}
  bottomHeight={180}
/>
```

All panel sizes are draggable at runtime and persisted to `localStorage`. Double-click a panel header to collapse it.
