# Technical Design Document: Country Overview Page

**Feature:** Country Overview View
**Author:** Principal Software Architect
**Date:** December 31, 2025
**Target Implementer:** Junior Engineer (Claude 3.5 Sonnet)

---

## 1. Executive Summary

Create a new "Country Overview" page view that displays a high-level summary of the trip organized by country and city, showing how many days are spent in each location. This view sits hierarchically above the existing "Overview" page (now referred to as "City Overview") and provides a bird's-eye view of the entire trip geography.

### Architectural Decision Notes
- **Naming Convention:** The existing `TripOverview.tsx` will remain unchanged. The new view is `CountryOverview.tsx` to maintain clear separation.
- **View Mode ID:** Using `'country'` as the view mode identifier for brevity and consistency with existing patterns.
- **Data Aggregation:** Computed client-side from existing trip data—no new database tables required.

---

## 2. File Structure

```
src/
├── components/
│   ├── modals/
│   │   └── CountryOverview.tsx          # NEW: Main country overview component
│   └── layout/
│       ├── Sidebar.tsx                   # MODIFIED: Add nav item
│       └── BottomNav.tsx                 # MODIFIED: Add nav item (optional)
├── stores/
│   └── uiStore.ts                        # MODIFIED: Add 'country' to ExtendedViewMode
├── types/
│   └── country.ts                        # NEW: Country/city aggregation types
│   └── index.ts                          # MODIFIED: Export new types
├── utils/
│   └── countryAggregation.ts             # NEW: Aggregation logic utilities
└── App.tsx                               # MODIFIED: Add case for 'country' view
```

---

## 3. Data Models & Types

### New Type Definitions (`src/types/country.ts`)

```typescript
/**
 * Represents aggregated data for a single city within the trip
 */
export interface CityAggregate {
  /** City name (e.g., "Dublin", "Cork") */
  name: string;

  /** ISO 3166-1 alpha-2 country code (e.g., "IE", "US") */
  countryCode: string;

  /** Full country name (e.g., "Ireland", "United States") */
  countryName: string;

  /** Number of days spent in this city */
  dayCount: number;

  /** Array of day IDs that include this city */
  dayIds: string[];

  /** Representative coordinates for map centering (first activity's coords) */
  coordinates: GeoCoordinates | null;

  /** Total number of activities in this city */
  activityCount: number;

  /** Date range: first day in this city (ISO format) */
  firstDate: string;

  /** Date range: last day in this city (ISO format) */
  lastDate: string;

  /** Ordered list of day numbers (1-indexed) spent here */
  dayNumbers: number[];
}

/**
 * Represents aggregated data for a country
 */
export interface CountryAggregate {
  /** Full country name */
  name: string;

  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;

  /** Flag emoji for display (e.g., "🇮🇪") */
  flagEmoji: string;

  /** Total days spent in this country */
  totalDays: number;

  /** Cities visited within this country */
  cities: CityAggregate[];

  /** Bounding box for map view [sw.lat, sw.lng, ne.lat, ne.lng] */
  boundingBox: [number, number, number, number] | null;

  /** Entry date to this country */
  entryDate: string;

  /** Exit date from this country */
  exitDate: string;
}

/**
 * Complete aggregation result for the trip
 */
export interface TripCountryAggregation {
  /** Countries in order of first visit */
  countries: CountryAggregate[];

  /** Total unique countries visited */
  countryCount: number;

  /** Total unique cities visited */
  cityCount: number;

  /** Trip duration in days */
  totalDays: number;
}

/**
 * Props for the CountryOverview component
 */
export interface CountryOverviewProps {
  /** Full trip data */
  trip: Trip;

  /** All days in the itinerary */
  days: DayItinerary[];

  /** Callback when user clicks a city to drill down */
  onCitySelect: (cityName: string, dayIds: string[]) => void;

  /** Callback when user hovers over a city (for map highlight) */
  onCityHover: (cityName: string | null) => void;

  /** Callback when user clicks a country card */
  onCountrySelect: (countryCode: string) => void;
}
```

### Update to `src/types/index.ts`

```typescript
// Add to existing exports
export * from './country';
```

---

## 4. Core Logic & Utilities

### Aggregation Utility (`src/utils/countryAggregation.ts`)

