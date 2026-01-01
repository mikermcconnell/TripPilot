import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, MapPin, Clock } from 'lucide-react';
import type { DraggableActivityCardProps } from '@/types/planner';
import type { Activity } from '@/types/itinerary';

const ACTIVITY_TYPE_COLORS = {
  food: 'bg-activity-food border-activity-food',
  lodging: 'bg-activity-lodging border-activity-lodging',
  activity: 'bg-activity-explore border-activity-explore',
  travel: 'bg-activity-travel border-activity-travel',
};

interface ExtendedDraggableActivityCardProps extends DraggableActivityCardProps {
  onEdit?: (activity: Activity) => void;
  onDelete?: (dayId: string, activityId: string) => void;
}

export function DraggableActivityCard({
  activity,
  dayId,
  index: _index,
  isDragging: _isDragging,
  isEditing,
  onEdit,
  onDelete,
}: ExtendedDraggableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `activity-${activity.id}`,
    data: {
      type: 'activity',
      activityId: activity.id,
      sourceDayId: dayId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const colorClass = ACTIVITY_TYPE_COLORS[activity.type] || ACTIVITY_TYPE_COLORS.activity;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group
        bg-white rounded-lg border-l-4 ${colorClass}
        shadow-sm hover:shadow-md
        transition-all duration-200
        ${isSortableDragging ? 'z-50 ring-2 ring-blue-500' : ''}
        ${isEditing ? 'ring-2 ring-indigo-500' : ''}
      `}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          style={{ minHeight: '44px', minWidth: '44px' }}
          aria-label="Drag to reorder"
        >
          <GripVertical size={20} />
        </button>

        {/* Activity Content */}
        <div className="flex-1 min-w-0">
          {/* Time */}
          {activity.time && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
              <Clock size={14} />
              <span className="font-medium">{activity.time}</span>
              {activity.endTime && (
                <span className="text-gray-400">- {activity.endTime}</span>
              )}
            </div>
          )}

          {/* Description */}
          <div className="font-medium text-gray-900 mb-1">
            {activity.description}
          </div>

          {/* Location */}
          {activity.location.name && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin size={14} />
              <span className="truncate">{activity.location.name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(activity);
            }}
            className="p-2 text-gray-400 hover:text-blue-600 rounded transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Edit activity"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(dayId, activity.id);
            }}
            className="p-2 text-gray-400 hover:text-red-600 rounded transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Delete activity"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
