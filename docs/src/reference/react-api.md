# React API Reference

## Components

### TabBar

`src/components/layout/TabBar.tsx`

Horizontal tab strip. Renders buttons with active-state highlighting.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Tab[]` | required | Array of tab definitions. |
| `activeTab` | `string` | required | The `id` of the currently active tab. |
| `onTabChange` | `(tabId: string) => void` | required | Called when a tab is clicked. |

#### Tab

```typescript
interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}
```

---

### PanelLayout

`src/components/layout/PanelLayout.tsx`

Resizable multi-panel layout with left, center, right, and bottom regions. Panels can be collapsed by double-clicking their header. Sizes persist to `localStorage` under the key `panel-layout-sizes`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `leftPanel` | `ReactNode` | `undefined` | Content for left panel. Panel hidden if omitted. |
| `centerPanel` | `ReactNode` | `undefined` | Content for center panel (always visible). |
| `rightPanel` | `ReactNode` | `undefined` | Content for right panel. Panel hidden if omitted. |
| `bottomPanel` | `ReactNode` | `undefined` | Content for bottom panel. Panel hidden if omitted. |
| `leftLabel` | `string` | `"Left"` | Header label for left panel. |
| `centerLabel` | `string` | `"Center"` | Header label for center panel. |
| `rightLabel` | `string` | `"Right"` | Header label for right panel. |
| `bottomLabel` | `string` | `"Bottom"` | Header label for bottom panel. |
| `leftWidth` | `number` | `240` | Initial width (px) of the left panel. |
| `rightWidth` | `number` | `240` | Initial width (px) of the right panel. |
| `bottomHeight` | `number` | `200` | Initial height (px) of the bottom panel. |

Minimum panel size: 80px. Double-click a panel header to collapse/expand.

---

### StatusBar

`src/components/layout/StatusBar.tsx`

Fixed-height (24px) status bar at the bottom of the window.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `statusText` | `string` | `"Ready"` | Text displayed on the left side. |
| `rightContent` | `ReactNode` | `undefined` | Arbitrary content rendered on the right side. |

---

### CommandPalette

`src/components/ui/CommandPalette.tsx`

Modal command palette with fuzzy search filtering. Renders as a centered overlay when open.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `commands` | `Command[]` | required | List of available commands. |
| `open` | `boolean` | required | Whether the palette is visible. |
| `onClose` | `() => void` | required | Called on backdrop click or Escape key. |
| `placeholder` | `string` | `"Type a command..."` | Placeholder text for the search input. |
| `noResultsText` | `string` | `"No matching commands"` | Text shown when no commands match the query. |

#### Command

```typescript
interface Command {
  id: string;
  label: string;
  shortcut?: string;   // Display string only (e.g. "Cmd+K")
  action: () => void;
}
```

Keyboard navigation: `ArrowUp`/`ArrowDown` to select, `Enter` to execute, `Escape` to close.

---

### ToastContainer

`src/components/ui/Toast.tsx`

Renders all active toasts. Place once in your app tree (inside `ToastProvider`). No props.

```tsx
<ToastProvider>
  <App />
  <ToastContainer />
</ToastProvider>
```

Toast colors by type:

| Type | Color Variable |
|------|---------------|
| `info` | `--accent-blue` |
| `success` | `--accent-green` |
| `warning` | `--accent-orange` |
| `error` | `--accent-red` |

---

### ContextMenu

`src/components/ui/ContextMenu.tsx`

Custom right-click context menu rendered as a fixed-position overlay. Automatically repositions to stay within the viewport. Closes on click outside or Escape key.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menu` | `ContextMenuState \| null` | required | Menu state from `useContextMenu`. `null` hides the menu. |
| `onClose` | `() => void` | required | Called when the menu should be dismissed. |

#### ContextMenuState

```typescript
interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}
```

#### MenuItem

```typescript
interface MenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
}
```

Items with `separator: true` render as a horizontal divider line. Disabled items are grayed out and non-interactive.

