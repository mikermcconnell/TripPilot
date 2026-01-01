import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Calendar } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import type { DraggableDayColumnProps } from '@/types/planner';
import type { Activity } from '@/types/itinerary';
import { DraggableActivityCard } from './DraggableActivityCard';
import { EmptyDayPlaceholder } from './EmptyDayPlaceholder';
import { usePlannerStore } from '@/stores/plannerStore';
import { useTripStore } from '@/stores/tripStore';

interface ExtendedDraggableDayColumnProps extends DraggableDayColumnProps {
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (dayId: string, activityId: string) => void;
}

export function DraggableDayColumn({
  day,
  index: _index,
  isActive: _isActive,
  isDragging: _isDragging,
  isDropTarget,
  onEditActivity,
  onDeleteActivity,
}: ExtendedDraggableDayColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `day-${day.id}`,
    data: {
      type: 'day',
      dayId: day.id,
    },
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `day-column-${day.id}`,
    data: {
      type: 'day-column',
      dayId: day.id,
    },
  });

  const { openActivityQuickAdd, setPendingDeleteDay } = usePlannerStore();
  const { getActiveTripDays } = useTripStore();

  const allDays = getActiveTripDays();
  const canDelete = allDays.length > 1;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={`
        flex-shrink-0 w-[350px]
        bg-gray-50 rounded-lg border-2
        ${isDropTarget ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
        ${isSortableDragging ? 'ring-2 ring-indigo-500 shadow-xl' : 'shadow-sm'}
        transition-all duration-200
      `}
    >
      {/* Day Header */}
      <div className="bg-white border-b-2 border-gray-200 p-4 rounded-t-lg">
        <div className="flex items-center gap-2">
          {/* Drag Handle for Day */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Drag to reorder day"
          >
            <GripVertical size={20} />
          </button>

          {/* Day Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg text-gray-900">
              Day {day.dayNumber}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar size={14} />
              <span>{format(parseISO(day.date), 'EEE, MMM d')}</span>
            </div>
          </div>

          {/* Delete Day Button */}
          <button
            onClick={() => setPendingDeleteDay(day.id)}
            disabled={!canDelete}
            className={`
              p-2 rounded transition-colors
              ${canDelete
                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-300 cursor-not-allowed'
              }
            `}
            style={{ minHeight: '44px', minWidth: '44px' }}
            title={canDelete ? 'Delete day' : 'Cannot delete the only day'}
            aria-label="Delete day"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Activities Container */}
      <div className="p-4 space-y-2 min-h-[200px]">
        {day.activities.length === 0 ? (
          <EmptyDayPlaceholder
            dayId={day.id}
            onAddActivity={() => openActivityQuickAdd(day.id)}
          />
        ) : (
          <SortableContext
            items={day.activities.map(a => `activity-${a.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {day.activities.map((activity, activityIndex) => (
              <DraggableActivityCard
                key={activity.id}
                activity={activity}
                dayId={day.id}
                index={activityIndex}
                isDragging={false}
                isEditing={false}
                onEdit={onEditActivity}
                onDelete={onDeleteActivity}
              />
            ))}
          </SortableContext>
        )}

        {/* Add Activity Button */}
        {day.activities.length > 0 && (
          <button
            onClick={() => openActivityQuickAdd(day.id)}
            className="w-full py-2 px-3 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all"
            style={{ minHeight: '44px' }}
          >
            <Plus size={16} />
            <span>Add Activity</span>
          </button>
        )}
      </div>
    </div>
  );
}
