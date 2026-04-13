import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

export interface UseDragDropOptions {
  /** File extensions to accept (e.g., ['.json', '.png']). Empty = accept all. */
  accept?: string[];
  /** Called when files are dropped. Paths are already filtered by `accept`. */
  onFilesDropped?: (paths: string[]) => void;
}

export interface UseDragDropReturn {
  /** True while files are being dragged over the window. */
  isDragging: boolean;
  /** The most recently dropped file paths (filtered). */
  droppedFiles: string[];
}

function filterPaths(paths: string[], accept: string[]): string[] {
  if (accept.length === 0) return paths;
  return paths.filter((p) => {
    const lower = p.toLowerCase();
    return accept.some((ext) => lower.endsWith(ext.toLowerCase()));
  });
}

/**
 * Hook for handling native file drag-and-drop via Tauri v2.
 *
 * Uses `getCurrentWebview().onDragDropEvent()` to listen for drag/drop events
 * emitted by the Tauri runtime.
 */
export function useDragDrop(options: UseDragDropOptions = {}): UseDragDropReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const handleDrop = useCallback((paths: string[]) => {
    const accept = optionsRef.current.accept ?? [];
    const filtered = filterPaths(paths, accept);
    if (filtered.length === 0) return;
    setDroppedFiles(filtered);
    optionsRef.current.onFilesDropped?.(filtered);
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const { type } = event.payload;
        switch (type) {
          case 'enter':
            setIsDragging(true);
            break;
          case 'over':
            // Still dragging -- no state change needed
            break;
          case 'drop':
            setIsDragging(false);
            handleDrop(event.payload.paths);
            break;
          case 'leave':
            setIsDragging(false);
            break;
        }
      })
      .then((u) => {
        unlisten = u;
      });

    return () => {
      unlisten?.();
    };
  }, [handleDrop]);

  return { isDragging, droppedFiles };
}
