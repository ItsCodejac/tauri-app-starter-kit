/**
 * Generic undo/redo command stack infrastructure.
 *
 * Not tied to any specific data type -- works with arbitrary commands.
 * Each command knows how to execute itself and how to reverse itself.
 */

export interface UndoCommand {
  id: string;
  label: string; // human-readable, e.g. "Delete Layer", "Move Object"
  execute: () => void;
  undo: () => void;
}

export class UndoRedoManager {
  private undoStack: UndoCommand[] = [];
  private redoStack: UndoCommand[] = [];
  maxStackSize: number;
  onChange: ((manager: UndoRedoManager) => void) | null = null;

  constructor(maxStackSize = 100) {
    this.maxStackSize = maxStackSize;
  }

  /** Run the command and push it onto the undo stack. Clears the redo stack. */
  execute(command: UndoCommand): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  /** Undo the most recent command. */
  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo();
    this.redoStack.push(command);
    this.notify();
  }

  /** Redo the most recently undone command. */
  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.execute();
    this.undoStack.push(command);
    this.notify();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Label of the next undoable action, for menu text like "Undo: Delete Layer". */
  get undoLabel(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].label;
  }

  /** Label of the next redoable action, for menu text like "Redo: Move Object". */
  get redoLabel(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].label;
  }

  /** Clear both undo and redo stacks. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    this.onChange?.(this);
  }
}
