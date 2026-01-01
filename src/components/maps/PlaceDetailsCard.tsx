import type { PlaceDetails } from '@/types/maps';

interface PlaceDetailsCardProps {
  details: PlaceDetails;
  onClose?: () => void;
  onAddToItinerary?: (details: PlaceDetails) => void;
  className?: string;
}

/**
 * Display card for Place Details
 * Shows rich information about a place including ratings, hours, contact info
 */
export function PlaceDetailsCard({
  details,
  onClose,
  onAddToItinerary,
  className = '',
}: PlaceDetailsCardProps) {
  const {
    name,
    formattedAddress,
    rating,
    userRatingsTotal,
    priceLevel,
    phoneNumber,
    website,
    openingHours,
    types,
    iconUrl,
  } = details;

  // Format price level as dollar signs
  const formatPriceLevel = (level?: number) => {
    if (level === undefined || level === null) return null;
    return '$'.repeat(level);
  };

  // Format opening hours for current day
  const getCurrentDayHours = () => {
    if (!openingHours?.weekdayText) return null;
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1; // Convert Sunday=0 to Monday=0
    return openingHours.weekdayText[dayIndex];
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header with Icon and Close Button */}
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        {iconUrl && (
          <img
            src={iconUrl}
            alt=""
            className="absolute top-4 left-4 w-8 h-8 opacity-20"
          />
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <h2 className="text-xl font-bold pr-8">{name}</h2>

        {/* Rating and Price */}
        <div className="flex items-center gap-3 mt-2">
          {rating !== undefined && (
            <div className="flex items-center gap-1">
              <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium">{rating}</span>
              {userRatingsTotal !== undefined && (
                <span className="text-blue-100 text-sm">({userRatingsTotal.toLocaleString()})</span>
              )}
            </div>
          )}

          {priceLevel !== undefined && (
            <div className="text-blue-100 font-medium">
              {formatPriceLevel(priceLevel)}
            </div>
          )}
        </div>
      </div>

      {/* Details Content */}
      <div className="p-4 space-y-4">
        {/* Address */}
        {formattedAddress && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-700 text-sm">{formattedAddress}</p>
          </div>
        )}

        {/* Opening Hours */}
        {openingHours && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <div className={`font-medium ${openingHours.isOpenNow ? 'text-green-600' : 'text-red-600'}`}>
                {openingHours.isOpenNow ? 'Open now' : 'Closed'}
              </div>
              {getCurrentDayHours() && (
                <div className="text-gray-600 mt-1">{getCurrentDayHours()}</div>
              )}
            </div>
          </div>
        )}

        {/* Phone Number */}
        {phoneNumber && (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a href={`tel:${phoneNumber}`} className="text-blue-600 hover:text-blue-700 text-sm">
              {phoneNumber}
            </a>
          </div>
        )}

        {/* Website */}
        {website && (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm truncate"
            >
              Visit website
            </a>
          </div>
        )}

        {/* Place Types */}
        {types && types.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {types.slice(0, 5).map((type) => (
              <span
                key={type}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
              >
                {type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add to Itinerary Button */}
      {onAddToItinerary && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => onAddToItinerary(details)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add to Itinerary
          </button>
        </div>
      )}
    </div>
  );
}
