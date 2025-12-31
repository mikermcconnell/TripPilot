import React, { useState } from 'react';
import { DayItinerary, Trip } from '@/types';
import { MapPin, ChevronDown, Plane, Car, Utensils, Camera, CalendarDays, Hash, Clock, ExternalLink } from 'lucide-react';

interface TripOverviewProps {
  days: DayItinerary[];
  trip?: Trip;
  onDaySelect: (dayId: string) => void;
  onDayHover: (dayId: string | null) => void;
}

/**
 * Detect day type based on activity names/types
 */
function getDayType(activities: DayItinerary['activities']): 'travel' | 'sightseeing' | 'mixed' {
  const travelKeywords = ['airport', 'flight', 'train', 'bus', 'drive', 'transfer', 'check-in', 'check-out', 'checkout', 'checkin'];
  const sightseeingKeywords = ['museum', 'tour', 'visit', 'castle', 'park', 'beach', 'cathedral', 'temple', 'palace'];

  let travelCount = 0;
  let sightseeingCount = 0;

  activities.forEach(a => {
    const name = a.description.toLowerCase();
    if (travelKeywords.some(k => name.includes(k))) travelCount++;
    if (sightseeingKeywords.some(k => name.includes(k))) sightseeingCount++;
  });

  if (travelCount > sightseeingCount && travelCount > 0) return 'travel';
  if (sightseeingCount > travelCount && sightseeingCount > 0) return 'sightseeing';
  return 'mixed';
}

/**
 * Get activity type counts for icons
 */
function getActivityTypeCounts(activities: DayItinerary['activities']) {
  let dining = 0;
  let sightseeing = 0;
  let transport = 0;

  activities.forEach(a => {
    const name = a.description.toLowerCase();
    if (name.includes('lunch') || name.includes('dinner') || name.includes('breakfast') || name.includes('restaurant') || name.includes('cafe') || name.includes('eat')) {
      dining++;
    } else if (name.includes('airport') || name.includes('flight') || name.includes('train') || name.includes('bus') || name.includes('drive') || name.includes('transfer')) {
      transport++;
    } else {
      sightseeing++;
    }
  });

  return { dining, sightseeing, transport };
}