---

### DropOverlay

`src/components/ui/DropOverlay.tsx`

Full-screen overlay shown when files are dragged over the window. Renders a semi-transparent dark backdrop with a dashed-border drop zone and a customizable message.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | required | Whether the overlay is shown. Typically bound to `isDragging` from `useDragDrop`. |
| `message` | `string` | `"Drop files here"` | Text displayed inside the drop zone. |

#### Example

```tsx
const { isDragging } = useDragDrop({ onFilesDropped: handleFiles });
<DropOverlay visible={isDragging} message="Drop project files" />
```

---

### ErrorBoundary

`src/components/ErrorBoundary.tsx`

React error boundary that catches render errors in the component tree. Shows a dark-themed recovery UI (with Reload and Copy Error buttons) instead of a white screen. Reports the error to the Rust crash reporter via `log_frontend_error`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | The component tree to wrap. |

#### Example

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

### WelcomeOverlay

`src/components/ui/WelcomeOverlay.tsx`

Full-screen overlay shown on first launch. Replace the placeholder content with your own onboarding experience. Uses i18n keys `app.welcome.title`, `app.welcome.message`, and `app.welcome.getStarted`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onDismiss` | `() => void` | required | Called when the user clicks the "Get Started" button. |

#### Example

```tsx
const { isFirstRun, dismissFirstRun } = useFirstRun();
{isFirstRun && <WelcomeOverlay onDismiss={dismissFirstRun} />}
```

---

### SettingsPanel

`src/components/ui/SettingsPanel.tsx`

Multi-section settings dialog with sidebar navigation. Includes sections for General, Appearance, Autosave, Cache, Tray, and Security (keyring management).

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Whether the settings panel is visible. |
| `onClose` | `() => void` | required | Called on backdrop click. |

Sections:

- **General** -- Language, autostart, check for updates on startup, reset first-run overlay.
- **Appearance** -- Theme selector, show/hide status bar (syncs with check menu item).
- **Autosave** -- Enable/disable autosave and interval slider (30--300s).
- **Cache** -- Shows cache directory location and a clear button placeholder.
- **Tray** -- Minimize-to-tray toggle.
- **Security** -- View, add, and delete OS keychain secrets via `ipc.keyringSet` / `keyringDelete`.

---

### AboutDialog

`src/components/ui/AboutDialog.tsx`

Modal dialog showing application name, version, and links to website/GitHub/licenses. Fetches app info from `ipc.getAppInfo()` when opened.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Whether the dialog is visible. |
| `onClose` | `() => void` | required | Called on backdrop click. |

---

### ShortcutsPanel

`src/components/ui/ShortcutsPanel.tsx`

Modal panel listing all keyboard shortcuts, grouped by category (File, Edit, View, App). Includes a search input for filtering shortcuts. Platform-aware: shows Mac symbols on macOS and `Ctrl+` on other platforms.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Whether the panel is visible. |
| `onClose` | `() => void` | required | Called on backdrop click or Escape key. |

---

### LogViewer

`src/components/ui/LogViewer.tsx`

Modal log viewer that displays application log contents from `ipc.getLogContents()`. Includes level filtering (All, Info, Warn, Error), refresh, copy-to-clipboard, and clear actions. Log lines are color-coded by level.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Whether the log viewer is visible. |
| `onClose` | `() => void` | required | Called on backdrop click. |

---

### UpdateDialog

`src/components/ui/UpdateDialog.tsx`

Update checker and installer dialog. Cycles through states: checking, update-available, downloading, up-to-date, and error. When an update is available, shows version comparison, release notes, and buttons to install, skip, or dismiss.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Whether the dialog is visible. |
| `onClose` | `() => void` | required | Called on backdrop click or dismiss buttons. |

---

### WhatsNewDialog

`src/components/ui/WhatsNewDialog.tsx`

Changelog dialog showing release notes for the current version. On close, persists `app.lastSeenVersion` so the dialog is not shown again until the next update.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Whether the dialog is visible. |
| `onClose` | `() => void` | required | Called on backdrop click or OK button. |

To add release notes, update the `changelog` array in the component source.

---

## Hooks

### useKeyboardShortcuts

`src/hooks/useKeyboardShortcuts.ts`

Registers global `keydown` listeners for an array of shortcuts.

```typescript
function useKeyboardShortcuts(shortcuts: Shortcut[]): {
  getShortcuts: () => Shortcut[];
}
```

#### Shortcut

```typescript
interface Shortcut {
  key: string;                                    // e.g. "k", "Enter", "Escape"
  modifiers?: ('meta' | 'ctrl' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
}
```

- `meta` maps to Cmd on macOS, Ctrl on other platforms.
- `ctrl` always maps to the Ctrl key (useful for macOS Ctrl+click scenarios).

#### formatShortcut

Named export for converting a `Shortcut` to a display string:

```typescript
function formatShortcut(shortcut: Shortcut): string
// Mac: "Cmd+Shift+K" -> "⌘⇧K"
// Win: "Cmd+Shift+K" -> "Ctrl+Shift+K"
```

#### Example

```tsx
useKeyboardShortcuts([
  {
    key: 'k',
    modifiers: ['meta'],
    description: 'Open command palette',
    action: () => setCommandPaletteOpen(true),
  },
]);
```

---

### useSettings

`src/hooks/useSettings.ts`

Loads all settings on mount and provides get/set access.

```typescript
function useSettings(): {
  settings: Record<string, unknown>;
  getSetting: <T>(key: string, defaultValue?: T) => T;
  setSetting: <T>(key: string, value: T) => Promise<void>;
  loading: boolean;
}
```

| Return Field | Description |
|-------------|-------------|
| `settings` | Raw settings object from `get_all_settings`. |
| `getSetting` | Read a setting with optional default. Updates when settings change. |
| `setSetting` | Update local state immediately, then persist via IPC (`set_setting`). |
| `loading` | `true` until initial settings load completes. |

#### Example

```tsx
const { getSetting, setSetting, loading } = useSettings();

if (loading) return <div>Loading...</div>;

const theme = getSetting<string>('theme', 'dark');
await setSetting('theme', 'light');
```

---

### useToast

`src/hooks/useToast.ts`

Access the toast system. Must be called inside a `ToastProvider`.

```typescript
function useToast(): {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `message` | `string` | required | Toast message text. |
| `type` | `ToastType` | `"info"` | One of `"info"`, `"success"`, `"warning"`, `"error"`. |
| `duration` | `number` | `4000` | Auto-dismiss time in milliseconds. |

#### ToastItem

```typescript
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}
```

#### Example

```tsx
const { toast } = useToast();
toast('File saved', 'success');
toast('Something went wrong', 'error', 6000);
```

---

### useContextMenu

`src/hooks/useContextMenu.ts`

Manages state for a custom right-click context menu. Pair with the `ContextMenu` component.

```typescript
function useContextMenu(): {
  contextMenu: ContextMenuState | null;
  showContextMenu: (e: React.MouseEvent, items: MenuItem[]) => void;
  hideContextMenu: () => void;
}
```

| Return Field | Description |
|-------------|-------------|
| `contextMenu` | Current menu state, or `null` if hidden. Pass to `ContextMenu`'s `menu` prop. |
| `showContextMenu` | Call from an `onContextMenu` handler. Prevents default and positions the menu at the click point. |
| `hideContextMenu` | Dismiss the menu. Pass to `ContextMenu`'s `onClose` prop. |

Automatically closes on Escape key.

#### Example

```tsx
const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

<div onContextMenu={(e) => showContextMenu(e, [
  { label: 'Cut', action: handleCut, shortcut: 'Cmd+X' },
  { label: 'Copy', action: handleCopy, shortcut: 'Cmd+C' },
  { separator: true, label: '', action: () => {} },
  { label: 'Delete', action: handleDelete, disabled: !hasSelection },
])}>
  ...
</div>
<ContextMenu menu={contextMenu} onClose={hideContextMenu} />
```

---

### useDragDrop

`src/hooks/useDragDrop.ts`

Handles native file drag-and-drop via Tauri v2's `onDragDropEvent`. Pair with `DropOverlay` for visual feedback.

```typescript
function useDragDrop(options?: UseDragDropOptions): UseDragDropReturn
```

#### UseDragDropOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accept` | `string[]` | `[]` | File extensions to accept (e.g. `['.json', '.png']`). Empty accepts all files. |
| `onFilesDropped` | `(paths: string[]) => void` | `undefined` | Called when files are dropped. Paths are already filtered by `accept`. |

#### UseDragDropReturn

| Field | Type | Description |
|-------|------|-------------|
| `isDragging` | `boolean` | `true` while files are being dragged over the window. |
| `droppedFiles` | `string[]` | The most recently dropped file paths (filtered by `accept`). |

#### Example

```tsx
const { isDragging, droppedFiles } = useDragDrop({
  accept: ['.json'],
  onFilesDropped: (paths) => loadProject(paths[0]),
});

<DropOverlay visible={isDragging} />
```

---

### useUndoRedo

`src/hooks/useUndoRedo.ts`

React hook wrapping `UndoRedoManager`. Triggers re-renders on state changes and registers `Cmd+Z` / `Cmd+Shift+Z` keyboard shortcuts automatically.

```typescript
function useUndoRedo(maxStackSize?: number): UseUndoRedoReturn
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxStackSize` | `number` | `100` | Maximum commands kept in the undo stack. |

#### UseUndoRedoReturn

| Field | Type | Description |
|-------|------|-------------|
| `execute` | `(command: UndoCommand) => void` | Run a command and push it onto the undo stack. Clears the redo stack. |
| `undo` | `() => void` | Undo the most recent command. |
| `redo` | `() => void` | Redo the most recently undone command. |
| `canUndo` | `boolean` | Whether there are commands to undo. |
| `canRedo` | `boolean` | Whether there are commands to redo. |
| `undoLabel` | `string \| null` | Label of the next undoable action (e.g. `"Delete Layer"`). |
| `redoLabel` | `string \| null` | Label of the next redoable action. |

#### Example

```tsx
const { execute, undo, redo, canUndo } = useUndoRedo();

execute({
  id: 'delete-layer',
  label: 'Delete Layer',
  execute: () => layers.remove(selectedId),
  undo: () => layers.restore(selectedId, snapshot),
});
```

---

### useFirstRun

`src/hooks/useFirstRun.ts`

Checks whether this is the user's first launch. Reads the `first_run` setting (defaults to `true`). Call `dismissFirstRun()` to set it to `false` so the welcome screen does not appear again.

```typescript
function useFirstRun(): {
  isFirstRun: boolean;
  loaded: boolean;
  dismissFirstRun: () => Promise<void>;
}
```

| Return Field | Type | Description |
|-------------|------|-------------|
| `isFirstRun` | `boolean` | `true` if this is the first launch (or if `first_run` setting is `true`). |
| `loaded` | `boolean` | `false` until the setting has been read from the backend. |
| `dismissFirstRun` | `() => Promise<void>` | Sets `first_run` to `false` locally and persists to settings. |

#### Example

```tsx
const { isFirstRun, loaded, dismissFirstRun } = useFirstRun();

if (loaded && isFirstRun) {
  return <WelcomeOverlay onDismiss={dismissFirstRun} />;
}
```

---

### useTranslation

`src/hooks/useTranslation.ts`

Access the i18n system. Must be called inside an `I18nProvider`.

```typescript
function useTranslation(): {
  t: (key: string, params?: Record<string, string>) => string;
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: string[];
}
```

| Return Field | Type | Description |
|-------------|------|-------------|
| `t` | `(key: string, params?: Record<string, string>) => string` | Translate a key with optional interpolation parameters. |
| `locale` | `string` | Current active locale code (e.g. `"en"`). |
| `setLocale` | `(locale: string) => void` | Switch to a different locale. Persists to settings. |
| `availableLocales` | `string[]` | List of available locale codes. |

#### Example

```tsx
const { t, locale, setLocale } = useTranslation();

<h1>{t('app.welcome.title')}</h1>
<button onClick={() => setLocale('es')}>Espanol</button>
```

---

## Lib Modules

### UndoRedoManager

`src/lib/undoRedo.ts`

Generic command-pattern undo/redo stack. Framework-agnostic -- use directly or via the `useUndoRedo` hook.

#### UndoCommand

```typescript
interface UndoCommand {
  id: string;
  label: string;         // human-readable, e.g. "Delete Layer"
  execute: () => void;
  undo: () => void;
}
```

#### UndoRedoManager

```typescript
class UndoRedoManager {
  constructor(maxStackSize?: number);  // default 100
  execute(command: UndoCommand): void;
  undo(): void;
  redo(): void;
  clear(): void;
  get canUndo(): boolean;
  get canRedo(): boolean;
  get undoLabel(): string | null;
  get redoLabel(): string | null;
  maxStackSize: number;
  onChange: ((manager: UndoRedoManager) => void) | null;
}
```

---

### IPC Facade

`src/lib/ipc.ts`

Typed wrappers around all `invoke()` calls. Components should use `ipc.*` instead of calling `invoke()` directly.

```typescript
import { ipc, events } from '../lib/ipc';

await ipc.getAppInfo();
const unlisten = await events.onCloseRequested(() => showConfirmDialog());
```

The `ipc` object exposes every registered backend command. The `events` object provides typed listeners:

| Listener | Event | Payload |
|----------|-------|---------|
| `events.onMenuEvent(name, handler)` | any menu event | `void` |
| `events.onAutosaveSaved(handler)` | `autosave:saved` | `void` |
| `events.onRecoveryAvailable(handler)` | `autosave:recovery-available` | `RecoveryInfo` |
| `events.onCloseRequested(handler)` | `window:close-requested` | `void` |

---

### Crash Utilities

`src/lib/crash.ts`

Frontend crash reporting utilities. Sends errors to the Rust backend for persistence.

| Export | Signature | Description |
|--------|-----------|-------------|
| `reportFrontendError` | `(error: Error, componentStack?: string) => void` | Report an error to the backend. Used by `ErrorBoundary` and global handlers. |
| `installGlobalErrorHandlers` | `() => void` | Install `window.onerror` and `window.onunhandledrejection` handlers. Call once at app startup. |
| `hasRecentCrash` | `() => Promise<CrashReport \| null>` | Convenience wrapper for `ipc.hasRecentCrash()`. |
| `listCrashReports` | `() => Promise<CrashReport[]>` | Convenience wrapper for `ipc.listCrashReports()`. |
| `getCrashReport` | `(name: string) => Promise<string>` | Convenience wrapper for `ipc.getCrashReport()`. |
| `clearCrashReports` | `() => Promise<void>` | Convenience wrapper for `ipc.clearCrashReports()`. |

---

## Contexts

### ToastProvider

`src/contexts/ToastContext.tsx`

Wrap your app with `ToastProvider` to enable `useToast` and `ToastContainer`.

```tsx
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/Toast';

function Root() {
  return (
    <ToastProvider>
      <App />
      <ToastContainer />
    </ToastProvider>
  );
}
```

Throws if `useToast` is called outside the provider.

---

### I18nProvider

`src/contexts/I18nContext.tsx`

Wrap your app with `I18nProvider` to enable `useTranslation`. Detects the user's locale on mount and checks for a previously saved locale in settings. Does not render children until the saved locale has been loaded.

```tsx
import { I18nProvider } from './contexts/I18nContext';

function Root() {
  return (
    <I18nProvider>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </I18nProvider>
  );
}
```

Throws if `useTranslation` is called outside the provider.