```typescript
import { DayItinerary, Trip, GeoCoordinates } from '@/types';
import {
  CityAggregate,
  CountryAggregate,
  TripCountryAggregation
} from '@/types/country';

/**
 * Country code to flag emoji mapping
 * Uses regional indicator symbols: 🇦 = U+1F1E6, etc.
 */
export function countryCodeToFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Extract city name from activity location
 *
 * LOGIC:
 * 1. If location has explicit city field, use it
 * 2. Parse from address string (component after first comma typically)
 * 3. Fall back to location name
 * 4. Default to "Unknown City"
 */
export function extractCityFromLocation(location: LocationData): string {
  // Priority 1: Explicit city field (if we add it later)
  // Priority 2: Parse from address
  if (location.address) {
    const parts = location.address.split(',').map(p => p.trim());
    // Typical format: "123 Street, City, State/Country"
    if (parts.length >= 2) {
      // Return second-to-last part (usually city)
      return parts[parts.length - 2] || parts[1] || location.name;
    }
  }

  // Priority 3: Use location name (often contains city)
  if (location.name) {
    return location.name;
  }

  return 'Unknown Location';
}

/**
 * Determine country from trip destination or activity locations
 *
 * LOGIC:
 * 1. Use trip.destination.country if available
 * 2. Try to parse from activity addresses
 * 3. Default to "Unknown"
 */
export function extractCountryInfo(
  trip: Trip,
  location?: LocationData
): { name: string; code: string } {
  // Use trip destination as default
  if (trip.destination?.country) {
    return {
      name: trip.destination.country,
      code: trip.destination.countryCode || 'XX'
    };
  }

  return { name: 'Unknown', code: 'XX' };
}

/**
 * Main aggregation function
 *
 * ALGORITHM:
 * 1. Iterate through all days and activities
 * 2. Group activities by city (normalized name)
 * 3. Track which days include each city
 * 4. Group cities by country
 * 5. Calculate statistics and bounding boxes
 * 6. Sort countries by first visit date
 */
export function aggregateTripByCountry(
  trip: Trip,
  days: DayItinerary[]
): TripCountryAggregation {
  // Map: cityKey -> CityAggregate (mutable during building)
  const cityMap = new Map<string, {
    name: string;
    countryCode: string;
    countryName: string;
    dayIds: Set<string>;
    dayNumbers: Set<number>;
    coordinates: GeoCoordinates | null;
    activityCount: number;
    firstDate: string;
    lastDate: string;
  }>();

  // Process each day
  for (const day of days) {
    // Determine primary city for this day
    // RULE: Use the city from the first activity with coordinates
    let dayCity: string | null = null;
    let dayCoords: GeoCoordinates | null = null;

    for (const activity of day.activities) {
      if (!activity.location) continue;

      const cityName = extractCityFromLocation(activity.location);
      const normalizedCity = cityName.toLowerCase().trim();

      // Track first valid city for the day
      if (!dayCity) {
        dayCity = cityName;
        dayCoords = activity.location.coordinates || null;
      }

      // Create or update city aggregate
      const cityKey = normalizedCity;
      const countryInfo = extractCountryInfo(trip, activity.location);

      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, {
          name: cityName, // Preserve original casing from first occurrence
          countryCode: countryInfo.code,
          countryName: countryInfo.name,
          dayIds: new Set(),
          dayNumbers: new Set(),
          coordinates: dayCoords,
          activityCount: 0,
          firstDate: day.date,
          lastDate: day.date
        });
      }

      const cityData = cityMap.get(cityKey)!;
      cityData.dayIds.add(day.id);
      cityData.dayNumbers.add(day.dayNumber);
      cityData.activityCount++;

      // Update date range
      if (day.date < cityData.firstDate) cityData.firstDate = day.date;
      if (day.date > cityData.lastDate) cityData.lastDate = day.date;

      // Update coordinates if we didn't have any
      if (!cityData.coordinates && activity.location.coordinates) {
        cityData.coordinates = activity.location.coordinates;
      }
    }
  }

  // Convert to CityAggregate array
  const cities: CityAggregate[] = Array.from(cityMap.values()).map(data => ({
    name: data.name,
    countryCode: data.countryCode,
    countryName: data.countryName,
    dayCount: data.dayIds.size,
    dayIds: Array.from(data.dayIds),
    coordinates: data.coordinates,
    activityCount: data.activityCount,
    firstDate: data.firstDate,
    lastDate: data.lastDate,
    dayNumbers: Array.from(data.dayNumbers).sort((a, b) => a - b)
  }));

  // Group cities by country
  const countryMap = new Map<string, CountryAggregate>();

  for (const city of cities) {
    const countryKey = city.countryCode;

    if (!countryMap.has(countryKey)) {
      countryMap.set(countryKey, {
        name: city.countryName,
        countryCode: city.countryCode,
        flagEmoji: countryCodeToFlag(city.countryCode),
        totalDays: 0,
        cities: [],
        boundingBox: null,
        entryDate: city.firstDate,
        exitDate: city.lastDate
      });
    }

    const country = countryMap.get(countryKey)!;
    country.cities.push(city);
    country.totalDays += city.dayCount;

    // Update country date range
    if (city.firstDate < country.entryDate) country.entryDate = city.firstDate;
    if (city.lastDate > country.exitDate) country.exitDate = city.lastDate;
  }

  // Calculate bounding boxes and sort cities within countries
  for (const country of countryMap.values()) {
    // Sort cities by first visit
    country.cities.sort((a, b) => a.firstDate.localeCompare(b.firstDate));

    // Calculate bounding box from city coordinates
    const coords = country.cities
      .filter(c => c.coordinates)
      .map(c => c.coordinates!);

    if (coords.length > 0) {
      const lats = coords.map(c => c.lat);
      const lngs = coords.map(c => c.lng);
      country.boundingBox = [
        Math.min(...lats),
        Math.min(...lngs),
        Math.max(...lats),
        Math.max(...lngs)
      ];
    }
  }

  // Convert to array and sort by entry date
  const countries = Array.from(countryMap.values())
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  return {
    countries,
    countryCount: countries.length,
    cityCount: cities.length,
    totalDays: days.length
  };
}

/**
 * Format day numbers as readable range
 * e.g., [1, 2, 3, 5, 7, 8] -> "Days 1-3, 5, 7-8"
 */
export function formatDayRange(dayNumbers: number[]): string {
  if (dayNumbers.length === 0) return '';
  if (dayNumbers.length === 1) return `Day ${dayNumbers[0]}`;

  const sorted = [...dayNumbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(`${rangeStart}`);
      } else if (rangeEnd === rangeStart + 1) {
        ranges.push(`${rangeStart}, ${rangeEnd}`);
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      if (i < sorted.length) {
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
  }

  return `Day${ranges.length > 1 || ranges[0].includes('-') || ranges[0].includes(',') ? 's' : ''} ${ranges.join(', ')}`;
}
```

