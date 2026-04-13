import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UndoRedoManager, type UndoCommand } from '../lib/undoRedo';

export interface UseUndoRedoReturn {
  execute: (command: UndoCommand) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}

/**
 * React hook wrapping UndoRedoManager.
 *
 * - Triggers re-renders when undo/redo state changes
 * - Registers Cmd+Z / Cmd+Shift+Z keyboard shortcuts automatically
 *
 * NOTE: The Edit menu's Undo/Redo items are native PredefinedMenuItem entries,
 * so we cannot control their enabled state or labels from the frontend.
 * The canUndo/canRedo/undoLabel/redoLabel values are exposed so app developers
 * can wire them up to custom UI elements as needed.
 */
export function useUndoRedo(maxStackSize = 100): UseUndoRedoReturn {
  const managerRef = useRef<UndoRedoManager | null>(null);
  if (managerRef.current === null) {
    managerRef.current = new UndoRedoManager(maxStackSize);
  }
  const manager = managerRef.current;

  // Revision counter to trigger re-renders when undo/redo state changes.
  const [, setRevision] = useState(0);

  useEffect(() => {
    manager.onChange = () => {
      setRevision((r) => r + 1);
    };
    return () => {
      manager.onChange = null;
    };
  }, [manager]);

  // Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');

    const handler = (e: KeyboardEvent) => {
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (!cmdOrCtrl) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        manager.undo();
      } else if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        manager.redo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manager]);

  const execute = useCallback(
    (command: UndoCommand) => manager.execute(command),
    [manager],
  );

  const undo = useCallback(() => manager.undo(), [manager]);
  const redo = useCallback(() => manager.redo(), [manager]);

  return useMemo(
    () => ({
      execute,
      undo,
      redo,
      canUndo: manager.canUndo,
      canRedo: manager.canRedo,
      undoLabel: manager.undoLabel,
      redoLabel: manager.redoLabel,
    }),
    [execute, undo, redo, manager.canUndo, manager.canRedo, manager.undoLabel, manager.redoLabel],
  );
}
