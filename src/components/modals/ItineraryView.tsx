import React, { useEffect, useState, useMemo } from 'react';
import { DayItinerary, Activity, LocationData } from '@/types';
import { Calendar, MapPin, Coffee, Bed, Car, Camera, Trash2, GripVertical, Sunrise, Sun, Moon, Clock, Plus } from 'lucide-react';
import { ActivityDetail } from '@/components/features/activity/ActivityDetail';
import { ActivityEditModal } from '@/components/features/activity/ActivityEditModal';
import { AddDayModal } from '@/components/features/day/AddDayModal';
import { AddActivityModal } from '@/components/features/activity/AddActivityModal';
import { DayLocationEditor } from '@/components/features/day/DayLocationEditor';
import { InterDayTravelEditor } from '@/components/features/day/InterDayTravelEditor';
import { useTripStore } from '@/stores/tripStore';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Determine time period for an activity
 */
type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'unscheduled';

function getTimePeriod(timeStr: string | undefined): TimePeriod {
  if (!timeStr) return 'unscheduled';

  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return 'unscheduled';

  if (minutes < 12 * 60) return 'morning';       // Before noon
  if (minutes < 17 * 60) return 'afternoon';     // Noon to 5 PM
  return 'evening';                               // 5 PM onwards
}

/**
 * Group activities by time period
 */
interface GroupedActivities {
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
  unscheduled: Activity[];
}

function groupActivitiesByTime(activities: Activity[]): GroupedActivities {
  const grouped: GroupedActivities = {
    morning: [],
    afternoon: [],
    evening: [],
    unscheduled: [],
  };

  activities.forEach(activity => {
    const period = getTimePeriod(activity.time);
    grouped[period].push(activity);
  });

  return grouped;
}

/**
 * Get the display location for a day
 * Priority: primaryLocation > first activity location > null
 */
function getDayDisplayLocation(day: DayItinerary): string | null {
  // First check primary location
  if (day.primaryLocation?.name) {
    return day.primaryLocation.name;
  }

  // Fallback to extracting from activities
  for (const activity of day.activities) {
    const address = activity.location.address || '';
    const locationName = activity.location.name || '';

    // Try to extract city from address (simple heuristic)
    // Format examples: "123 Main St, Dublin, Ireland" or "Paris, France"
    const addressParts = address.split(',').map(p => p.trim());
    if (addressParts.length >= 2) {
      // Second-to-last part is often the city
      const city = addressParts[addressParts.length - 2];
      if (city && city.length > 2 && city.length < 30) {
        return city;
      }
    }

    // If location name looks like a city (short, no numbers)
    if (locationName && locationName.length < 30 && !/\d/.test(locationName)) {
      const parts = locationName.split(',').map(p => p.trim());
      if (parts.length > 1) {
        return parts[0];
      }
    }
  }

  return null;
}

/**
 * Activity type color schemes
 */
const ACTIVITY_TYPE_STYLES: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  food: {
    icon: <Coffee className="w-5 h-5" />,
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600'
  },
  lodging: {
    icon: <Bed className="w-5 h-5" />,
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-600'
  },
  travel: {
    icon: <Car className="w-5 h-5" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600'
  },
  activity: {
    icon: <Camera className="w-5 h-5" />,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600'
  }
};

const getActivityTypeStyles = (type: string) => {
  return ACTIVITY_TYPE_STYLES[type] || ACTIVITY_TYPE_STYLES.activity;
};

const TIME_PERIOD_INFO = {
  morning: { label: 'Morning', icon: <Sunrise className="w-4 h-4" />, color: 'text-amber-600' },
  afternoon: { label: 'Afternoon', icon: <Sun className="w-4 h-4" />, color: 'text-orange-600' },
  evening: { label: 'Evening', icon: <Moon className="w-4 h-4" />, color: 'text-indigo-600' },
  unscheduled: { label: 'Unscheduled', icon: <Clock className="w-4 h-4" />, color: 'text-gray-600' },
};

