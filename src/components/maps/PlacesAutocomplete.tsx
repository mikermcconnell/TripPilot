import React, { useState, useRef, useEffect } from 'react';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import type { PlacePrediction, GeoCoordinates } from '@/types/maps';

interface PlacesAutocompleteProps {
  onPlaceSelect: (prediction: PlacePrediction) => void;
  locationBias?: GeoCoordinates;
  radius?: number;
  types?: string[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
}

/**
 * Places Autocomplete search input with dropdown
 * Provides real-time place suggestions as user types
 */
export function PlacesAutocomplete({
  onPlaceSelect,
  locationBias,
  radius,
  types,
  placeholder = 'Search for a place...',
  className = '',
  inputClassName = '',
  dropdownClassName = '',
}: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { predictions, isLoading, error, search, clear } = usePlacesAutocomplete({
    locationBias,
    radius,
    types,
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    search(value);
    setIsDropdownOpen(true);
  };

  // Handle prediction selection
  const handlePredictionClick = (prediction: PlacePrediction) => {
    setInputValue(prediction.description);
    setIsDropdownOpen(false);
    onPlaceSelect(prediction);
  };

  // Handle clear button
  const handleClear = () => {
    setInputValue('');
    clear();
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsDropdownOpen(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClassName}`}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          ) : inputValue ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : (
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Predictions Dropdown */}
      {isDropdownOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto ${dropdownClassName}`}
        >
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              onClick={() => handlePredictionClick(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                {/* Location Icon */}
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>

                {/* Prediction Text */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {prediction.mainText}
                  </div>
                  {prediction.secondaryText && (
                    <div className="text-sm text-gray-500 truncate">
                      {prediction.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isDropdownOpen && !isLoading && inputValue.length >= 3 && predictions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No places found
        </div>
      )}
    </div>
  );
}