---

## 5. Component Implementation

### Main Component (`src/components/modals/CountryOverview.tsx`)

```typescript
import React, { useMemo } from 'react';
import { Globe, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { Trip, DayItinerary } from '@/types';
import {
  CountryOverviewProps,
  CountryAggregate,
  CityAggregate
} from '@/types/country';
import {
  aggregateTripByCountry,
  formatDayRange
} from '@/utils/countryAggregation';

/**
 * CountryOverview Component
 *
 * Displays a high-level view of the trip organized by country and city,
 * showing day counts and allowing drill-down to city details.
 */
const CountryOverview: React.FC<CountryOverviewProps> = ({
  trip,
  days,
  onCitySelect,
  onCityHover,
  onCountrySelect
}) => {
  // Memoize aggregation - only recalculate when trip data changes
  const aggregation = useMemo(
    () => aggregateTripByCountry(trip, days),
    [trip, days]
  );

  // Handle empty state
  if (days.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50/50">
        <div className="text-center p-8">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">
            No Itinerary Yet
          </h3>
          <p className="text-sm text-slate-500">
            Add activities to see your trip overview by country.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50/50 p-6">
      {/* Header Stats */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-700 mb-4">
          Trip Overview
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            value={aggregation.countryCount}
            label={aggregation.countryCount === 1 ? 'Country' : 'Countries'}
            icon={<Globe className="w-5 h-5" />}
          />
          <StatCard
            value={aggregation.cityCount}
            label={aggregation.cityCount === 1 ? 'City' : 'Cities'}
            icon={<MapPin className="w-5 h-5" />}
          />
          <StatCard
            value={aggregation.totalDays}
            label={aggregation.totalDays === 1 ? 'Day' : 'Days'}
            icon={<Calendar className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Country Cards */}
      <div className="space-y-6">
        {aggregation.countries.map((country) => (
          <CountryCard
            key={country.countryCode}
            country={country}
            onCitySelect={onCitySelect}
            onCityHover={onCityHover}
            onCountrySelect={onCountrySelect}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Statistics card component
 */
interface StatCardProps {
  value: number;
  label: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, icon }) => (
  <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center">
    <div className="text-3xl font-extrabold text-blue-500 mb-1">
      {value}
    </div>
    <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
      {icon}
      {label}
    </div>
  </div>
);

/**
 * Country card with expandable city list
 */
interface CountryCardProps {
  country: CountryAggregate;
  onCitySelect: (cityName: string, dayIds: string[]) => void;
  onCityHover: (cityName: string | null) => void;
  onCountrySelect: (countryCode: string) => void;
}

const CountryCard: React.FC<CountryCardProps> = ({
  country,
  onCitySelect,
  onCityHover,
  onCountrySelect
}) => {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Country Header */}
      <button
        onClick={() => onCountrySelect(country.countryCode)}
        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="text-4xl">{country.flagEmoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-extrabold text-slate-700 truncate">
            {country.name}
          </h3>
          <p className="text-sm text-slate-500">
            {country.totalDays} {country.totalDays === 1 ? 'day' : 'days'} • {country.cities.length} {country.cities.length === 1 ? 'city' : 'cities'}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>

      {/* City List */}
      <div className="border-t-2 border-slate-100">
        {country.cities.map((city, index) => (
          <CityRow
            key={`${city.name}-${index}`}
            city={city}
            isLast={index === country.cities.length - 1}
            onSelect={() => onCitySelect(city.name, city.dayIds)}
            onHover={(hovering) => onCityHover(hovering ? city.name : null)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual city row within a country card
 */
interface CityRowProps {
  city: CityAggregate;
  isLast: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

const CityRow: React.FC<CityRowProps> = ({ city, isLast, onSelect, onHover }) => {
  const dayRangeText = formatDayRange(city.dayNumbers);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`
        w-full px-4 py-3 flex items-center gap-3
        hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400
        transition-all text-left
        ${!isLast ? 'border-b border-slate-100' : ''}
      `}
    >
      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-700 truncate">{city.name}</div>
        <div className="text-xs text-slate-500">{dayRangeText}</div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold">
          {city.dayCount} {city.dayCount === 1 ? 'day' : 'days'}
        </span>
        <span className="text-slate-400">
          {city.activityCount} {city.activityCount === 1 ? 'activity' : 'activities'}
        </span>
      </div>
    </button>
  );
};

export default CountryOverview;
```