interface DraggableActivityCardProps {
  activity: Activity;
  dayId: string;
  period: TimePeriod;
  onActivityHover: (id: string | null) => void;
  onActivitySelect: (id: string | null) => void;
  onActivityClick: (activity: Activity, dayId: string) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  isHovered: boolean;
  isSelected: boolean;
}

function DraggableActivityCard({
  activity,
  dayId,
  period,
  onActivityHover,
  onActivitySelect,
  onActivityClick,
  onDeleteActivity,
  isHovered,
  isSelected,
}: DraggableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${dayId}-${period}-${activity.id}`,
    data: {
      type: 'activity',
      activityId: activity.id,
      sourceDayId: dayId,
      sourcePeriod: period,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeStyles = getActivityTypeStyles(activity.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`activity-${activity.id}`}
      onMouseEnter={() => onActivityHover(activity.id)}
      onMouseLeave={() => onActivityHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onActivitySelect(activity.id);
        onActivityClick(activity, dayId);
      }}
      className={`
        group relative transition-all duration-200 cursor-pointer rounded-xl p-3
        ${typeStyles.bg} ${typeStyles.border} border-2
        ${isHovered ? 'ring-2 ring-blue-300 shadow-lg scale-[1.02]' : ''}
        ${isSelected ? 'ring-4 ring-blue-500 shadow-xl scale-[1.02]' : ''}
        ${isDragging ? 'ring-2 ring-blue-500 shadow-2xl' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ minHeight: '24px', minWidth: '24px' }}
        >
          <GripVertical size={16} />
        </button>

        {/* Activity Icon */}
        <div className={`flex-shrink-0 ${typeStyles.text}`}>
          {typeStyles.icon}
        </div>

        {/* Activity Content */}
        <div className="flex-1 min-w-0">
          {activity.time && (
            <div className={`text-xs font-bold ${typeStyles.text} mb-1`}>
              {activity.time}
            </div>
          )}
          <div className="font-semibold text-sm text-slate-800 mb-1">
            {activity.description}
          </div>
          {activity.location.name && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{activity.location.name}</span>
            </div>
          )}
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteActivity(dayId, activity.id);
          }}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

interface TimePeriodSectionProps {
  period: TimePeriod;
  activities: Activity[];
  dayId: string;
  onActivityHover: (id: string | null) => void;
  onActivitySelect: (id: string | null) => void;
  onActivityClick: (activity: Activity, dayId: string) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
}

