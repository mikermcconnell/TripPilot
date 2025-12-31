import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Clock, Tag, Loader2, Check, Star, Navigation } from 'lucide-react';
import type { Activity, GeoCoordinates } from '@/types';
import type { PlacePrediction, PlaceDetails } from '@/types/maps';
import { placesService } from '@/services/maps/placesService';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activity: Omit<Activity, 'id'>) => void;
  dayNumber: number;
  timePeriod?: 'morning' | 'afternoon' | 'evening' | 'unscheduled';
  locationBias?: GeoCoordinates; // Bias autocomplete to trip area
}

const ACTIVITY_TYPES = [
  { value: 'activity', label: 'Activity', icon: '🎯' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'lodging', label: 'Lodging', icon: '🏨' },
  { value: 'travel', label: 'Travel', icon: '🚗' },
];

const TIME_SUGGESTIONS: Record<string, string> = {
  morning: '9:00 AM',
  afternoon: '1:00 PM',
  evening: '7:00 PM',
  unscheduled: '',
};

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  dayNumber,
  timePeriod = 'unscheduled',
  locationBias,
}) => {
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [time, setTime] = useState(TIME_SUGGESTIONS[timePeriod] || '');
  const [activityType, setActivityType] = useState<'activity' | 'food' | 'lodging' | 'travel'>('activity');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Location autocomplete state
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete search
  useEffect(() => {
    if (!locationName.trim() || selectedPlace) {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPredictions(true);
      try {
        const results = await placesService.getAutocomplete(locationName, {
          locationBias,
        });
        setPredictions(results);
        setShowPredictions(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setPredictions([]);
      } finally {
        setIsLoadingPredictions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationName, selectedPlace, locationBias]);

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(e.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setShowPredictions(false);
    setIsLoadingDetails(true);
    setLocationName(prediction.mainText);

    try {
      const details = await placesService.getDetails(prediction.placeId);
      setSelectedPlace(details);
    } catch (error) {
      console.error('Failed to get place details:', error);
      // Fall back to prediction info
      setSelectedPlace(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleClearSelectedPlace = () => {
    setSelectedPlace(null);
    setLocationName('');
    locationInputRef.current?.focus();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && locationName.trim() && !isSubmitting) {
      setIsSubmitting(true);

      try {
        let coordinates = { lat: 0, lng: 0 };
        let formattedAddress = locationName.trim();
        let placeId: string | undefined;

        // Use selected place data if available (preferred)
        if (selectedPlace) {
          coordinates = selectedPlace.coordinates;
          formattedAddress = selectedPlace.formattedAddress;
          placeId = selectedPlace.placeId;
        } else {
          // Fallback: try to geocode the location
          try {
            const geocodeResult = await placesService.geocode(locationName.trim());
            if (geocodeResult) {
              coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
              formattedAddress = geocodeResult.formattedAddress;
            }
          } catch (error) {
            console.warn('Geocoding failed:', error);
          }
        }

        const newActivity: Omit<Activity, 'id'> = {
          description: name.trim(),
          type: activityType,
          location: {
            name: selectedPlace?.name || locationName.trim(),
            address: formattedAddress,
            coordinates,
            placeId,
          },
          time: time || undefined,
          details: {
            notes: notes.trim() || undefined,
            website: selectedPlace?.website,
            phone: selectedPlace?.phoneNumber,
          },
        };

        onSubmit(newActivity);
        resetForm();
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setName('');
    setLocationName('');
    setTime(TIME_SUGGESTIONS[timePeriod] || '');
    setActivityType('activity');
    setNotes('');
    setSelectedPlace(null);
    setPredictions([]);
    setShowPredictions(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Add Activity</h2>
              <p className="text-xs text-slate-500">Day {dayNumber} • {timePeriod}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500" />
                Type
              </div>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setActivityType(type.value as typeof activityType)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    activityType === type.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Activity Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Visit Eiffel Tower, Lunch at Café..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              autoFocus
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                Location *
              </div>
            </label>

            {/* Selected place preview */}
            {selectedPlace ? (
              <div className="border-2 border-green-300 bg-green-50 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="font-bold text-green-800 truncate">{selectedPlace.name}</span>
                    </div>
                    <div className="flex items-start gap-1 text-sm text-green-700">
                      <Navigation className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{selectedPlace.formattedAddress}</span>
                    </div>
                    {selectedPlace.rating && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-green-600">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedPlace.rating}</span>
                        {selectedPlace.userRatingsTotal && (
                          <span className="text-green-500">({selectedPlace.userRatingsTotal.toLocaleString()} reviews)</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedPlace}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded-lg transition-colors"
                    title="Change location"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    value={locationName}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      setSelectedPlace(null);
                    }}
                    onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                    placeholder="e.g., Guinness Storehouse, Dublin"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pr-10"
                  />
                  {(isLoadingPredictions || isLoadingDetails) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>

                {/* Autocomplete dropdown */}
                {showPredictions && predictions.length > 0 && (
                  <div
                    ref={predictionsRef}
                    className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden"
                  >
                    {predictions.map((prediction) => (
                      <button
                        key={prediction.placeId}
                        type="button"
                        onClick={() => handleSelectPrediction(prediction)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="font-medium text-slate-800">{prediction.mainText}</div>
                        <div className="text-sm text-slate-500 truncate">{prediction.secondaryText}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hint text */}
            {!selectedPlace && locationName.length > 0 && !isLoadingPredictions && predictions.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No matching places found. Try a more specific search.
              </p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Time (optional)
              </div>
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g., 9:00 AM, 14:30..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !locationName.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-bold border-b-4 border-blue-700 disabled:border-slate-400 btn-press flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Activity'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
