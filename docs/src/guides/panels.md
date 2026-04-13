# Panel Layouts

`PanelLayout` provides a 4-zone resizable layout: left, center, right, and bottom. It lives at `src/components/layout/PanelLayout.tsx`.

## Basic Usage

```tsx
import PanelLayout from './components/layout/PanelLayout';

<PanelLayout
  leftLabel="Explorer"
  centerLabel="Editor"
  rightLabel="Inspector"
  bottomLabel="Console"
  leftPanel={<Explorer />}
  centerPanel={<Editor />}
  rightPanel={<Inspector />}
  bottomPanel={<Console />}
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `leftPanel` | `ReactNode` | `undefined` | Content for left panel. Omit to hide. |
| `centerPanel` | `ReactNode` | `undefined` | Content for center panel (always visible). |
| `rightPanel` | `ReactNode` | `undefined` | Content for right panel. Omit to hide. |
| `bottomPanel` | `ReactNode` | `undefined` | Content for bottom panel. Omit to hide. |
| `leftLabel` | `string` | `"Left"` | Header text for left panel. |
| `centerLabel` | `string` | `"Center"` | Header text for center panel. |
| `rightLabel` | `string` | `"Right"` | Header text for right panel. |
| `bottomLabel` | `string` | `"Bottom"` | Header text for bottom panel. |
| `leftWidth` | `number` | `240` | Initial width in pixels. |
| `rightWidth` | `number` | `240` | Initial width in pixels. |
| `bottomHeight` | `number` | `200` | Initial height in pixels. |

## Zone Layout

```
┌──────────┬─────────────────────┬──────────┐
│          │                     │          │
│   Left   │      Center         │  Right   │
│  Panel   │      Panel          │  Panel   │
│          │                     │          │
├──────────┴─────────────────────┴──────────┤
│              Bottom Panel                  │
└────────────────────────────────────────────┘
```

The center panel fills all remaining horizontal space. Panels that are omitted (prop not passed) do not render at all -- no empty space, no drag handle.

## Resizing

Drag the 4px handles between panels to resize. Minimum size is 80px for all panels.

Sizes persist to `localStorage` under the key `panel-layout-sizes` as `{ left, right, bottom }`. On reload, the last sizes are restored.

## Collapsing Panels

Double-click any panel header to collapse it. The panel shrinks to just its header (28px). Double-click again to restore.

The center panel cannot be collapsed.

## Layout Presets

### Minimal -- center only

```tsx
<PanelLayout
  centerLabel="Main"
  centerPanel={<MainContent />}
/>
```

### Sidebar + Main

```tsx
<PanelLayout
  leftLabel="Sidebar"
  centerLabel="Main"
  leftPanel={<Sidebar />}
  centerPanel={<MainContent />}
  leftWidth={280}
/>
```

### Three-Column

```tsx
<PanelLayout
  leftLabel="Navigator"
  centerLabel="Editor"
  rightLabel="Properties"
  leftPanel={<Navigator />}
  centerPanel={<Editor />}
  rightPanel={<Properties />}
  leftWidth={220}
  rightWidth={300}
/>
```

### Full Workspace (default)

```tsx
<PanelLayout
  leftLabel="Explorer"
  centerLabel="Editor"
  rightLabel="Inspector"
  bottomLabel="Terminal"
  leftPanel={<Explorer />}
  centerPanel={<Editor />}
  rightPanel={<Inspector />}
  bottomPanel={<Terminal />}
  leftWidth={240}
  rightWidth={240}
  bottomHeight={180}
/>
```

## Customizing Panel Headers

The `PanelHeader` component is internal to `PanelLayout.tsx`. To customize it (add buttons, badges, etc.), edit the `PanelHeader` function in `PanelLayout.tsx`:

```tsx
function PanelHeader({ label, collapsed, onDoubleClick }: {
  label: string;
  collapsed: boolean;
  onDoubleClick: () => void;
}) {
  return (
    <div onDoubleClick={onDoubleClick} style={{ /* ... */ }}>
      <span style={{ /* collapse arrow */ }}>&#9660;</span>
      {label}
      {/* Add custom elements here */}
      <button style={{ marginLeft: 'auto' }} onClick={() => console.log('action')}>
        +
      </button>
    </div>
  );
}
```

## Conditional Panels

Show or hide panels based on state (e.g., active tab):

```tsx
function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [showInspector, setShowInspector] = useState(true);

  return (
    <PanelLayout
      leftLabel="Files"
      centerLabel="Editor"
      rightLabel="Inspector"
      bottomLabel="Output"
      leftPanel={<FileTree />}
      centerPanel={<Editor />}
      rightPanel={showInspector ? <Inspector /> : undefined}
      bottomPanel={activeTab === 'editor' ? <Output /> : undefined}
    />
  );
}
```

Pass `undefined` (or simply omit the prop) to hide a panel. The layout reflows automatically -- the center panel expands to fill the space.

Toggle from a command palette or menu event:

```tsx
useEffect(() => {
  const unlisten = listen('menu:view:toggle-inspector', () => {
    setShowInspector((v) => !v);
  });
  return () => { unlisten.then((fn) => fn()); };
}, []);
```
