import React, { useMemo, useState } from 'react';
import { Globe, MapPin, Calendar, ChevronRight, ChevronDown, Plane, Coffee, Camera, Bed } from 'lucide-react';
import {
  CountryOverviewProps,
  CountryAggregate,
  DaySummary
} from '@/types/country';
import {
  aggregateTripByCountry,
  formatShortDate
} from '@/utils/countryAggregation';

/**
 * CountryOverview Component
 *
 * Displays a high-level view of the trip organized by country,
 * with day-by-day breakdown showing where you are each day.
 */
const CountryOverview: React.FC<CountryOverviewProps> = ({
  trip,
  days,
  onDaySelect,
  onDayHover,
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
    <div className="h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-indigo-50/50 to-slate-50/30">
      {/* View Theme Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 mb-6">
        <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
          <Globe className="w-4 h-4" />
          Country Overview
        </div>
        <h2 className="text-xl font-extrabold text-white">
          {trip.title}
        </h2>
        <p className="text-sm text-white/70 mt-1">
          {formatShortDate(trip.startDate)} - {formatShortDate(trip.endDate)} • {aggregation.totalDays}-day adventure
        </p>
      </div>

      <div className="px-6">
      {/* Trip Progress Bar */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const allDays = aggregation.countries.flatMap(c => c.days);
        const totalDays = allDays.length;
        const completedDays = allDays.filter(d => d.date < today).length;
        const currentDayIndex = allDays.findIndex(d => d.date === today);
        const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
        const isOnTrip = currentDayIndex >= 0;
        const isTripComplete = completedDays === totalDays && totalDays > 0;
        const isTripUpcoming = completedDays === 0 && !isOnTrip;

        return (
          <div className="mb-6 bg-white border-2 border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trip Progress</span>
              <span className="text-xs font-bold text-slate-600">
                {isTripComplete ? 'Completed!' : isTripUpcoming ? 'Upcoming' : `Day ${currentDayIndex + 1} of ${totalDays}`}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTripComplete ? 'bg-emerald-500' : isOnTrip ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                style={{ width: `${isOnTrip ? ((currentDayIndex + 1) / totalDays) * 100 : progressPercent}%` }}
              />
            </div>
            {isOnTrip && (
              <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 font-bold">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Currently on trip
              </div>
            )}
          </div>
        );
      })()}

      {/* Stats Cards */}
      <div className="mb-6">
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
      <div className="space-y-6 pb-6">
        {aggregation.countries.map((country) => (
          <CountryCard
            key={country.countryCode}
            country={country}
            onDaySelect={onDaySelect}
            onDayHover={onDayHover}
            onCountrySelect={onCountrySelect}
          />
        ))}
      </div>
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
 * Country color palette for visual differentiation
 */
