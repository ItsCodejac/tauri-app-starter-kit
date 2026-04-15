# Contributing to TASK

Thanks for your interest in contributing to TASK! Here's how to get involved.

## Reporting Bugs

Use the [bug report issue template](https://github.com/user/tauri-app-starter-kit/issues/new?template=bug_report.md). Include steps to reproduce, expected vs actual behavior, and your platform details.

## Suggesting Features

Use the [feature request issue template](https://github.com/user/tauri-app-starter-kit/issues/new?template=feature_request.md). Describe the use case and any alternatives you've considered.

## Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Open a PR against `main`

## Code Style

- **Rust:** Run `cargo fmt` before committing. Zero warnings on `cargo build`.
- **JavaScript/HTML:** No framework assumptions. Keep it clean and readable.
- **Utility windows:** Must stay plain HTML -- no frameworks. Use `window.__TAURI__` for IPC, no npm imports.

## Testing

All of the following must pass with zero warnings before submitting a PR:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
npm run build
mdbook build docs
```

## Architecture Notes

Utility windows (About, Settings, What's New, etc.) are intentionally built with plain HTML and vanilla JS. This keeps them lightweight and avoids framework dependencies. IPC in these windows uses `window.__TAURI__` directly -- do not add npm imports for Tauri APIs.
