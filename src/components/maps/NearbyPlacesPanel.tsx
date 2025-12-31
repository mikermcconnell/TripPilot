import React, { useState } from 'react';
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces';
import type { NearbyPlace, GeoCoordinates, NearbyCategory } from '@/types/maps';
import { NEARBY_CATEGORIES } from '@/types/maps';

interface NearbyPlacesPanelProps {
  location: GeoCoordinates;
  radius?: number;
  onPlaceClick?: (place: NearbyPlace) => void;
  className?: string;
}

/**
 * Nearby Places Panel with category tabs
 * Displays categorized places near a location with distance info
 */
export function NearbyPlacesPanel({
  location,
  radius = 2000,
  onPlaceClick,
  className = '',
}: NearbyPlacesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<NearbyCategory>(
    NEARBY_CATEGORIES[0]
  );
  const [openNow, setOpenNow] = useState(false);

  const { places, isLoading, error, search } = useNearbyPlaces({
    location,
    radius,
    type: selectedCategory.type,
    openNow,
    autoFetch: true,
  });

  // Handle category change
  const handleCategoryChange = (category: NearbyCategory) => {
    setSelectedCategory(category);
    search({ type: category.type, openNow });
  };

  // Handle open now filter toggle
  const handleOpenNowToggle = () => {
    const newOpenNow = !openNow;
    setOpenNow(newOpenNow);
    search({ openNow: newOpenNow });
  };

  // Format distance
  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Nearby Places</h3>

          {/* Open Now Filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openNow}
              onChange={handleOpenNowToggle}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Open now</span>
          </label>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {NEARBY_CATEGORIES.map((category) => (
            <button
              key={category.type}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory.type === category.type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && places.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
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
            <p className="text-gray-500 font-medium">No places found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try a different category or remove filters
            </p>
          </div>
        )}

        {/* Places List */}
        {!isLoading && places.length > 0 && (
          <div className="divide-y divide-gray-100">
            {places.map((place) => (
              <button
                key={place.placeId}
                onClick={() => onPlaceClick?.(place)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Place Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {place.name}
                    </h4>

                    {place.vicinity && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {place.vicinity}
                      </p>
                    )}

                    {/* Rating and Price */}
                    <div className="flex items-center gap-3 mt-2">
                      {place.rating !== undefined && (
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">
                            {place.rating}
                          </span>
                          {place.userRatingsTotal !== undefined && (
                            <span className="text-xs text-gray-400">
                              ({place.userRatingsTotal})
                            </span>
                          )}
                        </div>
                      )}

                      {place.priceLevel !== undefined && (
                        <span className="text-sm text-gray-600">
                          {'$'.repeat(place.priceLevel)}
                        </span>
                      )}

                      {place.isOpenNow !== undefined && (
                        <span
                          className={`text-xs font-medium ${
                            place.isOpenNow ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {place.isOpenNow ? 'Open' : 'Closed'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Distance Badge */}
                  {place.distanceMeters !== undefined && (
                    <div className="flex-shrink-0 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {formatDistance(place.distanceMeters)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Count Footer */}
      {!isLoading && places.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            {places.length} {places.length === 1 ? 'place' : 'places'} within{' '}
            {formatDistance(radius)}
          </p>
        </div>
      )}
    </div>
  );
}
