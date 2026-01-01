import React, { useMemo } from 'react';
import { DayItinerary, Activity } from '@/types';
import { MapPin, Footprints, Car, Train, Plane, Navigation, ThumbsUp, Lightbulb, CheckCircle2, AlertCircle, Clock, Ticket, Hash } from 'lucide-react';
import { getDistanceKm, getRecommendedMode, estimateTime } from '@/utils/geo';

/**
 * Convert km to miles
 */
function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Parse time string like "15 min" or "1h 30m" to minutes
 */
function parseTimeToMinutes(timeStr: string): number {
  const hourMatch = timeStr.match(/(\d+)\s*h/);
  const minMatch = timeStr.match(/(\d+)\s*m/);

  let minutes = 0;
  if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);

  // Handle "X min" format
  const minOnlyMatch = timeStr.match(/^(\d+)\s*min$/);
  if (minOnlyMatch) minutes = parseInt(minOnlyMatch[1], 10);

  return minutes;
}

/**
 * Format minutes to readable time
 */
function formatTotalTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Get extended mode including flights
 */
function getExtendedMode(distance: number): 'walking' | 'driving' | 'transit' | 'flight' {
  if (distance > 200) return 'flight';
  return getRecommendedMode(distance);
}

interface TravelViewProps {
  days: DayItinerary[];
  onDaySelect: (dayId: string) => void;
  onLegHover?: (leg: { startId: string; endId: string } | null) => void;
  onUpdateActivity?: (dayId: string, activityId: string, updates: Partial<Activity>) => void;
}