---

## 6. API Contracts & Integration Points

### Store Updates (`src/stores/uiStore.ts`)

```typescript
// UPDATE: Add 'country' to the type union
export type ExtendedViewMode =
  | 'today'
  | 'day'
  | 'overview'
  | 'country'    // NEW
  | 'travel'
  | 'trips'
  | 'budget'
  | 'packing'
  | 'photos';
```

### App.tsx Integration

```typescript
// ADD: Import at top
const CountryOverview = lazy(() =>
  import('@/components/modals/CountryOverview')
);

// ADD: Handler function
const handleCitySelect = (cityName: string, dayIds: string[]) => {
  // Switch to day view and select first day of the city
  if (dayIds.length > 0) {
    setActiveDayId(dayIds[0]);
    setViewMode('day');
  }
};

const handleCityHover = (cityName: string | null) => {
  // Could add city hover state to uiStore if map highlighting needed
  console.log('City hover:', cityName);
};

const handleCountrySelect = (countryCode: string) => {
  // Future: Could filter or zoom map to country
  console.log('Country selected:', countryCode);
};

// ADD: In renderView() switch statement
case 'country':
  return (
    <Suspense fallback={<LoadingSpinner message="Loading overview..." />}>
      <ErrorBoundary>
        <CountryOverview
          trip={activeTrip}
          days={activeTrip.itinerary.days}
          onCitySelect={handleCitySelect}
          onCityHover={handleCityHover}
          onCountrySelect={handleCountrySelect}
        />
      </ErrorBoundary>
    </Suspense>
  );
```