const COUNTRY_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  IE: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', accent: 'text-emerald-600' },
  GB: { bg: 'bg-blue-50', border: 'border-l-blue-500', accent: 'text-blue-600' },
  FR: { bg: 'bg-indigo-50', border: 'border-l-indigo-500', accent: 'text-indigo-600' },
  DE: { bg: 'bg-amber-50', border: 'border-l-amber-500', accent: 'text-amber-600' },
  ES: { bg: 'bg-red-50', border: 'border-l-red-500', accent: 'text-red-600' },
  IT: { bg: 'bg-green-50', border: 'border-l-green-500', accent: 'text-green-600' },
  PT: { bg: 'bg-teal-50', border: 'border-l-teal-500', accent: 'text-teal-600' },
  NL: { bg: 'bg-orange-50', border: 'border-l-orange-500', accent: 'text-orange-600' },
  US: { bg: 'bg-sky-50', border: 'border-l-sky-500', accent: 'text-sky-600' },
  JP: { bg: 'bg-rose-50', border: 'border-l-rose-500', accent: 'text-rose-600' },
  AU: { bg: 'bg-yellow-50', border: 'border-l-yellow-500', accent: 'text-yellow-600' },
  CA: { bg: 'bg-red-50', border: 'border-l-red-500', accent: 'text-red-600' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-50', border: 'border-l-slate-400', accent: 'text-slate-600' };

function getCountryColors(countryCode: string) {
  return COUNTRY_COLORS[countryCode] || DEFAULT_COLORS;
}

/**
 * Country card with day-by-day breakdown
 */
interface CountryCardProps {
  country: CountryAggregate;
  onDaySelect: (dayId: string) => void;
  onDayHover: (dayId: string | null) => void;
  onCountrySelect: (countryCode: string) => void;
}

const CountryCard: React.FC<CountryCardProps> = ({
  country,
  onDaySelect,
  onDayHover,
  onCountrySelect
}) => {
  const colors = getCountryColors(country.countryCode);
  const today = new Date().toISOString().split('T')[0];

  // Default to collapsed for countries with 5+ days
  const [isExpanded, setIsExpanded] = useState(country.totalDays < 5);

  // Determine how many days to show when collapsed
  const collapsedDayCount = 3;
  const hasMoreDays = country.totalDays > collapsedDayCount;
  const displayedDays = isExpanded ? country.days : country.days.slice(0, collapsedDayCount);

  return (
    <div className={`bg-white border-2 border-slate-200 border-l-4 ${colors.border} rounded-2xl overflow-hidden shadow-sm`}>
      {/* Country Header */}
      <button
        onClick={() => onCountrySelect(country.countryCode)}
        className={`w-full p-4 flex items-center gap-4 ${colors.bg} hover:brightness-95 transition-all text-left`}
      >
        <span className="text-4xl drop-shadow-sm">{country.flagEmoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-extrabold text-slate-700 truncate">
            {country.name}
          </h3>
          <p className={`text-sm ${colors.accent} font-medium`}>
            {country.totalDays} {country.totalDays === 1 ? 'day' : 'days'} • {formatShortDate(country.entryDate)} - {formatShortDate(country.exitDate)}
          </p>
        </div>
        <ChevronRight className={`w-5 h-5 ${colors.accent}`} />
      </button>

      {/* Day List */}
      <div className="border-t-2 border-slate-100">
        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px]' : 'max-h-[500px]'} overflow-hidden`}>
          {displayedDays.map((day, index) => (
            <DayRow
              key={day.dayId}
              day={day}
              isLast={index === displayedDays.length - 1 && isExpanded}
              isToday={day.date === today}
              onSelect={() => onDaySelect(day.dayId)}
              onHover={(hovering) => onDayHover(hovering ? day.dayId : null)}
            />
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {hasMoreDays && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              isExpanded
                ? 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                : `${colors.bg} ${colors.accent} hover:brightness-95`
            }`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            {isExpanded ? 'Show Less' : `Show ${country.totalDays - collapsedDayCount} More Days`}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Get icon for activity type
 */
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'food': return <Coffee className="w-3 h-3" />;
    case 'lodging': return <Bed className="w-3 h-3" />;
    case 'travel': return <Plane className="w-3 h-3" />;
    default: return <Camera className="w-3 h-3" />;
  }
};

/**
 * Individual day row within a country card
 */
interface DayRowProps {
  day: DaySummary;
  isLast: boolean;
  isToday: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

const DayRow: React.FC<DayRowProps> = ({ day, isLast, isToday, onSelect, onHover }) => {
  const shortDate = formatShortDate(day.date);

  // Determine if this is a multi-city day
  const uniqueCities = day.locations.filter(loc => loc !== day.primaryCity);
  const isMultiCity = uniqueCities.length > 0 && day.isTravelDay;
  const journeyDisplay = isMultiCity
    ? `${day.primaryCity} → ${uniqueCities[uniqueCities.length - 1]}`
    : day.primaryCity;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`
        w-full px-4 py-3 flex flex-col gap-2
        hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-400
        transition-all text-left
        ${!isLast ? 'border-b border-slate-100' : ''}
        ${isToday ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}
      `}
    >
      {/* Day Header */}
      <div className="flex items-center gap-3">
        {day.isTravelDay ? (
          <Plane className="w-4 h-4 text-purple-500 flex-shrink-0" />
        ) : (
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">
              Day {day.dayNumber} - {journeyDisplay}
            </span>
            {isToday && (
              <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase">
                Today
              </span>
            )}
            {day.isTravelDay && !isToday && (
              <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase">
                {isMultiCity ? 'Journey' : 'Travel'}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {shortDate} • {day.activityCount} {day.activityCount === 1 ? 'activity' : 'activities'}
            {isMultiCity && day.locations.length > 2 && (
              <span className="text-slate-400"> • via {day.locations.length - 2} stop{day.locations.length > 3 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>

      {/* Activity Highlights */}
      {day.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-7">
          {day.highlights.map((highlight, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100"
            >
              <span className="text-slate-400">{getActivityIcon(highlight.type)}</span>
              <span className="truncate max-w-[100px]">{highlight.title}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

export default CountryOverview;
