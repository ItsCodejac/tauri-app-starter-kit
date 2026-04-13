# Undo & Redo

The template includes a generic undo/redo command stack that works with any data type.

## Concept

Every undoable action is wrapped in a command object with `execute()` and `undo()` methods. The manager maintains two stacks (undo and redo) and handles the flow automatically.

## UndoCommand Interface

```typescript
interface UndoCommand {
  id: string;
  label: string;    // human-readable: "Delete Layer", "Move Object"
  execute: () => void;
  undo: () => void;
}
```

## Using the Hook

```typescript
import { useUndoRedo } from '../hooks/useUndoRedo';

function MyComponent() {
  const { execute, undo, redo, canUndo, canRedo, undoLabel, redoLabel } = useUndoRedo();

  const deleteItem = (item: Item) => {
    execute({
      id: `delete-${item.id}`,
      label: `Delete ${item.name}`,
      execute: () => removeItem(item.id),
      undo: () => restoreItem(item),
    });
  };

  return (
    <>
      <button onClick={undo} disabled={!canUndo}>
        Undo {undoLabel}
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo {redoLabel}
      </button>
    </>
  );
}
```

## Keyboard Shortcuts

The hook automatically registers:
- **Cmd+Z** (Mac) / **Ctrl+Z** (Windows/Linux) — Undo
- **Cmd+Shift+Z** (Mac) / **Ctrl+Shift+Z** (Windows/Linux) — Redo

## Using the Manager Directly

For non-React contexts or shared state:

```typescript
import { UndoRedoManager } from '../lib/undoRedo';

const manager = new UndoRedoManager({ maxStackSize: 50 });

manager.onChange = (mgr) => {
  console.log(`Can undo: ${mgr.canUndo}, Can redo: ${mgr.canRedo}`);
};

manager.execute({
  id: 'move-1',
  label: 'Move Widget',
  execute: () => widget.moveTo(100, 200),
  undo: () => widget.moveTo(0, 0),
});

manager.undo();  // widget back at (0, 0)
manager.redo();  // widget at (100, 200) again
```

## Configuration

- **maxStackSize** — Maximum number of undo steps (default: 100). Oldest commands are dropped when exceeded.
- **onChange** — Callback fired after every execute/undo/redo/clear operation.

## Integration Notes

- The Edit menu's native Undo/Redo items are OS-handled (they control text input in webviews). Your app's undo/redo is a separate system for domain actions.
- Call `manager.clear()` when loading a new document or resetting state.
- The `label` field is useful for menu text: "Undo: Delete Layer".
