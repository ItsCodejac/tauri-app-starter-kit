# AI Integration

TASK does **not** include an AI plugin by default. The `tauri-plugin-ai` dependency was removed during the refactor to keep the template lightweight.

If you need AI features (LLM completions, local inference, etc.), you can add `tauri-plugin-ai` yourself:

## Adding tauri-plugin-ai

### 1. Add the Rust dependency

In `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-ai = { version = "0.1", features = ["cloud"] }
```

### 2. Register the plugin

In `src-tauri/src/lib.rs`, add to the builder:

```rust
.plugin(tauri_plugin_ai::init())
```

### 3. Use from the frontend

```javascript
import { invoke } from '@tauri-apps/api/core';

// Use the plugin's API directly
// See tauri-plugin-ai documentation for details
```

## Alternative: Direct API Calls

For simpler use cases, you can call LLM APIs directly from Rust using `reqwest` or from the frontend using `fetch` (if CSP allows it). This avoids the plugin dependency entirely.

## Secure API Key Storage

If you do integrate an AI provider, store API keys in the OS keychain using the [keyring plugin](./keyring.md) rather than in plaintext settings:

```javascript
import { setPassword, getPassword } from 'tauri-plugin-keyring-api';

// Store key securely
await setPassword('com.myapp', 'anthropic-api-key', userInput);

// Retrieve on startup
const key = await getPassword('com.myapp', 'anthropic-api-key');
```
