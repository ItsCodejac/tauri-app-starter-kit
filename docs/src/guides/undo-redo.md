# Undo & Redo

TASK does **not** include a built-in undo/redo system. The Edit menu includes native Undo/Redo items (`NativeItem::Undo` and `NativeItem::Redo`), which handle text input undo/redo in webview text fields automatically.

For domain-specific undo/redo (e.g. "undo delete layer", "redo move object"), implement a command-pattern stack in your chosen frontend framework.

## Recommended Pattern

### Command interface

```javascript
const command = {
  id: 'delete-layer',
  label: 'Delete Layer',
  execute: () => layers.remove(selectedId),
  undo: () => layers.restore(selectedId, snapshot),
};
```

### Simple stack implementation

```javascript
class UndoRedoManager {
  constructor(maxSize = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
  }

  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
}
```

## Integration Notes

- The Edit menu's native Undo/Redo items are OS-handled (they control text input in webviews). Your app's undo/redo is a separate system for domain actions.
- Clear the stacks when loading a new document or resetting state.
- The `label` field is useful for menu text: "Undo: Delete Layer".
