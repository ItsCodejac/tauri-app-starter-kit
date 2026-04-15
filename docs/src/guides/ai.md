# AI Integration

TASK does **not** include an AI plugin by default. If you need AI features (LLM completions, streaming, local model inference), add `tauri-plugin-ai` separately.

## Adding tauri-plugin-ai

### Step 1: Rust dependency

The plugin is not yet on crates.io. Add it as a git or path dependency in `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-ai = { git = "https://github.com/youruser/tauri-plugin-ai" }
# Or for local development:
# tauri-plugin-ai = { path = "../../tauri-plugin-ai" }
```

### Step 2: Register the plugin

In `src-tauri/src/lib.rs`, add to the builder chain:

```rust
.plugin(tauri_plugin_ai::init())
```

### Step 3: Add permissions

In `src-tauri/capabilities/default.json`, add to the permissions array:

```json
"ai:default"
```

Without this, all plugin commands will fail with permission errors.

### Step 4: Install the frontend package

```bash
npm install tauri-plugin-ai-api
```

This also requires `@tauri-apps/api` as a peer dependency:

```bash
npm install @tauri-apps/api
```

### Step 5: Use the API

```javascript
import { complete, AIStream, setApiKey } from 'tauri-plugin-ai-api';

// Set an API key (stored in memory on the Rust side)
await setApiKey('anthropic', 'sk-ant-...');

// Non-streaming completion
const response = await complete({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});
console.debug(response.content);

// Streaming
const stream = new AIStream();
await stream.start({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Tell me a joke' }],
  stream: true,
}, {
  onChunk: (chunk) => process.stdout.write(chunk.delta),
  onComplete: (usage) => console.debug('Done', usage),
  onError: (err) => console.error(err),
});
```

### Without the npm package

If you prefer not to install npm packages (TASK's utility windows use `window.__TAURI__` globals), you can call plugin commands directly:

```javascript
const { invoke } = window.__TAURI__.core;

await invoke('plugin:ai|set_api_key', { provider: 'anthropic', key: 'sk-ant-...' });

const response = await invoke('plugin:ai|complete', {
  request: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: 'Hello!' }],
  }
});
```

You lose TypeScript types and the AIStream helper class, but it works without any npm dependencies.

## Security: API Keys

API keys are stored **in memory only** on the Rust side. They never reach the frontend -- the renderer calls `complete` or `stream`, and Rust reads the key internally to make the API call. This is the proxy pattern.

For persistent key storage across app restarts, use TASK's keyring integration to store keys in the OS keychain, then load them into the plugin on startup:

```javascript
// On startup: load from keychain into plugin memory
const key = await invoke('keyring_get', { service: 'myapp', key: 'anthropic' });
if (key) {
  await setApiKey('anthropic', key);
}

// When user enters a new key: save to keychain AND set in plugin
await invoke('keyring_set', { service: 'myapp', key: 'anthropic', value: newKey });
await setApiKey('anthropic', newKey);
```

## CSP Compatibility

All API calls go through Rust (reqwest), not the browser. TASK's strict CSP does not block plugin operations. Do **not** try to call LLM APIs directly from the frontend with `fetch` -- TASK's CSP blocks external HTTP connections from the renderer.

## Feature Flags

| Feature | What it enables |
|---------|----------------|
| `cloud` (default) | Anthropic, OpenAI, Ollama cloud providers |
| `local-onnx` | ONNX Runtime for local model inference |

```toml
# Cloud only (default)
tauri-plugin-ai = { git = "..." }

# Cloud + local ONNX
tauri-plugin-ai = { git = "...", features = ["cloud", "local-onnx"] }

# ONNX only, no cloud
tauri-plugin-ai = { git = "...", default-features = false, features = ["local-onnx"] }
```
