import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { placesService } from '@/services/maps/placesService';
import type { LocationData } from '@/types';

interface DayLocationEditorProps {
  location?: LocationData;
  onLocationChange: (location: LocationData) => void;
  placeholder?: string;
  className?: string;
}

export const DayLocationEditor: React.FC<DayLocationEditorProps> = ({
  location,
  onLocationChange,
  placeholder = 'Set city or location...',
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    predictions,
    isLoading,
    search,
    clear,
  } = usePlacesAutocomplete({
    types: ['(cities)'], // Only show cities for day-level location
  });

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      setInputValue(location?.name || '');
    }
  }, [isEditing, location?.name]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    search(value);
  };

  const handleSelectPrediction = async (prediction: typeof predictions[0]) => {
    setIsLoadingDetails(true);

    try {
      // Get full details including coordinates
      const details = await placesService.getDetails(prediction.placeId);

      const newLocation: LocationData = {
        name: prediction.mainText,
        address: details.formattedAddress,
        coordinates: details.coordinates,
        placeId: prediction.placeId,
      };

      onLocationChange(newLocation);
      setIsEditing(false);
      clear();
    } catch (error) {
      console.error('Failed to get place details:', error);
      // Fallback: use prediction data with geocoding
      try {
        const geocodeResult = await placesService.geocode(prediction.description);
        const newLocation: LocationData = {
          name: prediction.mainText,
          address: prediction.description,
          coordinates: geocodeResult || undefined,
          placeId: prediction.placeId,
        };
        onLocationChange(newLocation);
      } catch {
        // Last resort: just use the name
        onLocationChange({
          name: prediction.mainText,
          address: prediction.description,
        });
      }
      setIsEditing(false);
      clear();
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Display mode - show current location or placeholder
  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-slate-100 ${className}`}
      >
        <MapPin className={`w-4 h-4 ${location?.name ? 'text-blue-500' : 'text-slate-400'}`} />
        <span className={`text-sm font-medium ${location?.name ? 'text-slate-700' : 'text-slate-400 italic'}`}>
          {location?.name || placeholder}
        </span>
        <Search className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  // Edit mode - show autocomplete input
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-lg px-3 py-1.5 shadow-lg">
        {isLoadingDetails ? (
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 text-blue-500" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for a city..."
          className="flex-1 text-sm font-medium text-slate-700 outline-none bg-transparent min-w-[150px]"
          disabled={isLoadingDetails}
        />
        {isLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        <button
          onClick={handleCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-slate-700 text-sm truncate">
                  {prediction.mainText}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {prediction.secondaryText}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {inputValue.length >= 2 && !isLoading && predictions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 p-4">
          <p className="text-sm text-slate-500 text-center">
            No cities found for "{inputValue}"
          </p>
        </div>
      )}
    </div>
  );
};