### Navigation Updates

**Sidebar.tsx:**
```typescript
const NAV_ITEMS: NavItem[] = [
  { id: 'country', icon: Globe, label: 'Country' },  // NEW - First position
  { id: 'overview', icon: MapIcon, label: 'Overview' },
  { id: 'day', icon: Calendar, label: 'Day Plan' },
  { id: 'travel', icon: Navigation, label: 'Travel' },
];
```

**BottomNav.tsx (if adding to mobile):**
```typescript
// Option: Replace or reorder items for mobile
// Consider keeping 4 items max for mobile UX
```

---

## 7. Edge Cases & Error Handling

### Edge Case 1: Activities Without Location Data

**Problem:** Activities may have `null` or empty location objects.

**Solution:**
```typescript
// In aggregateTripByCountry():
for (const activity of day.activities) {
  if (!activity.location) continue;  // Skip activities without location
  if (!activity.location.name && !activity.location.address) continue;
  // ... rest of processing
}
```

**Fallback Display:** Days with no locatable activities show as "Unspecified Location" grouped under the trip's primary destination country.

### Edge Case 2: Multi-City Days

**Problem:** A single day may have activities in multiple cities (e.g., travel day from Dublin to Cork).

**Solution:** Count the day for EACH city where activities occur. The `dayCount` sums may exceed `totalDays` and this is expected.

**Display Note:** Add tooltip or info text: "Some days include multiple cities"

### Edge Case 3: Missing Country Information

**Problem:** Trip may not have `destination.countryCode` populated, especially for imported itineraries.

**Solution:**
```typescript
// In extractCountryInfo():
function extractCountryInfo(trip: Trip, location?: LocationData) {
  // 1. Use trip destination if available
  if (trip.destination?.country) {
    return {
      name: trip.destination.country,
      code: trip.destination.countryCode || inferCountryCode(trip.destination.country)
    };
  }

  // 2. Try to parse from location address (last component often country)
  if (location?.address) {
    const parts = location.address.split(',');
    const lastPart = parts[parts.length - 1]?.trim();
    if (lastPart && lastPart.length > 2) {
      return { name: lastPart, code: inferCountryCode(lastPart) };
    }
  }

  // 3. Default fallback
  return { name: 'Unknown', code: 'XX' };
}

// Helper to infer code from name
function inferCountryCode(countryName: string): string {
  const COUNTRY_MAP: Record<string, string> = {
    'ireland': 'IE',
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'france': 'FR',
    'germany': 'DE',
    'spain': 'ES',
    'italy': 'IT',
    'japan': 'JP',
    // Add more as needed
  };
  return COUNTRY_MAP[countryName.toLowerCase()] || 'XX';
}
```

### Edge Case 4: Zero-Day/Zero-Activity State

**Problem:** New trip with no itinerary data.

**Solution:** Display empty state UI (already handled in component):
```typescript
if (days.length === 0) {
  return <EmptyStateUI />;
}
```

### Edge Case 5: City Name Normalization

**Problem:** Same city with different spellings ("New York", "New York City", "NYC").

**Solution:** Normalize for grouping but display original:
```typescript
const normalizedCity = cityName
  .toLowerCase()
  .trim()
  .replace(/\s+/g, ' ')           // Collapse whitespace
  .replace(/city$/i, '')          // Remove trailing "city"
  .replace(/^st\.?\s/i, 'saint ') // Normalize "St." to "Saint"
  .trim();
```

---

## 8. Implementation Steps (Ordered)

### Phase 1: Foundation (Steps 1-3)

1. **Create type definitions**
   - Create file: `src/types/country.ts`
   - Add interfaces: `CityAggregate`, `CountryAggregate`, `TripCountryAggregation`, `CountryOverviewProps`
   - Update `src/types/index.ts` to export new types

2. **Create utility functions**
   - Create file: `src/utils/countryAggregation.ts`
   - Implement: `countryCodeToFlag()`
   - Implement: `extractCityFromLocation()`
   - Implement: `extractCountryInfo()`
   - Implement: `aggregateTripByCountry()` (core algorithm)
   - Implement: `formatDayRange()`

