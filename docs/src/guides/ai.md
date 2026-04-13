# AI Integration

TASK includes [tauri-plugin-ai](https://github.com/anthropics/tauri-plugin-ai) for cloud LLM providers and local model inference.

## What's Included

- **Cloud providers:** Anthropic (Claude), OpenAI (GPT), Ollama (local server)
- **Local inference:** ONNX Runtime backend (feature-gated)
- **Settings UI:** Provider selection, API key management, default model, Ollama endpoint
- **Command palette:** AI: Set API Key, AI: List Models, AI: List Backends, AI: List Providers

## Configuration

### Setting API Keys

Open **Settings > AI** and select a provider. Enter your API key and click **Set**. Keys are stored in-memory only for the current session.

For persistent key storage, save keys to the OS keychain via the **Security** section and load them on startup:

```typescript
import { ipc } from './lib/ipc';

// On startup: load key from OS keychain into AI plugin memory
const key = await ipc.keyringGet('my-app', 'anthropic-api-key');
if (key) {
  await ipc.aiSetApiKey('anthropic', key);
}
```

### Ollama

Set a custom Ollama endpoint in **Settings > AI > Ollama Endpoint** (defaults to `http://localhost:11434`).

## Using Completions

```typescript
import { ipc } from './lib/ipc';

// Non-streaming completion
const response = await ipc.aiComplete({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 256,
});
console.log(response.content);
```

## Streaming

```typescript
import { ipc } from './lib/ipc';

// Stream and collect full response
const response = await ipc.aiStreamToString(
  {
    provider: 'openai',
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
  },
  (token) => appendToUI(token),
);

// Or use the AIStream class for event-based streaming
const stream = new ipc.AIStream();
await stream.start(
  {
    provider: 'anthropic',
    messages: [{ role: 'user', content: 'Write a haiku.' }],
    max_tokens: 256,
  },
  {
    onChunk: (chunk) => appendToUI(chunk.delta),
    onComplete: (usage) => console.log('Done.', usage),
    onError: (err) => console.error(err),
  },
);
// later: stream.stop();
```

## ONNX Inference (Local Models)

Requires the `local-onnx` feature flag in `src-tauri/Cargo.toml`:

```toml
tauri-plugin-ai = { path = "../../tauri-plugin-ai", features = ["cloud", "local-onnx"] }
```

```typescript
import { ipc } from './lib/ipc';

// Load a model
await ipc.aiLoadModel({
  name: 'my-classifier',
  provider: 'onnx',
  model_id: 'classifier-v1',
  model_path: '/path/to/model.onnx',
  options: {},
});

// Prepare input tensor
const inputData = new Float32Array(1 * 3 * 224 * 224);
// ... fill with preprocessed pixel values ...

const output = await ipc.aiInfer('onnx', 'my-classifier', {
  tensors: {
    input: ipc.aiTensorFromFloat32(inputData, [1, 3, 224, 224]),
  },
});

const logits = ipc.aiTensorToFloat32(output.tensors['logits']);
console.log('Predictions:', logits);
```

## IPC Facade

All AI functions are available through the `ipc` object in `src/lib/ipc.ts`:

| Function | Description |
|----------|-------------|
| `ipc.aiComplete()` | Non-streaming LLM completion |
| `ipc.aiStreamToString()` | Stream and collect full response |
| `ipc.AIStream` | Streaming completion manager class |
| `ipc.aiSetApiKey()` | Set API key in memory |
| `ipc.aiGetApiKey()` | Get current API key |
| `ipc.aiRemoveApiKey()` | Remove API key from memory |
| `ipc.aiGetProviders()` | List registered providers |
| `ipc.aiListModels()` | List available models |
| `ipc.aiListBackends()` | List inference backends |
| `ipc.aiLoadModel()` | Load a local model |
| `ipc.aiUnloadModel()` | Unload a local model |
| `ipc.aiInfer()` | Run inference on a loaded model |
| `ipc.aiCancelStream()` | Cancel an active stream |

The `ai` namespace object is also re-exported for direct usage:

```typescript
import { ai } from './lib/ipc';
await ai.complete({ ... });
```

## Further Reading

See the [tauri-plugin-ai README](https://github.com/anthropics/tauri-plugin-ai) for the full API reference, feature flags, and permissions table.
