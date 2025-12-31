import { useState, useCallback, useRef } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { createSnapshot, restoreFromSnapshot } from '@/utils/plannerUtils';
import type { UndoStack } from '@/types/planner';

const MAX_UNDO_SIZE = 50;

export interface UsePlannerUndoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (description: string) => void;
  clear: () => void;
}

export function usePlannerUndo(): UsePlannerUndoReturn {
  const stackRef = useRef<UndoStack>({
    past: [],
    future: [],
    maxSize: MAX_UNDO_SIZE,
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const { activeTrip, replaceItineraryDays } = useTripStore();

  const pushSnapshot = useCallback((description: string) => {
    if (!activeTrip) return;

    const snapshot = createSnapshot(activeTrip.itinerary.days, description);
    const stack = stackRef.current;

    stack.past.push(snapshot);
    if (stack.past.length > stack.maxSize) {
      stack.past.shift();
    }
    stack.future = [];  // Clear redo stack on new action

    setCanUndo(stack.past.length > 0);
    setCanRedo(false);
  }, [activeTrip]);

  const undo = useCallback(() => {
    if (!activeTrip) return;

    const stack = stackRef.current;
    if (stack.past.length === 0) return;

    // Save current state to future
    const currentSnapshot = createSnapshot(activeTrip.itinerary.days, 'Current state');
    stack.future.push(currentSnapshot);

    // Restore previous state
    const previousSnapshot = stack.past.pop()!;
    const restoredDays = restoreFromSnapshot(previousSnapshot);
    replaceItineraryDays(restoredDays);

    setCanUndo(stack.past.length > 0);
    setCanRedo(stack.future.length > 0);
  }, [activeTrip, replaceItineraryDays]);

  const redo = useCallback(() => {
    if (!activeTrip) return;

    const stack = stackRef.current;
    if (stack.future.length === 0) return;

    // Save current state to past
    const currentSnapshot = createSnapshot(activeTrip.itinerary.days, 'Current state');
    stack.past.push(currentSnapshot);

    // Restore future state
    const nextSnapshot = stack.future.pop()!;
    const restoredDays = restoreFromSnapshot(nextSnapshot);
    replaceItineraryDays(restoredDays);

    setCanUndo(stack.past.length > 0);
    setCanRedo(stack.future.length > 0);
  }, [activeTrip, replaceItineraryDays]);

  const clear = useCallback(() => {
    stackRef.current = { past: [], future: [], maxSize: MAX_UNDO_SIZE };
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { undo, redo, canUndo, canRedo, pushSnapshot, clear };
}