3. **Update UI store**
   - Edit: `src/stores/uiStore.ts`
   - Add `'country'` to `ExtendedViewMode` type union

### Phase 2: Component (Steps 4-5)

4. **Create CountryOverview component**
   - Create file: `src/components/modals/CountryOverview.tsx`
   - Implement: `StatCard` sub-component
   - Implement: `CountryCard` sub-component
   - Implement: `CityRow` sub-component
   - Implement: Main `CountryOverview` component
   - Add empty state handling

5. **Integrate into App.tsx**
   - Add lazy import for `CountryOverview`
   - Add handler functions: `handleCitySelect`, `handleCityHover`, `handleCountrySelect`
   - Add case `'country'` to `renderView()` switch statement

### Phase 3: Navigation (Steps 6-7)

6. **Update Sidebar navigation**
   - Edit: `src/components/layout/Sidebar.tsx`
   - Import `Globe` icon from `lucide-react`
   - Add nav item: `{ id: 'country', icon: Globe, label: 'Country' }`
   - Position as first item in array

7. **Update BottomNav (optional)**
   - Edit: `src/components/layout/BottomNav.tsx`
   - Decide whether to add to mobile navigation
   - If yes: May need to restructure to accommodate 5 items or replace one

### Phase 4: Testing & Polish (Steps 8-10)

8. **Test with sample data**
   - Load existing trip from app
   - Verify aggregation calculations are correct
   - Test city click → day view navigation
   - Test hover states

9. **Handle edge cases**
   - Test with trip that has no activities
   - Test with activities missing locations
   - Test with multi-city days
   - Test with unknown country codes

10. **Style refinements**
    - Verify responsive behavior (mobile vs desktop)
    - Ensure consistent styling with existing views
    - Add transitions and hover effects
    - Test dark mode compatibility (if applicable)

---

## 9. Testing Checklist

### Unit Tests (utils)
- [ ] `countryCodeToFlag('IE')` returns '🇮🇪'
- [ ] `countryCodeToFlag('XX')` returns '🌍' (fallback)
- [ ] `formatDayRange([1, 2, 3])` returns 'Days 1-3'
- [ ] `formatDayRange([1, 3, 5])` returns 'Days 1, 3, 5'
- [ ] `formatDayRange([1])` returns 'Day 1'
- [ ] `aggregateTripByCountry` returns correct counts

### Integration Tests (component)
- [ ] Renders without crashing with valid trip data
- [ ] Shows empty state when days array is empty
- [ ] Clicking city triggers `onCitySelect` with correct dayIds
- [ ] Hovering city triggers `onCityHover`
- [ ] Country cards expand/collapse properly
- [ ] Statistics match actual trip data

### E2E Tests (navigation)
- [ ] Clicking 'Country' nav item shows CountryOverview
- [ ] View mode persists in localStorage
- [ ] City click navigates to day view correctly

---

## 10. Dependencies

### No New Dependencies Required

All functionality implemented using existing packages:
- **React 19** - Component framework
- **lucide-react** - Icons (`Globe`, `MapPin`, `Calendar`, `ChevronRight`)
- **Tailwind CSS** - Styling
- **Zustand** - State management (existing store pattern)

### Icon Import
```typescript
import { Globe, MapPin, Calendar, ChevronRight } from 'lucide-react';
```

---

## 11. Future Enhancements (Out of Scope)

These are NOT part of this implementation but noted for future consideration:

1. **Map Integration:** Highlight country/city boundaries on map when hovered
2. **Country Filtering:** Filter day view to show only selected country's activities
3. **Travel Legs Between Countries:** Show international travel segments
4. **Multi-Country Trips:** Timeline visualization for country transitions
5. **Offline Country Data:** Cache country metadata for offline use

---

## 12. Acceptance Criteria

The feature is complete when:

1. ✅ User can click "Country" in sidebar to see Country Overview
2. ✅ View shows correct count of countries, cities, and days
3. ✅ Each country displays with flag emoji and city breakdown
4. ✅ Clicking a city navigates to Day Plan view filtered to that city's days
5. ✅ Empty state displays when trip has no itinerary
6. ✅ View mode persists across page refreshes
7. ✅ Component renders without console errors
8. ✅ Styling matches existing app design language

---

*End of Technical Design Document*
