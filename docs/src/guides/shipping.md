# Shipping Your App

## Building for Production

```bash
cargo tauri build
```

This compiles the Rust backend in release mode, bundles the frontend, and produces platform-specific installers in `src-tauri/target/release/bundle/`.

## Bundle Configuration

In `src-tauri/tauri.conf.json`:

```json
{
  "productName": "tauri-app-starter-kit",
  "version": "1.0.0",
  "identifier": "com.tauri.dev",
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Before shipping**, change:
- `productName` -- your app's display name
- `version` -- your release version
- `identifier` -- reverse-domain identifier (e.g. `com.yourcompany.yourapp`)

### Build Targets

`"targets": "all"` produces everything for the current platform:

| Platform | Output |
|----------|--------|
| macOS | `.dmg`, `.app` |
| Windows | `.msi`, `.exe` (NSIS) |
| Linux | `.deb`, `.AppImage` |

To build only specific targets:

```bash
cargo tauri build --target dmg
```

## App Icons

Place icon files in `src-tauri/icons/`. Required sizes:

| File | Size | Platform |
|------|------|----------|
| `32x32.png` | 32x32 | All |
| `128x128.png` | 128x128 | All |
| `128x128@2x.png` | 256x256 | macOS Retina |
| `icon.icns` | Multi-size | macOS |
| `icon.ico` | Multi-size | Windows |

Generate all sizes from a single 1024x1024 PNG:

```bash
cargo tauri icon path/to/icon-1024x1024.png
```

## Code Signing

### macOS

Requires an Apple Developer account and a Developer ID certificate.

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
cargo tauri build
```

For notarization (required for distribution outside the App Store):

```bash
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"
cargo tauri build
```

See [Tauri macOS code signing docs](https://v2.tauri.app/distribute/sign/macos/) for full setup.

### Windows

Requires an EV or standard code signing certificate.

```bash
export TAURI_SIGNING_PRIVATE_KEY="path/to/key"
cargo tauri build
```

See [Tauri Windows code signing docs](https://v2.tauri.app/distribute/sign/windows/).

## Auto-Updater

Tauri has a built-in updater plugin. Brief setup:

1. Uncomment `.plugin(tauri_plugin_updater::Builder::new().build())` in `src-tauri/src/lib.rs`
2. Add `updater::mark_enabled()` after the plugin registration
3. Configure an update endpoint in `tauri.conf.json`
4. Host a JSON manifest with version info at that endpoint

> **Important:** The updater will not work until you configure `plugins.updater.endpoints` in `tauri.conf.json` with at least one URL pointing to your update manifest. Without this, update checks will silently fail. Example:
>
> ```json
> {
>   "plugins": {
>     "updater": {
>       "endpoints": ["https://releases.yourapp.com/{{target}}/{{arch}}/{{current_version}}"]
>     }
>   }
> }
> ```

Full guide: [Tauri Updater Plugin](https://v2.tauri.app/plugin/updater/)

## Replacing Template Docs

This starter includes mdBook documentation wired to the Help menu. Before shipping:

1. Replace content in `docs/src/` with your app's user-facing docs
2. Update `docs/src/SUMMARY.md` with your table of contents
3. Update the book title in `docs/book.toml`
4. Build docs: `mdbook build docs`
5. The Help > Documentation menu item opens the built docs in the user's browser

If you don't want built-in docs, remove the `help_docs` handler from `menu.rs` and delete the `docs/` directory.

## Branding Checklist

Everything you need to change to make this template yours:

- [ ] **App name (`productName`)** -- `src-tauri/tauri.conf.json` field `productName`
- [ ] **Bundle identifier** -- `src-tauri/tauri.conf.json` field `identifier` (reverse-domain format, e.g. `com.yourcompany.yourapp`)
- [ ] **Rust package name** -- `src-tauri/Cargo.toml` field `package.name` (use kebab-case)
- [ ] **Rust lib name** -- `src-tauri/Cargo.toml` field `lib.name` and update `main.rs` import
- [ ] **Node package name** -- `package.json` field `name`
- [ ] **App icon** -- generate all sizes from a single 1024x1024 PNG:
  ```bash
  cargo tauri icon path/to/your-icon-1024x1024.png
  ```
  This writes all required sizes to `src-tauri/icons/`.
- [ ] **Docs book title** -- `docs/book.toml` field `book.title`
- [ ] **Branding config** -- update `src/lib/branding.js` (see below)
- [ ] **Changelog** -- update `changelog.json` with your app's version history

## Branding Configuration (`src/lib/branding.js`)

All brand-aware windows (splash screen, about dialog, welcome screen, etc.) read from a single configuration file at `src/lib/branding.js`. This is the one place to set your app's visual identity.

### Fields

| Field | Description |
|-------|-------------|
| `name` | App display name shown on splash screen and about dialog |
| `tagline` | Short tagline shown on the splash screen |
| `logo` | Path to logo image (SVG or PNG, relative to `public/`). When empty, a styled first-letter is shown instead. |
| `splashBackground` | Path to a background image for the splash screen (optional, relative to `public/`). |
| `accentColor` | Primary brand color used for the splash progress bar, logo gradient, and CSS accent override. |
| `copyright` | Copyright line shown in the splash screen and about dialog. |
| `website` | URL shown as a link in the about dialog. Leave empty to hide. |
| `github` | GitHub URL shown as a link in the about dialog. Also used by the "Report Issue" menu handler. Leave empty to hide. |
| `licenseInfo` | License text shown in the about dialog. Leave empty to hide. |

### Adding a Logo

1. Drop your logo file (SVG or PNG) in `public/assets/`
2. Set the path in `branding.js`:
   ```javascript
   logo: "/assets/logo.svg",
   ```

## Splash Screen

The splash screen is a separate HTML window (`src/windows/splash.html`) defined as the only window in `tauri.conf.json`. It appears immediately on launch while Rust runs async initialization.

### How It Works

1. Tauri creates the splash window on startup (it's the only `visible: true` window in `tauri.conf.json`)
2. The Rust setup spawns an async task that emits `splash:status` events with progress messages
3. The splash JS listens for these events and updates the status text
4. After initialization completes (minimum 3 seconds), Rust creates the main window programmatically and closes the splash

### Customizing the Splash

Edit `src/windows/splash.html` and `src/windows/splash.js`. The splash uses `applyBranding()` from `window-utils.js` to show the app name, logo, and accent color.

### Removing the Splash

1. Remove the splash window entry from `tauri.conf.json`
2. Add a main window entry to `tauri.conf.json` instead
3. Remove the splash-related code from the setup closure in `lib.rs`

## Pre-Ship Checklist

- [ ] Update `productName`, `version`, and `identifier` in `tauri.conf.json`
- [ ] Update `name`, `version`, `description` in `Cargo.toml`
- [ ] Update branding in `src/lib/branding.js`
- [ ] Generate app icons with `cargo tauri icon`
- [ ] Replace template docs or remove the docs directory
- [ ] Replace the `index.html` welcome page with your app's UI
- [ ] Set up code signing for your target platforms
- [ ] Test the production build: `cargo tauri build`
- [ ] Test on a clean machine (no dev tools installed)
- [ ] Verify settings/autosave paths use your real bundle identifier
- [ ] Configure auto-updater if distributing outside an app store
- [ ] Review the CSP in `tauri.conf.json` -- it's set to a strict default. Adjust if your app needs external resources.
