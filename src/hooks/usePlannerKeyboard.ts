import { useEffect } from 'react';

export interface UsePlannerKeyboardOptions {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
  onSelectAll: () => void;
}

export function usePlannerKeyboard({
  onUndo,
  onRedo,
  onDelete,
  onEscape,
  onSelectAll,
}: UsePlannerKeyboardOptions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if in input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + Z = Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Cmd/Ctrl + Shift + Z = Redo (or Cmd/Ctrl + Y)
      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y')) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Delete or Backspace = Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
        return;
      }

      // Escape = Clear selection / close forms
      if (e.key === 'Escape') {
        onEscape();
        return;
      }

      // Cmd/Ctrl + A = Select all in current context
      if (isMod && e.key === 'a') {
        e.preventDefault();
        onSelectAll();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onDelete, onEscape, onSelectAll]);
}
