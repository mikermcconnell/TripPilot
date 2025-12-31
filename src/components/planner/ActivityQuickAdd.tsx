import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { ActivityQuickAddProps } from '@/types/planner';
import type { ActivityType } from '@/types/itinerary';

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'activity', label: 'Activity' },
  { value: 'travel', label: 'Travel' },
];

export function ActivityQuickAdd({
  dayId,
  onSubmit,
  onCancel,
  defaultTime,
}: ActivityQuickAddProps) {
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(defaultTime || '');
  const [type, setType] = useState<ActivityType>('activity');
  const [locationName, setLocationName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      return;
    }

    onSubmit({
      description: description.trim(),
      time: time || undefined,
      type,
      location: {
        name: locationName.trim() || '',
      },
    });

    // Reset form
    setDescription('');
    setTime(defaultTime || '');
    setType('activity');
    setLocationName('');
  };

  return (
    <div className="bg-white rounded-lg border-2 border-blue-500 shadow-lg p-4 animate-in slide-in-from-bottom duration-200">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Activity Description *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Lunch at beachside cafe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ACTIVITY_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time (optional)
          </label>
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g., 12:00 PM"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location (optional)
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g., Blue Bay Restaurant"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            style={{ minHeight: '44px' }}
          >
            <Check size={16} />
            <span>Add Activity</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
