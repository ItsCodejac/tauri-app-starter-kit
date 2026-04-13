# Drag & Drop

The template includes file drop support with visual feedback.

## Using the Hook

```typescript
import { useDragDrop } from '../hooks/useDragDrop';

function MyComponent() {
  const { isDragging } = useDragDrop({
    accept: ['.json', '.png', '.jpg'],  // optional file filter
    onFilesDropped: (paths) => {
      console.log('Dropped files:', paths);
      // Load the files, import them, etc.
    },
  });

  return <div>{isDragging && <DropOverlay />}</div>;
}
```

## Drop Overlay

The `DropOverlay` component shows a full-screen visual indicator when files are being dragged over the window:
- Semi-transparent dark background
- Dashed border
- "Drop files here" text
- Disappears when the drag leaves or files are dropped

```tsx
import DropOverlay from '../components/ui/DropOverlay';

{isDragging && <DropOverlay />}
```

## File Filtering

Pass an `accept` array to filter by extension:

```typescript
useDragDrop({
  accept: ['.mp4', '.mov', '.avi'],  // video files only
  onFilesDropped: handleVideoDrop,
});
```

Files that don't match the filter are silently ignored.

## Without the Hook

For custom implementations, listen to Tauri's drag-drop events directly:

```typescript
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

const appWindow = getCurrentWebviewWindow();
const unlisten = await appWindow.onDragDropEvent((event) => {
  if (event.payload.type === 'over') {
    // Files being dragged over window
  } else if (event.payload.type === 'drop') {
    // Files dropped: event.payload.paths
  } else if (event.payload.type === 'leave') {
    // Drag left the window
  }
});
```

## Common Patterns

### Open file on drop
```typescript
useDragDrop({
  accept: ['.myapp'],
  onFilesDropped: ([path]) => {
    if (path) openProject(path);
  },
});
```

### Import multiple files
```typescript
useDragDrop({
  onFilesDropped: (paths) => {
    paths.forEach(path => importFile(path));
    toast(`Imported ${paths.length} files`, 'success');
  },
});
```
