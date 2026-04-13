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
  "productName": "tauri-app-starter",
  "version": "0.1.0",
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

1. Add `tauri-plugin-updater` to `Cargo.toml`
2. Configure an update endpoint in `tauri.conf.json`
3. Host a JSON manifest with version info at that endpoint
4. The app checks for updates on launch

Full guide: [Tauri Updater Plugin](https://v2.tauri.app/plugin/updater/)

## Replacing Template Docs

This starter includes mdBook documentation wired to the Help menu. Before shipping:

1. Replace content in `docs/src/` with your app's user-facing docs
2. Update `docs/src/SUMMARY.md` with your table of contents
3. Update the window title and book title in `docs/book.toml`
4. The Help > Documentation menu item opens the built docs in the user's browser

If you don't want built-in docs, remove the docs-related menu item from your menu setup and delete the `docs/` directory.

## Branding Checklist

Everything you need to change to make this template yours:

- [ ] **App name (`productName`)** -- `src-tauri/tauri.conf.json` field `productName`
- [ ] **Bundle identifier** -- `src-tauri/tauri.conf.json` field `identifier` (reverse-domain format, e.g. `com.yourcompany.yourapp`)
- [ ] **Window title** -- `src-tauri/tauri.conf.json` under `app.windows[0].title`
- [ ] **Rust package name** -- `src-tauri/Cargo.toml` field `package.name` (use kebab-case)
- [ ] **Node package name** -- `package.json` field `name`
- [ ] **App icon** -- generate all sizes from a single 1024x1024 PNG:
  ```bash
  cargo tauri icon path/to/your-icon-1024x1024.png
  ```
  This writes all required sizes to `src-tauri/icons/`.
- [ ] **Docs book title** -- `docs/book.toml` field `book.title`
- [ ] **Branding config** -- update `src/lib/branding.ts` (see below)

## Branding Configuration (`src/lib/branding.ts`)

All brand-aware components (splash screen, about dialog, status bar) read from a single configuration file at `src/lib/branding.ts`. This is the one place to set your app's visual identity.

### Fields

| Field | Description |
|-------|-------------|
| `name` | App display name shown on splash screen and about dialog |
| `tagline` | Short tagline shown on the splash screen and about dialog |
| `logo` | Path to logo image (SVG or PNG, relative to `public/`). When empty, a styled first-letter is shown instead. |
| `splashBackground` | Path to a background image for the splash screen (optional, relative to `public/`). A dark overlay is applied so text remains readable. |
| `accentColor` | Primary brand color used for the splash progress bar and logo gradient. |
| `copyright` | Copyright line shown at the bottom of the splash screen and in the about dialog. |
| `website` | URL shown as a link in the about dialog. Leave empty to hide. |
| `github` | GitHub URL shown as a link in the about dialog. Leave empty to hide. |
| `licenseInfo` | License URL or text shown in the about dialog. Leave empty to hide. |

### Adding a Logo

1. Drop your logo file (SVG or PNG) in `public/assets/`
2. Set the path in `branding.ts`:
   ```typescript
   logo: "/assets/logo.svg",
   ```

### Adding a Splash Background Image

1. Drop your background image in `public/assets/`
2. Set the path in `branding.ts`:
   ```typescript
   splashBackground: "/assets/splash-bg.png",
   ```
   The image fills the splash screen with a darkened overlay so the text and logo remain readable.

### Changing the Accent Color

Set `accentColor` in `branding.ts` to change the splash screen progress bar and logo gradient:

```typescript
accentColor: "#e91e63",
```

Note: The `accentColor` in `branding.ts` is used by brand-aware components (splash screen, etc.). To change the accent color across the full UI (buttons, links, selections), also update `--accent-blue` in `src/styles/theme.css`.

## Splash Screen

The starter kit includes a splash screen that displays while the app initializes (loading settings, checking recovery, etc.). It shows the app name, version, and an animated progress bar, then fades out once everything is ready.

### How It Works

The splash is a React component (`SplashScreen.tsx`) that renders as a full-screen overlay on top of the app. It uses only inline styles so it appears instantly before any external CSS loads. Once all initialization completes, the `appReady` flag is set and the splash fades out over 300ms.

### Customizing the Splash

The `SplashScreen` component accepts these props:

| Prop | Type | Description |
|------|------|-------------|
| `appName` | `string` | Application name displayed prominently |
| `version` | `string` | Version string (e.g. `v0.1.0`) |
| `tagline` | `string?` | Optional tagline below the version |
| `logoSrc` | `string?` | Path to a logo image; when omitted, a styled first-letter is shown |
| `ready` | `boolean` | When true, the splash fades out |
| `onExit` | `() => void` | Called after the fade-out completes |

**To add your logo**, place an image in `src/assets/` and pass its path:

```tsx
<SplashScreen
  appName="My App"
  version="v1.0.0"
  tagline="Professional Video Editor"
  logoSrc="/src/assets/logo.png"
  ready={appReady}
  onExit={() => setSplashDismissed(true)}
/>
```

**To add a tagline**, pass the `tagline` prop in `App.tsx` where the `SplashScreen` is rendered.

**To remove the splash entirely**, delete the `SplashScreen` import and the `{!splashDismissed && <SplashScreen ... />}` block in `App.tsx`, then set `appReady`'s default to `true` or remove the state entirely.

## Pre-Ship Checklist

- [ ] Update `productName`, `version`, and `identifier` in `tauri.conf.json`
- [ ] Update `name`, `version`, `description` in `Cargo.toml`
- [ ] Generate app icons with `cargo tauri icon`
- [ ] Replace template docs or remove the docs directory
- [ ] Remove any placeholder/demo components
- [ ] Set up code signing for your target platforms
- [ ] Test the production build: `cargo tauri build`
- [ ] Test on a clean machine (no dev tools installed)
- [ ] Verify settings/autosave paths use your real bundle identifier
- [ ] Configure auto-updater if distributing outside an app store
- [ ] Set CSP in `tauri.conf.json` (currently `null` -- tighten for production)