function TimePeriodSection({
  period,
  activities,
  dayId,
  onActivityHover,
  onActivitySelect,
  onActivityClick,
  onDeleteActivity,
  hoveredActivityId,
  selectedActivityId,
}: TimePeriodSectionProps) {
  const periodInfo = TIME_PERIOD_INFO[period];

  if (activities.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Period Header */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <div className={periodInfo.color}>{periodInfo.icon}</div>
        <h4 className={`text-sm font-bold uppercase tracking-wide ${periodInfo.color}`}>
          {periodInfo.label}
        </h4>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Activities List */}
      <SortableContext
        items={activities.map(a => `${dayId}-${period}-${a.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {activities.map(activity => (
            <DraggableActivityCard
              key={`${dayId}-${period}-${activity.id}`}
              activity={activity}
              dayId={dayId}
              period={period}
              onActivityHover={onActivityHover}
              onActivitySelect={onActivitySelect}
              onActivityClick={onActivityClick}
              onDeleteActivity={onDeleteActivity}
              isHovered={hoveredActivityId === activity.id}
              isSelected={selectedActivityId === activity.id}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

/**
 * Sortable Day Card - makes entire days draggable for reordering
 */
interface SortableDayCardProps {
  day: DayItinerary & { groupedActivities: GroupedActivities; displayLocation: string | null };
  index: number;
  isActive: boolean;
  totalDays: number;
  onDaySelect: (id: string) => void;
  onActivityHover: (id: string | null) => void;
  onActivitySelect: (id: string | null) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  handleActivityClick: (activity: Activity, dayId: string) => void;
  handleOpenAddDayModal: (position: number) => void;
  handleOpenAddActivityModal: (dayNumber: number, dayId: string, period: TimePeriod) => void;
  handleDayLocationChange: (dayId: string, location: LocationData) => void;
  handleDayLocationReset: (dayId: string) => void;
}

function SortableDayCard({
  day,
  index,
  isActive,
  totalDays,
  onDaySelect,
  onActivityHover,
  onActivitySelect,
  onDeleteActivity,
  hoveredActivityId,
  selectedActivityId,
  handleActivityClick,
  handleOpenAddDayModal,
  handleOpenAddActivityModal,
  handleDayLocationChange,
  handleDayLocationReset,
}: SortableDayCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `day-${day.id}`,
    data: {
      type: 'day',
      dayId: day.id,
      dayIndex: index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <React.Fragment>
      {/* Add Day Button at Start */}
      {index === 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAddDayModal(0);
          }}
          className="w-full py-2 flex items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-300 transition-all group"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-bold">Add Day at Start</span>
        </button>
      )}

      <div
        ref={setNodeRef}
        style={style}
        id={`day-${day.id}`}
        onClick={() => onDaySelect(day.id)}
        className={`
          relative transition-all duration-200 cursor-pointer rounded-2xl
          ${isActive
            ? 'bg-white border-2 border-blue-400 ring-4 ring-blue-100/50 z-10'
            : 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:translate-y-[-2px]'}
          ${isDragging ? 'shadow-2xl ring-4 ring-emerald-300' : ''}
        `}
      >
        {/* Day Header */}
        <div className={`p-4 rounded-t-2xl border-b-2 ${isActive ? 'bg-blue-50 border-blue-100' : 'bg-transparent border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Day drag handle */}
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-5 h-5" />
              </button>
              <div className={`
                w-12 h-12 rounded-2xl border-b-4 flex items-center justify-center font-black text-lg
                ${isActive
                  ? 'bg-blue-500 border-blue-700 text-white'
                  : 'bg-slate-200 border-slate-300 text-slate-500'}
              `}>
                {day.dayNumber}
              </div>
              <div>
                <h3 className={`font-bold text-lg ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
                  Day {day.dayNumber}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{day.date}</p>
              </div>
            </div>

            {/* Day Location Editor & Stats */}
            <div className="flex items-center gap-4">
              {/* Editable Location */}
              <div onClick={(e) => e.stopPropagation()}>
                <DayLocationEditor
                  location={day.primaryLocation}
                  onLocationChange={(location) => handleDayLocationChange(day.id, location)}
                  onReset={() => handleDayLocationReset(day.id)}
                  placeholder="Set location..."
                />
              </div>

              {/* Day Stats */}
              {day.activities.length > 0 && (
                <div className="text-center px-2 border-l-2 border-slate-200">
                  <div className="text-lg font-black text-slate-600">{day.activities.length}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Activities</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time Period Sections */}
        <div className="p-4" onClick={(e) => e.stopPropagation()}>
          <TimePeriodSection
            period="morning"
            activities={day.groupedActivities.morning}
            dayId={day.id}
            onActivityHover={onActivityHover}
            onActivitySelect={onActivitySelect}
            onActivityClick={handleActivityClick}
            onDeleteActivity={onDeleteActivity}
            hoveredActivityId={hoveredActivityId}
            selectedActivityId={selectedActivityId}
          />
          <TimePeriodSection
            period="afternoon"
            activities={day.groupedActivities.afternoon}
            dayId={day.id}
            onActivityHover={onActivityHover}
            onActivitySelect={onActivitySelect}
            onActivityClick={handleActivityClick}
            onDeleteActivity={onDeleteActivity}
            hoveredActivityId={hoveredActivityId}
            selectedActivityId={selectedActivityId}
          />
          <TimePeriodSection
            period="evening"
            activities={day.groupedActivities.evening}
            dayId={day.id}
            onActivityHover={onActivityHover}
            onActivitySelect={onActivitySelect}
            onActivityClick={handleActivityClick}
            onDeleteActivity={onDeleteActivity}
            hoveredActivityId={hoveredActivityId}
            selectedActivityId={selectedActivityId}
          />
          <TimePeriodSection
            period="unscheduled"
            activities={day.groupedActivities.unscheduled}
            dayId={day.id}
            onActivityHover={onActivityHover}
            onActivitySelect={onActivitySelect}
            onActivityClick={handleActivityClick}
            onDeleteActivity={onDeleteActivity}
            hoveredActivityId={hoveredActivityId}
            selectedActivityId={selectedActivityId}
          />

          {/* Add Activity Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAddActivityModal(day.dayNumber, day.id, 'unscheduled');
            }}
            className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-bold">Add Activity</span>
          </button>
        </div>
      </div>

      {/* Add Day Button (after this day) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenAddDayModal(index + 1);
        }}
        className="w-full py-2 flex items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-300 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-bold">
          {index === totalDays - 1 ? 'Add Day at End' : `Insert Day Between ${day.dayNumber} & ${day.dayNumber + 1}`}
        </span>
      </button>
    </React.Fragment>
  );
}

interface ItineraryViewProps {
  days: DayItinerary[];
  activeDayId: string | null;
  onDaySelect: (id: string) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onUpdateActivity?: (dayId: string, activityId: string, updatedActivity: Activity) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  onActivityHover: (id: string | null) => void;
  onActivitySelect: (id: string | null) => void;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({
  days,
  activeDayId,
  onDaySelect,
  onDeleteActivity,
  onUpdateActivity,
  hoveredActivityId,
  selectedActivityId,
  onActivityHover,
  onActivitySelect
}) => {
  const [detailActivity, setDetailActivity] = useState<{ activity: Activity; dayId: string } | null>(null);
  const [editActivity, setEditActivity] = useState<{ activity: Activity; dayId: string } | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // State for Add Day Modal
  const [addDayModalOpen, setAddDayModalOpen] = useState(false);
  const [addDayPosition, setAddDayPosition] = useState(0);

  // State for Add Activity Modal
  const [addActivityModalOpen, setAddActivityModalOpen] = useState(false);
  const [addActivityDayInfo, setAddActivityDayInfo] = useState<{ dayNumber: number; dayId: string; period: TimePeriod } | null>(null);

  const { reorderActivitiesInDay, moveActivityBetweenDays, addDayWithLocation, addActivity, updateDayLocation, resetDayLocation, updateDayTravel, reorderDays } = useTripStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  // Group activities by time period for each day
  const daysWithGroupedActivities = useMemo(() => {
    return days.map(day => ({
      ...day,
      groupedActivities: groupActivitiesByTime(day.activities),
      displayLocation: getDayDisplayLocation(day),
    }));
  }, [days]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragItem(null);

    if (!over) return;

    const activeData = active.data.current as any;
    const overData = over.data.current as any;

    if (!activeData || !overData) return;

    // Handle day reordering
    if (activeData.type === 'day') {
      if (overData.type === 'day' && activeData.dayId !== overData.dayId) {
        const sourceIndex = activeData.dayIndex;
        const destIndex = overData.dayIndex;
        reorderDays(sourceIndex, destIndex);
      }
      return;
    }

    // Handle activity reordering/moving
    const sourceDayId = activeData.sourceDayId;
    const destDayId = overData.sourceDayId || overData.dayId;
    const activityId = activeData.activityId;
    const sourcePeriod = activeData.sourcePeriod;
    const destPeriod = overData.sourcePeriod || overData.period;

    // Find the activity being moved
    const sourceDay = days.find(d => d.id === sourceDayId);
    if (!sourceDay) return;

    const sourceActivityIndex = sourceDay.activities.findIndex(a => a.id === activityId);
    if (sourceActivityIndex === -1) return;

    // Same day, same period - reorder within period
    if (sourceDayId === destDayId && sourcePeriod === destPeriod) {
      const destDay = days.find(d => d.id === destDayId);
      if (!destDay) return;

      const periodActivities = groupActivitiesByTime(destDay.activities)[destPeriod as TimePeriod];
      const destActivityIndex = periodActivities.findIndex((a: Activity) => a.id === overData.activityId);

      if (destActivityIndex !== -1) {
        // Calculate actual indices in the full activities array
        const actualDestIndex = destDay.activities.findIndex(a => a.id === periodActivities[destActivityIndex].id);

        if (sourceActivityIndex !== actualDestIndex) {
          reorderActivitiesInDay(sourceDayId, sourceActivityIndex, actualDestIndex);
        }
      }
    } else {
      // Cross-day or cross-period move
      const destDay = days.find(d => d.id === destDayId);
      if (!destDay) return;

      // Find the destination index
      let destIndex = destDay.activities.length; // Default to end

      if (overData.activityId) {
        const overActivityIndex = destDay.activities.findIndex(a => a.id === overData.activityId);
        if (overActivityIndex !== -1) {
          destIndex = overActivityIndex;
        }
      }

      moveActivityBetweenDays(activityId, sourceDayId, destDayId, destIndex);
    }
  };

  // Scroll selected activity into view
  useEffect(() => {
    if (selectedActivityId) {
      const element = document.getElementById(`activity-${selectedActivityId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const dayId = days.find(d => d.activities.some(a => a.id === selectedActivityId))?.id;
        if (dayId && dayId !== activeDayId) {
          onDaySelect(dayId);
        }
      }
    }
  }, [selectedActivityId, days, activeDayId, onDaySelect]);

  const handleActivityClick = (activity: Activity, dayId: string) => {
    setDetailActivity({ activity, dayId });
  };

  const handleActivityEdit = (activity: Activity, dayId: string) => {
    setEditActivity({ activity, dayId });
  };

  const handleActivityUpdate = (updatedActivity: Partial<Activity>) => {
    if (editActivity && onUpdateActivity) {
      onUpdateActivity(editActivity.dayId, editActivity.activity.id, updatedActivity as Activity);
      setEditActivity(null);
    }
  };

  // Handlers for adding days
  const handleOpenAddDayModal = (position: number) => {
    setAddDayPosition(position);
    setAddDayModalOpen(true);
  };

  const handleAddDay = async (position: number, locationName: string) => {
    try {
      await addDayWithLocation(position, locationName);
      setAddDayModalOpen(false);
    } catch (error) {
      console.error('Failed to add day:', error);
    }
  };

  // Handlers for adding activities
  const handleOpenAddActivityModal = (dayNumber: number, dayId: string, period: TimePeriod) => {
    setAddActivityDayInfo({ dayNumber, dayId, period });
    setAddActivityModalOpen(true);
  };

  const handleAddActivity = async (activityData: Omit<Activity, 'id'>) => {
    if (!addActivityDayInfo) return;

    try {
      await addActivity(addActivityDayInfo.dayNumber, activityData);
      setAddActivityModalOpen(false);
      setAddActivityDayInfo(null);
    } catch (error) {
      console.error('Failed to add activity:', error);
    }
  };

  // Handler for updating day's primary location
  const handleDayLocationChange = async (dayId: string, location: LocationData) => {
    try {
      await updateDayLocation(dayId, location);
    } catch (error) {
      console.error('Failed to update day location:', error);
    }
  };

  // Handler for resetting day's primary location
  const handleDayLocationReset = async (dayId: string) => {
    try {
      await resetDayLocation(dayId);
    } catch (error) {
      console.error('Failed to reset day location:', error);
    }
  };

  if (!days || days.length === 0) {
    return (
      <div className="h-full bg-gradient-to-b from-emerald-50/50 to-slate-50/30">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 mb-4">
          <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
            <Calendar className="w-4 h-4" />
            Daily Itinerary
          </div>
          <h2 className="text-xl font-extrabold text-white">Your Journey</h2>
        </div>

        <div className="flex items-center justify-center h-[calc(100%-120px)]">
          <div className="text-center p-8">
            <Calendar className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">
              Your Itinerary Awaits
            </h3>
            <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
              No activities scheduled yet. Chat with TripPilot to start planning your perfect day!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-emerald-50/50 to-slate-50/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest">
              <Calendar className="w-4 h-4" />
              Daily Itinerary
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-white">Your Journey</h2>
        </div>

        <div className="px-6">
          <SortableContext
            items={daysWithGroupedActivities.map(d => `day-${d.id}`)}
            strategy={verticalListSortingStrategy}
          >
          <div className="space-y-2">
            {daysWithGroupedActivities.map((day, index) => {
              const isActive = activeDayId === day.id;
              const previousDay = index > 0 ? daysWithGroupedActivities[index - 1] : null;
              const showTravelEditor = previousDay && previousDay.displayLocation && day.displayLocation;

              return (
                <React.Fragment key={day.id}>
                  {/* Inter-day travel editor (between different locations) */}
                  {showTravelEditor && previousDay.displayLocation !== day.displayLocation && (
                    <InterDayTravelEditor
                      fromDayNumber={previousDay.dayNumber}
                      toDayNumber={day.dayNumber}
                      fromLocation={previousDay.displayLocation || ''}
                      toLocation={day.displayLocation || ''}
                      fromCoordinates={previousDay.primaryLocation?.coordinates}
                      toCoordinates={day.primaryLocation?.coordinates}
                      travel={day.travelFromPrevious}
                      onTravelChange={(travel) => updateDayTravel(day.id, travel)}
                    />
                  )}
                  <SortableDayCard
                    day={day}
                    index={index}
                    isActive={isActive}
                    totalDays={daysWithGroupedActivities.length}
                    onDaySelect={onDaySelect}
                    onActivityHover={onActivityHover}
                    onActivitySelect={onActivitySelect}
                    onDeleteActivity={onDeleteActivity}
                    hoveredActivityId={hoveredActivityId}
                    selectedActivityId={selectedActivityId}
                    handleActivityClick={handleActivityClick}
                    handleOpenAddDayModal={handleOpenAddDayModal}
                    handleOpenAddActivityModal={handleOpenAddActivityModal}
                    handleDayLocationChange={handleDayLocationChange}
                    handleDayLocationReset={handleDayLocationReset}
                  />
                </React.Fragment>
              );
            })}
          </div>
          </SortableContext>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragItem && activeDragItem.type === 'day' && (
            <div className="bg-emerald-50 rounded-2xl shadow-2xl p-4 border-2 border-emerald-500 opacity-95 min-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
                  {daysWithGroupedActivities.find(d => d.id === activeDragItem.dayId)?.dayNumber || '?'}
                </div>
                <div>
                  <div className="font-bold text-emerald-800">Moving Day</div>
                  <div className="text-xs text-emerald-600">
                    {daysWithGroupedActivities.find(d => d.id === activeDragItem.dayId)?.displayLocation || 'Drop to reorder'}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeDragItem && activeDragItem.type === 'activity' && (
            <div className="bg-white rounded-xl shadow-2xl p-3 border-2 border-blue-500 opacity-90">
              <div className="font-semibold text-sm">Dragging activity...</div>
            </div>
          )}
        </DragOverlay>
      </div>

      {/* Activity Detail Modal */}
      {detailActivity && (
        <ActivityDetail
          activity={detailActivity.activity}
          onClose={() => setDetailActivity(null)}
          onEdit={() => {
            handleActivityEdit(detailActivity.activity, detailActivity.dayId);
            setDetailActivity(null);
          }}
        />
      )}

      {/* Activity Edit Modal */}
      {editActivity && (
        <ActivityEditModal
          activity={editActivity.activity}
          onClose={() => setEditActivity(null)}
          onSave={handleActivityUpdate}
        />
      )}

      {/* Add Day Modal */}
      <AddDayModal
        isOpen={addDayModalOpen}
        onClose={() => setAddDayModalOpen(false)}
        onSubmit={handleAddDay}
        suggestedPosition={addDayPosition}
        totalDays={days.length}
      />

      {/* Add Activity Modal */}
      {addActivityDayInfo && (
        <AddActivityModal
          isOpen={addActivityModalOpen}
          onClose={() => {
            setAddActivityModalOpen(false);
            setAddActivityDayInfo(null);
          }}
          onSubmit={handleAddActivity}
          dayNumber={addActivityDayInfo.dayNumber}
          timePeriod={addActivityDayInfo.period}
          locationBias={days.find(d => d.id === addActivityDayInfo.dayId)?.primaryLocation?.coordinates}
        />
      )}
    </DndContext>
  );
};

export default ItineraryView;
