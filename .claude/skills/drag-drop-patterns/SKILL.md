---
name: drag-drop-patterns
description: DnD-kit implementation patterns for the planner including sortable lists, cross-container moves, and undo/redo support. Use when implementing or modifying drag-and-drop functionality.
---

# Drag & Drop Patterns

This project uses @dnd-kit for drag-and-drop in the planner view.

## Core Dependencies

```typescript
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

## Planner Context Setup

```typescript
// src/components/planner/PlannerView.tsx
import { usePlannerDnd } from '@/hooks/usePlannerDnd';

export function PlannerView() {
  const {
    activeId,
    activeItem,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = usePlannerDnd();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {days.map((day) => (
          <DraggableDayColumn key={day.id} day={day} />
        ))}
      </div>

      {/* Drag overlay for smooth dragging */}
      <DragOverlay>
        {activeItem && <DragPreview item={activeItem} />}
      </DragOverlay>
    </DndContext>
  );
}
```

## Sensors Configuration

```typescript
// src/hooks/usePlannerDnd.ts
export function usePlannerDnd() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ... rest of hook
}
```

## Sortable Item Component

```typescript
// src/components/planner/DraggableActivityCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Activity } from '@/types';

interface DraggableActivityCardProps {
  activity: Activity;
  dayId: string;
}

export function DraggableActivityCard({
  activity,
  dayId,
}: DraggableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity.id,
    data: {
      type: 'activity',
      activity,
      dayId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-3 bg-white rounded-lg border shadow-sm
        ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <h4 className="font-medium">{activity.title}</h4>
      <p className="text-sm text-gray-500">{activity.time}</p>
    </div>
  );
}
```

## Sortable Container (Day Column)

```typescript
// src/components/planner/DraggableDayColumn.tsx
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { DayItinerary } from '@/types';

interface DraggableDayColumnProps {
  day: DayItinerary;
}

export function DraggableDayColumn({ day }: DraggableDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.id}`,
    data: {
      type: 'day',
      dayId: day.id,
    },
  });

  const activityIds = day.activities.map(a => a.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        w-72 flex-shrink-0 bg-gray-50 rounded-lg p-3
        ${isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
      `}
    >
      <h3 className="font-semibold mb-3">Day {day.dayNumber}</h3>

      <SortableContext
        items={activityIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {day.activities.map((activity) => (
            <DraggableActivityCard
              key={activity.id}
              activity={activity}
              dayId={day.id}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

## Drag Event Handlers

```typescript
// src/hooks/usePlannerDnd.ts
export function usePlannerDnd() {
  const { reorderActivitiesInDay, moveActivityBetweenDays } = useTripStore();
  const { pushUndo } = usePlannerUndo();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<Activity | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Store the dragged item for overlay
    const { activity } = active.data.current as { activity: Activity };
    setActiveItem(activity);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle cross-container preview (optional)
    if (activeData?.dayId !== overData?.dayId) {
      // Could update UI to show preview in new container
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    const activeData = active.data.current as {
      type: string;
      activity: Activity;
      dayId: string;
    };
    const overData = over.data.current as {
      type: string;
      dayId?: string;
    };

    // Same container reorder
    if (activeData.dayId === overData.dayId) {
      const activities = getDayActivities(activeData.dayId);
      const oldIndex = activities.findIndex(a => a.id === active.id);
      const newIndex = activities.findIndex(a => a.id === over.id);

      if (oldIndex !== newIndex) {
        // Save for undo
        pushUndo({ type: 'reorder', dayId: activeData.dayId, activities });

        await reorderActivitiesInDay(activeData.dayId, oldIndex, newIndex);
      }
    }
    // Cross-container move
    else if (overData.dayId) {
      const destinationActivities = getDayActivities(overData.dayId);
      const destinationIndex = over.data.current?.type === 'activity'
        ? destinationActivities.findIndex(a => a.id === over.id)
        : destinationActivities.length;

      // Save for undo
      pushUndo({
        type: 'move',
        activityId: active.id as string,
        sourceDayId: activeData.dayId,
        destinationDayId: overData.dayId,
      });

      await moveActivityBetweenDays(
        active.id as string,
        activeData.dayId,
        overData.dayId,
        destinationIndex
      );
    }
  }, [reorderActivitiesInDay, moveActivityBetweenDays, pushUndo]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveItem(null);
  }, []);

  return {
    activeId,
    activeItem,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
```

## Immutable Reorder Utilities

```typescript
// src/utils/plannerUtils.ts

// Reorder within same array
export function reorderActivities(
  activities: Activity[],
  sourceIndex: number,
  destinationIndex: number
): Activity[] {
  const result = Array.from(activities);
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(destinationIndex, 0, removed);
  return result;
}

// Move between arrays
export function moveActivityBetweenDays(
  sourceDays: DayItinerary[],
  activityId: string,
  sourceDayId: string,
  destinationDayId: string,
  destinationIndex: number
): DayItinerary[] {
  return sourceDays.map(day => {
    if (day.id === sourceDayId) {
      return {
        ...day,
        activities: day.activities.filter(a => a.id !== activityId),
      };
    }
    if (day.id === destinationDayId) {
      const activity = sourceDays
        .find(d => d.id === sourceDayId)
        ?.activities.find(a => a.id === activityId);

      if (!activity) return day;

      const newActivities = Array.from(day.activities);
      newActivities.splice(destinationIndex, 0, activity);
      return { ...day, activities: newActivities };
    }
    return day;
  });
}
```

## Undo/Redo Support

```typescript
// src/hooks/usePlannerUndo.ts
interface UndoState {
  type: 'reorder' | 'move' | 'delete';
  // State before the action
  previousState: DayItinerary[];
}

export function usePlannerUndo() {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);

  const pushUndo = useCallback((state: UndoState) => {
    setUndoStack(prev => [...prev, state]);
    setRedoStack([]); // Clear redo on new action
  }, []);

  const undo = useCallback(async () => {
    const lastState = undoStack[undoStack.length - 1];
    if (!lastState) return;

    // Restore previous state
    await replaceItineraryDays(lastState.previousState);

    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
  }, [undoStack]);

  const redo = useCallback(async () => {
    const lastRedo = redoStack[redoStack.length - 1];
    if (!lastRedo) return;

    // Apply redo state
    await replaceItineraryDays(lastRedo.previousState);

    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
  }, [redoStack]);

  return { pushUndo, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}
```

## Keyboard Shortcuts

```typescript
// src/hooks/usePlannerKeyboard.ts
export function usePlannerKeyboard() {
  const { undo, redo, canUndo, canRedo } = usePlannerUndo();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}
```
