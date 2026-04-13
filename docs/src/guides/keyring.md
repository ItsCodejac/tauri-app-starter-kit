# Secure Storage (Keyring)

Store secrets in the OS-native keychain using [tauri-plugin-keyring](https://github.com/nicepkg/tauri-plugin-keyring). Secrets never touch the filesystem -- they are managed by the operating system's credential manager.

## Where Secrets Are Stored

| Platform | Backend |
|----------|---------|
| **macOS** | Keychain Access (`security` CLI) |
| **Windows** | Windows Credential Manager |
| **Linux** | Secret Service (libsecret / GNOME Keyring / KWallet) |

## API

All keyring operations go through the IPC facade in `src/lib/ipc.ts`. Each secret is addressed by a `service` + `key` pair.

### Store a secret

```ts
import { ipc } from '../lib/ipc';

await ipc.keyringSet('com.myapp', 'api_key', 'sk-abc123...');
```

### Retrieve a secret

```ts
const secret = await ipc.keyringGet('com.myapp', 'api_key');
// secret is string | null
```

### Delete a secret

```ts
await ipc.keyringDelete('com.myapp', 'api_key');
```

### Check existence

```ts
const exists = await ipc.keyringHas('com.myapp', 'api_key');
// true | false
```

## Keyring vs Settings

| | Keyring | Settings |
|---|---|---|
| **Stored in** | OS keychain (encrypted) | `settings.json` (plaintext) |
| **Use for** | API keys, tokens, passwords, license keys | Preferences, UI state, flags |
| **Accessible to** | Only your app (OS-enforced) | Any process that can read the file |

**Rule of thumb:** If the value is a secret, use keyring. Everything else goes in settings.

## Common Patterns

### API key storage

```ts
// Save
await ipc.keyringSet('com.myapp', 'openai_key', userInput);

// Use
const key = await ipc.keyringGet('com.myapp', 'openai_key');
if (!key) {
  // Prompt user to enter their key
}
```

### License key validation

```ts
async function storeLicense(license: string) {
  await ipc.keyringSet('com.myapp', 'license', license);
}

async function isLicensed(): Promise<boolean> {
  return ipc.keyringHas('com.myapp', 'license');
}
```

## Settings Panel (Security Section)

The built-in Settings panel includes a **Security** section that lets users manage stored secrets. It displays the service/key pairs (never the values) and allows adding or removing entries.

The panel tracks which keys exist via a `keyring_keys` setting (stored in `settings.json` as metadata only -- actual secret values remain in the OS keychain):

```ts
// The settings panel stores key metadata for display
const stored = getSetting<{ service: string; key: string }[]>('keyring_keys', []);
```

When adding a secret through the panel, it calls `ipc.keyringSet()` and appends the service/key pair to `keyring_keys`. When removing, it calls `ipc.keyringDelete()` and removes the pair.

## Implementation Details

The IPC facade wraps the `tauri-plugin-keyring-api` JS bindings directly -- no Rust command is involved:

```ts
import { getPassword, setPassword, deletePassword } from 'tauri-plugin-keyring-api';

keyringSet: (service, key, value) => setPassword(service, key, value),
keyringGet: (service, key) => getPassword(service, key),
keyringDelete: (service, key) => deletePassword(service, key),
keyringHas: async (service, key) => {
  const value = await getPassword(service, key);
  return value !== null;
},
```
