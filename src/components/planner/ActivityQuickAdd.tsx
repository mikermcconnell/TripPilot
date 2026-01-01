import { useState, useCallback } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import type { ActivityQuickAddProps } from '@/types/planner';
import type { ActivityType } from '@/types/itinerary';

// Validation constants
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_LOCATION_LENGTH = 200;
const TIME_PATTERN = /^(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?$/;

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'activity', label: 'Activity' },
  { value: 'travel', label: 'Travel' },
];

interface ValidationErrors {
  description?: string;
  time?: string;
  location?: string;
}

export function ActivityQuickAdd({
  dayId: _dayId,
  onSubmit,
  onCancel,
  defaultTime,
}: ActivityQuickAddProps) {
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(defaultTime || '');
  const [type, setType] = useState<ActivityType>('activity');
  const [locationName, setLocationName] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case 'description':
        if (!value.trim()) {
          return 'Description is required';
        }
        if (value.length > MAX_DESCRIPTION_LENGTH) {
          return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
        }
        return undefined;
      case 'time':
        if (value && !TIME_PATTERN.test(value)) {
          return 'Enter time like 9:00 AM or 14:30';
        }
        return undefined;
      case 'location':
        if (value.length > MAX_LOCATION_LENGTH) {
          return `Location must be ${MAX_LOCATION_LENGTH} characters or less`;
        }
        return undefined;
      default:
        return undefined;
    }
  }, []);

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleDescriptionChange = (value: string) => {
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
      if (touched.description) {
        setErrors(prev => ({ ...prev, description: validateField('description', value) }));
      }
    }
  };

  const handleLocationChange = (value: string) => {
    if (value.length <= MAX_LOCATION_LENGTH) {
      setLocationName(value);
      if (touched.location) {
        setErrors(prev => ({ ...prev, location: validateField('location', value) }));
      }
    }
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
    if (touched.time) {
      setErrors(prev => ({ ...prev, time: validateField('time', value) }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: ValidationErrors = {
      description: validateField('description', description),
      time: validateField('time', time),
      location: validateField('location', locationName),
    };

    setErrors(newErrors);
    setTouched({ description: true, time: true, location: true });

    // Check for any errors
    if (Object.values(newErrors).some(error => error)) {
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
    setErrors({});
    setTouched({});
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
            onChange={(e) => handleDescriptionChange(e.target.value)}
            onBlur={() => handleBlur('description', description)}
            placeholder="e.g., Lunch at beachside cafe"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description && touched.description ? 'border-red-500' : 'border-gray-300'
            }`}
            autoFocus
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          {errors.description && touched.description && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.description}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400 text-right">
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </p>
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
            onChange={(e) => handleTimeChange(e.target.value)}
            onBlur={() => handleBlur('time', time)}
            placeholder="e.g., 12:00 PM"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.time && touched.time ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.time && touched.time && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.time}
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location (optional)
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => handleLocationChange(e.target.value)}
            onBlur={() => handleBlur('location', locationName)}
            placeholder="e.g., Blue Bay Restaurant"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.location && touched.location ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={MAX_LOCATION_LENGTH}
          />
          {errors.location && touched.location && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.location}
            </p>
          )}
          {locationName.length > MAX_LOCATION_LENGTH - 50 && (
            <p className="mt-1 text-xs text-gray-400 text-right">
              {locationName.length}/{MAX_LOCATION_LENGTH}
            </p>
          )}
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
