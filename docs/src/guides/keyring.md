# Secure Storage (Keyring)

Store secrets in the OS-native keychain using [tauri-plugin-keyring](https://github.com/nicepkg/tauri-plugin-keyring). Secrets never touch the filesystem -- they are managed by the operating system's credential manager.

The plugin is registered in `lib.rs` and available via the Tauri plugin's JavaScript API.

## Where Secrets Are Stored

| Platform | Backend |
|----------|---------|
| **macOS** | Keychain Access (`security` CLI) |
| **Windows** | Windows Credential Manager |
| **Linux** | Secret Service (libsecret / GNOME Keyring / KWallet) |

## API

Use the `tauri-plugin-keyring-api` JavaScript package directly, or wrap it in your IPC facade. Each secret is addressed by a `service` + `key` pair.

### Store a secret

```javascript
import { setPassword } from 'tauri-plugin-keyring-api';

await setPassword('com.myapp', 'api_key', 'sk-abc123...');
```

### Retrieve a secret

```javascript
import { getPassword } from 'tauri-plugin-keyring-api';

const secret = await getPassword('com.myapp', 'api_key');
// secret is string | null
```

### Delete a secret

```javascript
import { deletePassword } from 'tauri-plugin-keyring-api';

await deletePassword('com.myapp', 'api_key');
```

### Check existence

```javascript
import { getPassword } from 'tauri-plugin-keyring-api';

const exists = (await getPassword('com.myapp', 'api_key')) !== null;
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

```javascript
import { setPassword, getPassword } from 'tauri-plugin-keyring-api';

// Save
await setPassword('com.myapp', 'openai_key', userInput);

// Use
const key = await getPassword('com.myapp', 'openai_key');
if (!key) {
  // Prompt user to enter their key
}
```

### License key validation

```javascript
import { setPassword, getPassword } from 'tauri-plugin-keyring-api';

async function storeLicense(license) {
  await setPassword('com.myapp', 'license', license);
}

async function isLicensed() {
  return (await getPassword('com.myapp', 'license')) !== null;
}
```

## Implementation Notes

The keyring plugin operates entirely through its JavaScript API -- no custom Rust `#[tauri::command]` functions are involved. The plugin is registered in `lib.rs`:

```rust
.plugin(tauri_plugin_keyring::init())
```

If you need to add keyring management to your Settings window, you can call the plugin API from the settings window's JavaScript.