const TripOverview: React.FC<TripOverviewProps> = ({ days, trip, onDaySelect, onDayHover }) => {
  // Track which days are expanded
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDayExpanded = (dayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const totalActivities = days.reduce((acc, day) => acc + day.activities.length, 0);
  const locationsCount = days.reduce((acc, day) => {
    const dayLocs = day.activities.filter(a => a.location.coordinates?.lat !== 0).length;
    return acc + dayLocs;
  }, 0);

  // Activity type breakdown
  const activityBreakdown = days.reduce((acc, day) => {
    day.activities.forEach(a => {
      const name = a.description.toLowerCase();
      if (name.includes('lunch') || name.includes('dinner') || name.includes('breakfast') || name.includes('restaurant') || name.includes('cafe') || a.type === 'food') {
        acc.dining++;
      } else if (name.includes('airport') || name.includes('flight') || name.includes('train') || a.type === 'travel') {
        acc.transport++;
      } else {
        acc.sightseeing++;
      }
    });
    return acc;
  }, { dining: 0, sightseeing: 0, transport: 0 });

  // Determine today for past/current/future styling
  const today = new Date().toISOString().split('T')[0];

  // Handle empty state
  if (days.length === 0) {
    return (
      <div className="h-full bg-gradient-to-b from-blue-50/50 to-slate-50/30">
        {/* View Theme Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
          <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
            <CalendarDays className="w-4 h-4" />
            Trip Calendar
          </div>
          {trip && (
            <>
              <h2 className="text-xl font-extrabold text-white">{trip.title}</h2>
              <p className="text-sm text-white/70 mt-1">{trip.destination.name}</p>
            </>
          )}
        </div>

        <div className="flex items-center justify-center h-[calc(100%-120px)]">
          <div className="text-center p-8">
            <CalendarDays className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">
              No Days Planned Yet
            </h3>
            <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
              Start building your trip by chatting with TripPilot to add activities and plan your days.
            </p>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</span>
                <span>Tell TripPilot where you're going</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">2</span>
                <span>Ask for activity suggestions</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">3</span>
                <span>Watch your itinerary build!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-blue-50/50 to-slate-50/30">
      {/* View Theme Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
        <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
          <CalendarDays className="w-4 h-4" />
          Trip Calendar
        </div>
        {trip && (
          <>
            <h2 className="text-xl font-extrabold text-white">{trip.title}</h2>
            <p className="text-sm text-white/70 mt-1">{trip.destination.name}</p>
          </>
        )}
      </div>

      <div className="p-6">
      {/* Trip Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-black text-blue-500">{days.length}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Days</span>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-black text-indigo-500">{totalActivities}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Activities</span>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-black text-emerald-500">{locationsCount}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Locations</span>
        </div>
      </div>

      {/* Activity Type Breakdown */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Activity Breakdown</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-700">{activityBreakdown.sightseeing}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Explore</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Utensils className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-700">{activityBreakdown.dining}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Dining</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-700">{activityBreakdown.transport}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Transport</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-extrabold text-slate-700 mb-6 flex items-center gap-2 uppercase tracking-wider text-sm">
        <Hash className="w-5 h-5 text-slate-400" />
        Trip Schedule
      </h2>

      <div className="grid grid-cols-1 gap-4">
        {days.map((day) => {
          const firstActivity = day.activities[0];
          const dayType = getDayType(day.activities);
          const typeCounts = getActivityTypeCounts(day.activities);

          // Determine temporal state
          const isPast = day.date < today;
          const isToday = day.date === today;

          // Day type styles
          const dayTypeStyles = {
            travel: { badge: 'bg-purple-100 text-purple-600 border-purple-200', icon: Plane },
            sightseeing: { badge: 'bg-emerald-100 text-emerald-600 border-emerald-200', icon: Camera },
            mixed: { badge: 'bg-blue-100 text-blue-600 border-blue-200', icon: MapPin },
          };
          const typeStyle = dayTypeStyles[dayType];
          const TypeIcon = typeStyle.icon;

          // Temporal styling
          const temporalStyles = isPast
            ? 'opacity-60 bg-slate-50'
            : isToday
            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
            : 'bg-white';

          const dayBadgeStyles = isPast
            ? 'bg-slate-400 border-slate-500'
            : isToday
            ? 'bg-amber-500 border-amber-600'
            : 'bg-blue-500 border-blue-700';

          const isExpanded = expandedDays.has(day.id);

          return (
            <div
              key={day.id}
              onMouseEnter={() => onDayHover(day.id)}
              onMouseLeave={() => onDayHover(null)}
              className={`group border-2 border-slate-200 hover:border-blue-400 hover:ring-4 hover:ring-blue-50 rounded-2xl transition-all duration-200 relative overflow-hidden ${temporalStyles}`}
            >
              {/* Today Badge */}
              {isToday && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-wide z-20">
                  Today
                </div>
              )}

              {/* Day Header - Clickable to expand */}
              <div
                onClick={(e) => toggleDayExpanded(day.id, e)}
                className="p-5 cursor-pointer"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${dayBadgeStyles} border-b-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                      <span className="text-[10px] font-bold opacity-80 uppercase">Day</span>
                      <span className="text-2xl font-black leading-none">{day.dayNumber}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h3>
                      {/* First activity preview */}
                      <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm font-medium">
                         <span className="truncate max-w-[220px]">
                           {firstActivity ? firstActivity.description : "No activities yet"}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500'}`}>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={3} />
                  </div>
                </div>

                {/* Activity breakdown icons */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                  {/* Day type badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${typeStyle.badge}`}>
                    <TypeIcon className="w-3 h-3" />
                    {dayType === 'travel' ? 'Travel Day' : dayType === 'sightseeing' ? 'Explore' : 'Mixed'}
                  </div>

                  {/* Activity type counts */}
                  <div className="flex items-center gap-2 text-slate-400">
                    {typeCounts.sightseeing > 0 && (
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{typeCounts.sightseeing}</span>
                      </div>
                    )}
                    {typeCounts.dining > 0 && (
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Utensils className="w-3.5 h-3.5" />
                        <span>{typeCounts.dining}</span>
                      </div>
                    )}
                    {typeCounts.transport > 0 && (
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Car className="w-3.5 h-3.5" />
                        <span>{typeCounts.transport}</span>
                      </div>
                    )}
                  </div>

                  {/* Total activities */}
                  <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-wide">
                    {day.activities.length} {day.activities.length === 1 ? 'Stop' : 'Stops'}
                  </div>
                </div>
              </div>

              {/* Expandable Activity List */}
              {isExpanded && (
                <div className="border-t-2 border-slate-100 bg-slate-50/50">
                  <div className="p-4 space-y-2">
                    {day.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition-colors"
                      >
                        {activity.time && (
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-500 min-w-[60px]">
                            <Clock className="w-3 h-3" />
                            {activity.time}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-slate-700 truncate block">
                            {activity.description}
                          </span>
                          <span className="text-xs text-slate-400 truncate block">
                            {activity.location.name}
                          </span>
                        </div>
                      </div>
                    ))}

                    {day.activities.length === 0 && (
                      <div className="text-center py-4 text-sm text-slate-400">
                        No activities scheduled
                      </div>
                    )}
                  </div>

                  {/* View Full Day Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDaySelect(day.id);
                    }}
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border-t border-blue-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Day
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Spacer */}
      <div className="h-20"></div>
      </div>
    </div>
  );
};

export default TripOverview;