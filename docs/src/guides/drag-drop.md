# Drag & Drop

Tauri v2 provides native file drag-and-drop events. TASK does not include a drag-drop abstraction -- implement it directly using Tauri's webview window API.

## Listening for Drag-Drop Events

Use Tauri's `onDragDropEvent` API from the frontend:

```javascript
const { getCurrentWebviewWindow } = window.__TAURI__.webviewWindow;

const appWindow = getCurrentWebviewWindow();
const unlisten = await appWindow.onDragDropEvent((event) => {
  if (event.payload.type === 'over') {
    // Files being dragged over the window
    showDropOverlay();
  } else if (event.payload.type === 'drop') {
    // Files dropped
    const paths = event.payload.paths;
    handleFiles(paths);
    hideDropOverlay();
  } else if (event.payload.type === 'leave') {
    // Drag left the window
    hideDropOverlay();
  }
});
```

## File Filtering

Filter by extension after receiving the drop:

```javascript
const validExtensions = ['.mp4', '.mov', '.avi'];

function handleDrop(paths) {
  const filtered = paths.filter(p =>
    validExtensions.some(ext => p.toLowerCase().endsWith(ext))
  );
  if (filtered.length > 0) {
    openFiles(filtered);
  }
}
```

## Visual Feedback

Add a drop overlay to your HTML that shows when files are being dragged over the window:

```html
<div id="drop-overlay" class="hidden">
  <p>Drop files here</p>
</div>
```

```css
#drop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  border: 2px dashed var(--accent-blue);
  color: var(--text-bright);
  font-size: 16px;
}
```

```javascript
function showDropOverlay() {
  document.getElementById('drop-overlay').classList.remove('hidden');
}
function hideDropOverlay() {
  document.getElementById('drop-overlay').classList.add('hidden');
}
```

## Common Patterns

### Open file on drop

```javascript
appWindow.onDragDropEvent((event) => {
  if (event.payload.type === 'drop') {
    const path = event.payload.paths[0];
    if (path) openProject(path);
  }
});
```

### Import multiple files

```javascript
appWindow.onDragDropEvent((event) => {
  if (event.payload.type === 'drop') {
    const paths = event.payload.paths;
    paths.forEach(path => importFile(path));
  }
});
```