const TravelView: React.FC<TravelViewProps> = ({ days, onDaySelect, onLegHover, onUpdateActivity }) => {
  
  // Calculate total trip stats with mode breakdown
  const stats = useMemo(() => {
    let totalKm = 0;
    let legs = 0;
    let totalTravelMinutes = 0;

    // Mode breakdown
    const modeBreakdown = {
      walking: { count: 0, km: 0 },
      transit: { count: 0, km: 0 },
      driving: { count: 0, km: 0 },
      flight: { count: 0, km: 0 }
    };

    days.forEach(day => {
      for (let i = 0; i < day.activities.length - 1; i++) {
        const start = day.activities[i].location.coordinates;
        const end = day.activities[i + 1].location.coordinates;

        if (start && end && (start.lat !== 0 || start.lng !== 0) && (end.lat !== 0 || end.lng !== 0)) {
          const distance = getDistanceKm(start.lat, start.lng, end.lat, end.lng);
          totalKm += distance;
          legs++;

          // Calculate travel time using recommended mode
          const mode = getExtendedMode(distance);
          modeBreakdown[mode].count++;
          modeBreakdown[mode].km += distance;

          if (mode === 'flight') {
            totalTravelMinutes += distance / 800 * 60 + 90; // ~800km/h + 1.5h airport time
          } else {
            const timeStr = estimateTime(distance, mode === 'walking' ? 'walking' : mode === 'driving' ? 'driving' : 'transit');
            totalTravelMinutes += parseTimeToMinutes(timeStr);
          }
        }
      }
    });

    return {
      totalKm: totalKm.toFixed(1),
      totalMiles: kmToMiles(totalKm).toFixed(1),
      legs,
      modeBreakdown,
      totalTravelTime: formatTotalTime(totalTravelMinutes)
    };
  }, [days]);

  // Handle empty state
  if (days.length === 0 || stats.legs === 0) {
    return (
      <div className="h-full bg-gradient-to-b from-amber-50/50 to-slate-50/30">
        {/* View Theme Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 mb-6">
          <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
            <Navigation className="w-4 h-4" />
            Travel & Logistics
          </div>
          <h2 className="text-xl font-extrabold text-white">Journey Planner</h2>
        </div>

        <div className="flex items-center justify-center h-[calc(100%-120px)]">
          <div className="text-center p-8">
            <Navigation className="w-16 h-16 text-amber-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">
              {days.length === 0 ? 'No Journeys Yet' : 'Add More Activities'}
            </h3>
            <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
              {days.length === 0
                ? 'Your travel routes will appear here once you add activities to your trip.'
                : 'Add at least 2 activities with locations to see travel routes between them.'}
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <div className="flex flex-col items-center p-3 bg-white rounded-xl border-2 border-slate-100">
                <Footprints className="w-6 h-6 text-green-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Walk</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white rounded-xl border-2 border-slate-100">
                <Car className="w-6 h-6 text-blue-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Drive</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white rounded-xl border-2 border-slate-100">
                <Plane className="w-6 h-6 text-purple-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Fly</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-amber-50/50 to-slate-50/30">
      {/* View Theme Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 mb-6">
        <div className="flex items-center gap-3 text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
          <Navigation className="w-4 h-4" />
          Travel & Logistics
        </div>
        <h2 className="text-xl font-extrabold text-white">Journey Planner</h2>
      </div>

      <div className="px-6">
      {/* Stats */}
      <div className="mb-6">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-700">{stats.totalKm}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">km</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">{stats.totalMiles} miles</p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-700">{stats.totalTravelTime}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Travel</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Total transit time</p>
          </div>
        </div>

        {/* Transport Mode Breakdown */}
        <div className="mt-4 bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Transport Breakdown</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {stats.modeBreakdown.walking.count > 0 && (
              <div className="flex flex-col items-center p-2 bg-green-50 rounded-xl border border-green-100">
                <Footprints className="w-5 h-5 text-green-600 mb-1" />
                <span className="text-lg font-black text-slate-700">{stats.modeBreakdown.walking.count}</span>
                <span className="text-[10px] font-bold text-green-600 uppercase">Walks</span>
                <span className="text-[10px] text-slate-400">{stats.modeBreakdown.walking.km.toFixed(1)} km</span>
              </div>
            )}
            {stats.modeBreakdown.transit.count > 0 && (
              <div className="flex flex-col items-center p-2 bg-orange-50 rounded-xl border border-orange-100">
                <Train className="w-5 h-5 text-orange-600 mb-1" />
                <span className="text-lg font-black text-slate-700">{stats.modeBreakdown.transit.count}</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase">Transit</span>
                <span className="text-[10px] text-slate-400">{stats.modeBreakdown.transit.km.toFixed(1)} km</span>
              </div>
            )}
            {stats.modeBreakdown.driving.count > 0 && (
              <div className="flex flex-col items-center p-2 bg-blue-50 rounded-xl border border-blue-100">
                <Car className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-lg font-black text-slate-700">{stats.modeBreakdown.driving.count}</span>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Drives</span>
                <span className="text-[10px] text-slate-400">{stats.modeBreakdown.driving.km.toFixed(1)} km</span>
              </div>
            )}
            {stats.modeBreakdown.flight.count > 0 && (
              <div className="flex flex-col items-center p-2 bg-purple-50 rounded-xl border border-purple-100">
                <Plane className="w-5 h-5 text-purple-600 mb-1" />
                <span className="text-lg font-black text-slate-700">{stats.modeBreakdown.flight.count}</span>
                <span className="text-[10px] font-bold text-purple-600 uppercase">Flights</span>
                <span className="text-[10px] text-slate-400">{stats.modeBreakdown.flight.km.toFixed(1)} km</span>
              </div>
            )}
            {stats.legs === 0 && (
              <div className="col-span-4 text-center py-4 text-sm text-slate-400 font-medium">
                No travel legs calculated yet
              </div>
            )}
          </div>
        </div>
        
        {/* Travel Essentials / Recommendations */}
        <div className="mt-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-5">
           <div className="flex items-center gap-2 mb-3">
             <Lightbulb className="w-5 h-5 text-emerald-600" fill="currentColor" fillOpacity={0.2} />
             <h3 className="font-extrabold text-emerald-800 text-sm uppercase tracking-wide">TripPilot Tips</h3>
           </div>
           <div className="space-y-2">
             <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100">
               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
               <span className="text-sm font-bold text-slate-600">Download offline maps for the area</span>
             </div>
             <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100">
               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
               <span className="text-sm font-bold text-slate-600">Carry a portable power bank</span>
             </div>
             {Number(stats.totalKm) > 20 && (
               <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 <span className="text-sm font-bold text-slate-600">Consider a multi-day transit pass</span>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Days Loop */}
      <div className="space-y-12">
        {days.map((day) => {
          const hasActivities = day.activities.length > 0;

          // Calculate day stats
          const dayStats = (() => {
            let dayKm = 0;
            let dayLegs = 0;
            let dayMinutes = 0;

            for (let i = 0; i < day.activities.length - 1; i++) {
              const start = day.activities[i].location.coordinates;
              const end = day.activities[i + 1].location.coordinates;
              if (start && end && (start.lat !== 0 || start.lng !== 0) && (end.lat !== 0 || end.lng !== 0)) {
                const d = getDistanceKm(start.lat, start.lng, end.lat, end.lng);
                dayKm += d;
                dayLegs++;
                const mode = getExtendedMode(d);
                if (mode === 'flight') {
                  dayMinutes += d / 800 * 60 + 90;
                } else {
                  const timeStr = estimateTime(d, mode === 'walking' ? 'walking' : mode === 'driving' ? 'driving' : 'transit');
                  dayMinutes += parseTimeToMinutes(timeStr);
                }
              }
            }
            return { dayKm, dayLegs, dayTime: formatTotalTime(dayMinutes) };
          })();

          return (
            <div key={day.id} className="relative">
              {/* Day Header */}
              <div
                onClick={() => onDaySelect(day.id)}
                className="flex items-center gap-4 mb-6 cursor-pointer group"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white font-black shadow-lg group-hover:scale-105 transition-transform">
                  {day.dayNumber}
                </div>
                <div className="flex-1 bg-white px-4 py-2 rounded-xl border-2 border-slate-200 group-hover:border-blue-300 transition-colors">
                  <h3 className="font-bold text-slate-700">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  {dayStats.dayLegs > 0 && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-blue-500">
                        {dayStats.dayKm.toFixed(1)} km
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-bold text-slate-500">
                        {dayStats.dayTime} travel
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400">
                        {dayStats.dayLegs} {dayStats.dayLegs === 1 ? 'leg' : 'legs'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legs */}
              <div className="pl-5 border-l-4 border-slate-200 ml-5 space-y-8 pb-4">
                {day.activities.map((activity, index) => {
                  const nextActivity = day.activities[index + 1];
                  const hasNext = !!nextActivity;
                  
                  // Calculate metrics if we have a next item
                  let distance = 0;
                  let recommendedMode: 'walking' | 'driving' | 'transit' | 'flight' = 'walking';
                  if (hasNext) {
                    const c1 = activity.location.coordinates;
                    const c2 = nextActivity.location.coordinates;
                    if (c1 && c2 && (c1.lat !== 0 || c1.lng !== 0)) {
                      distance = getDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng);
                      recommendedMode = getExtendedMode(distance);
                    }
                  }

                  // Check if this is a long-distance leg requiring flight
                  const isLongDistance = distance > 200;

                  return (
                    <div key={`${day.id}-${activity.id}`} className="relative">
                      {/* Activity Dot */}
                      <div className="absolute -left-[29px] top-3 w-4 h-4 rounded-full bg-white border-4 border-blue-500 z-10"></div>
                      
                      {/* Current Location Card */}
                      <div className="bg-white border-2 border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-700 truncate block">{activity.location.name}</span>
                              {activity.location.address && (
                                <span className="text-xs text-slate-400 truncate block">{activity.location.address}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                              {activity.time || "Anytime"}
                            </span>
                            {activity.endTime && (
                              <span className="text-[10px] text-slate-400">
                                until {activity.endTime}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Booking Info */}
                        {activity.details?.booking && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap gap-2">
                              {activity.details.booking.confirmationNumber && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-600 border border-emerald-100">
                                  <Ticket className="w-3 h-3" />
                                  {activity.details.booking.confirmationNumber}
                                </div>
                              )}
                              {activity.details.booking.flightNumber && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg text-[10px] font-bold text-purple-600 border border-purple-100">
                                  <Plane className="w-3 h-3" />
                                  {activity.details.booking.airline && `${activity.details.booking.airline} `}
                                  {activity.details.booking.flightNumber}
                                </div>
                              )}
                              {activity.details.booking.terminal && (
                                <div className="px-2 py-1 bg-blue-50 rounded-lg text-[10px] font-bold text-blue-600 border border-blue-100">
                                  Terminal {activity.details.booking.terminal}
                                </div>
                              )}
                              {activity.details.booking.gate && (
                                <div className="px-2 py-1 bg-amber-50 rounded-lg text-[10px] font-bold text-amber-600 border border-amber-100">
                                  Gate {activity.details.booking.gate}
                                </div>
                              )}
                              {activity.details.booking.seatNumber && (
                                <div className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                                  Seat {activity.details.booking.seatNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Travel Card (Connector) */}
                      {hasNext && (
                        <div
                          className="relative my-4"
                          onMouseEnter={() => onLegHover?.({ startId: activity.id, endId: nextActivity.id })}
                          onMouseLeave={() => onLegHover?.(null)}
                        >
                          {/* Mode-specific styling */}
                          {(() => {
                            // User's selected mode or recommended mode
                            const selectedMode = nextActivity.details?.preferredTravelMode || recommendedMode;
                            const isUserSelected = !!nextActivity.details?.preferredTravelMode;

                            const modeStyles = {
                              walking: { bg: 'bg-green-50', border: 'border-green-200', accent: 'text-green-600', line: 'border-dotted' },
                              transit: { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-600', line: 'border-dashed' },
                              driving: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-600', line: 'border-solid' },
                              flight: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'text-purple-600', line: 'border-dashed' },
                            };
                            const style = modeStyles[selectedMode] || modeStyles.driving;

                            const handleModeSelect = (mode: 'walking' | 'driving' | 'transit' | 'flight') => {
                              if (onUpdateActivity) {
                                onUpdateActivity(day.id, nextActivity.id, {
                                  details: {
                                    ...nextActivity.details,
                                    preferredTravelMode: mode
                                  }
                                });
                              }
                            };

                            return (
                          <div className={`group ${style.bg} border-2 ${style.border} hover:brightness-95 transition-colors rounded-xl p-4 flex flex-col gap-3`}>
                            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Travel Leg</span>
                                {(activity.endTime || activity.time) && nextActivity.time && (
                                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded">
                                    {activity.endTime || activity.time} → {nextActivity.time}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {distance > 50 ? (
                                   <AlertCircle className="w-4 h-4 text-amber-500" />
                                ) : null}
                                <span className="text-sm font-black text-blue-600">{distance.toFixed(1)} km</span>
                                <span className="text-xs text-slate-400">({kmToMiles(distance).toFixed(1)} mi)</span>
                              </div>
                            </div>

                            {/* Mode Comparison */}
                            <div className={`grid gap-2 ${isLongDistance ? 'grid-cols-2' : 'grid-cols-3'}`}>
                              {/* Flight - only for long distances */}
                              {isLongDistance && (
                                <button
                                  onClick={() => handleModeSelect('flight')}
                                  className={`relative flex flex-col items-center p-2 bg-white rounded-lg border-2 transition-all hover:scale-105 ${
                                    selectedMode === 'flight' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                                  }`}
                                >
                                  {selectedMode === 'flight' && (
                                    <div className="absolute -top-2 -right-1 bg-blue-500 text-white p-0.5 rounded-full">
                                      {isUserSelected ? <CheckCircle2 size={10} strokeWidth={3}/> : <ThumbsUp size={10} strokeWidth={3}/>}
                                    </div>
                                  )}
                                  <Plane className={`w-4 h-4 mb-1 ${selectedMode === 'flight' ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`text-[10px] font-bold uppercase ${selectedMode === 'flight' ? 'text-blue-600' : 'text-slate-400'}`}>Flight</span>
                                  <span className="text-xs font-black text-slate-700">{formatTotalTime(distance / 800 * 60 + 90)}</span>
                                </button>
                              )}

                              {/* Walk - hide for long distances */}
                              {!isLongDistance && (
                                <button
                                  onClick={() => handleModeSelect('walking')}
                                  className={`relative flex flex-col items-center p-2 bg-white rounded-lg border-2 transition-all hover:scale-105 ${
                                    selectedMode === 'walking' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                                  }`}
                                >
                                  {selectedMode === 'walking' && (
                                    <div className="absolute -top-2 -right-1 bg-blue-500 text-white p-0.5 rounded-full">
                                      {isUserSelected ? <CheckCircle2 size={10} strokeWidth={3}/> : <ThumbsUp size={10} strokeWidth={3}/>}
                                    </div>
                                  )}
                                  <Footprints className={`w-4 h-4 mb-1 ${selectedMode === 'walking' ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`text-[10px] font-bold uppercase ${selectedMode === 'walking' ? 'text-blue-600' : 'text-slate-400'}`}>Walk</span>
                                  <span className="text-xs font-black text-slate-700">{estimateTime(distance, 'walking')}</span>
                                </button>
                              )}

                              {/* Transit */}
                              {!isLongDistance && (
                                <button
                                  onClick={() => handleModeSelect('transit')}
                                  className={`relative flex flex-col items-center p-2 bg-white rounded-lg border-2 transition-all hover:scale-105 ${
                                    selectedMode === 'transit' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                                  }`}
                                >
                                  {selectedMode === 'transit' && (
                                    <div className="absolute -top-2 -right-1 bg-blue-500 text-white p-0.5 rounded-full">
                                      {isUserSelected ? <CheckCircle2 size={10} strokeWidth={3}/> : <ThumbsUp size={10} strokeWidth={3}/>}
                                    </div>
                                  )}
                                  <Train className={`w-4 h-4 mb-1 ${selectedMode === 'transit' ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className={`text-[10px] font-bold uppercase ${selectedMode === 'transit' ? 'text-blue-600' : 'text-slate-400'}`}>Transit</span>
                                  <span className="text-xs font-black text-slate-700">{estimateTime(distance, 'transit')}</span>
                                </button>
                              )}

                              {/* Drive */}
                              <button
                                onClick={() => handleModeSelect('driving')}
                                className={`relative flex flex-col items-center p-2 bg-white rounded-lg border-2 transition-all hover:scale-105 ${
                                  selectedMode === 'driving' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                                }`}
                              >
                                {selectedMode === 'driving' && (
                                  <div className="absolute -top-2 -right-1 bg-blue-500 text-white p-0.5 rounded-full">
                                    {isUserSelected ? <CheckCircle2 size={10} strokeWidth={3}/> : <ThumbsUp size={10} strokeWidth={3}/>}
                                  </div>
                                )}
                                <Car className={`w-4 h-4 mb-1 ${selectedMode === 'driving' ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-bold uppercase ${selectedMode === 'driving' ? 'text-blue-600' : 'text-slate-400'}`}>Drive</span>
                                <span className="text-xs font-black text-slate-700">{estimateTime(distance, 'driving')}</span>
                              </button>
                            </div>

                            {/* Smart Advice */}
                            <div className="bg-white/60 rounded-lg p-2 text-xs font-bold text-slate-500 text-center">
                              {selectedMode === 'walking' && "Great for a scenic walk! Enjoy the vibe."}
                              {selectedMode === 'transit' && "Save money and take the metro or bus."}
                              {selectedMode === 'driving' && "Fastest option. Taxi or Rideshare recommended."}
                              {selectedMode === 'flight' && "Book flights early for better prices!"}
                              {isUserSelected && <span className="ml-1">✓ Your choice</span>}
                            </div>
                          </div>
                            );
                          })()}

                          {/* Visual line extension for next item */}
                          <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-4 h-[200%] border-l-4 border-dashed border-slate-200 -z-10 opacity-50"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {!hasActivities && (
                  <div className="text-sm font-bold text-slate-400 italic">No travel data for this day.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-20"></div>
      </div>
    </div>
  );
};

export default TravelView;