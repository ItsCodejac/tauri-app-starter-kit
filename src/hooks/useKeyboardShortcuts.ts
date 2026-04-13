import { useEffect, useRef, useCallback } from 'react';

export interface Shortcut {
  key: string;
  modifiers?: ('meta' | 'ctrl' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
}

const isMac = navigator.platform.toUpperCase().includes('MAC');

function matchesShortcut(e: KeyboardEvent, shortcut: Shortcut): boolean {
  if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
  const mods = shortcut.modifiers ?? [];
  const wantsMeta = mods.includes('meta');
  const wantsCtrl = mods.includes('ctrl');
  const wantsShift = mods.includes('shift');
  const wantsAlt = mods.includes('alt');

  // On Mac, 'meta' means Cmd. On other platforms, treat 'meta' as Ctrl.
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

  if (wantsMeta && !cmdOrCtrl) return false;
  if (!wantsMeta && !wantsCtrl && cmdOrCtrl) return false;
  if (wantsCtrl && !e.ctrlKey) return false;
  if (wantsShift !== e.shiftKey) return false;
  if (wantsAlt !== e.altKey) return false;

  return true;
}

export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  const mods = shortcut.modifiers ?? [];
  if (mods.includes('meta')) parts.push(isMac ? '\u2318' : 'Ctrl');
  if (mods.includes('ctrl')) parts.push('Ctrl');
  if (mods.includes('shift')) parts.push(isMac ? '\u21E7' : 'Shift');
  if (mods.includes('alt')) parts.push(isMac ? '\u2325' : 'Alt');
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join(isMac ? '' : '+');
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const getShortcuts = useCallback(() => shortcutsRef.current, []);
  return { getShortcuts };
}
