import React, { useMemo, useState, useEffect } from 'react';
import { Itinerary, InterDayTravelMode } from '@/types';
import { MapPin, Car, Footprints, Train, Maximize2, Focus, ChevronDown, Plane, Bus, Ship, MoreHorizontal } from 'lucide-react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { getDistanceKm, getRecommendedMode, getDepartureTime } from '@/utils/geo';
import { LiveLocationMarker } from '@/components/maps/LiveLocationMarker'; 

// Declare google variable to resolve TypeScript errors
declare var google: any;

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

interface MapViewProps {
  itinerary: Itinerary;
  activeDayId: string | null;
  viewMode: 'overview' | 'day' | 'travel';

  // Interaction props
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  hoveredDayId: string | null; // For highlighting a whole day in overview
  hoveredLeg: { startId: string; endId: string } | null;

  onMarkerHover: (id: string | null) => void;
  onMarkerClick: (id: string) => void;

  // Map customization
  enableClustering?: boolean; // Future: enable marker clustering for many markers
  showLiveLocation?: boolean; // Show user's real-time location
}

// --- SUB-COMPONENTS ---

const MapUpdater = ({
  coordsList,
  allCoordsList,
  selectedLocation,
  hoveredLegCoords,
  forceOverview
}: {
  coordsList: {lat: number, lng: number}[],
  allCoordsList: {lat: number, lng: number}[],
  selectedLocation: {lat: number, lng: number} | null,
  hoveredLegCoords: {start: {lat: number, lng: number}, end: {lat: number, lng: number}} | null,
  forceOverview: boolean
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Priority 0: Force overview - show ALL locations across all days
    if (forceOverview && allCoordsList.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allCoordsList.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, 80);

      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom()! > 14) map.setZoom(14);
      });
      return () => google.maps.event.removeListener(listener);
    }
    // Priority 1: If a leg is hovered in travel mode, zoom to show just that leg
    else if (hoveredLegCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(hoveredLegCoords.start);
      bounds.extend(hoveredLegCoords.end);
      map.fitBounds(bounds, 100);

      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        // Cap zoom to reasonable levels
        if (map.getZoom()! > 16) map.setZoom(16);
        if (map.getZoom()! < 12) map.setZoom(12);
      });
      return () => google.maps.event.removeListener(listener);
    }
    // Priority 2: If a specific location is selected
    else if (selectedLocation) {
      map.panTo(selectedLocation);
      if (map.getZoom()! < 14) map.setZoom(14);
    }
    // Priority 3: Fit all coordinates for current view
    else if (coordsList.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      coordsList.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, 50);

      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom()! > 16) map.setZoom(16);
      });
      return () => google.maps.event.removeListener(listener);
    }
  }, [map, coordsList, allCoordsList, selectedLocation, hoveredLegCoords, forceOverview]);

  return null;
};

// Component to fetch and render actual routes from Google Directions API
const ActiveLegRoute = ({
  start,
  end,
  mode,
  activityTime,
  tripDate,
  onLoad
}: {
  start: { lat: number, lng: number },
  end: { lat: number, lng: number },
  mode: string,
  activityTime?: string,
  tripDate?: string,
  onLoad: (success: boolean) => void
}) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<any>();
  const [directionsRenderer, setDirectionsRenderer] = useState<any>();
  const [outlineRenderer, setOutlineRenderer] = useState<any>();
  const [routeError, setRouteError] = useState(false);
  
  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    
    // Create two renderers: one for the colored path, one for a white outline
    setOutlineRenderer(new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: 'white',
        strokeWeight: 9,
        strokeOpacity: 1,
        zIndex: 998
      }
    }));

    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true, 
      preserveViewport: true,
      polylineOptions: {
        strokeColor: '#3b82f6', // Blue-500
        strokeWeight: 5,
        strokeOpacity: 1,
        zIndex: 999 
      }
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !start || !end) return;

    let travelMode = google.maps.TravelMode.DRIVING;
    if (mode === 'walking') travelMode = google.maps.TravelMode.WALKING;
    if (mode === 'transit') travelMode = google.maps.TravelMode.TRANSIT;

    setRouteError(false);

    // Build request with optional departure time
    const request: any = {
      origin: start,
      destination: end,
      travelMode: travelMode
    };

    // Add departure time for traffic-aware routing (Quick Win #1)
    if (tripDate) {
      const departureTime = getDepartureTime(activityTime, tripDate);

      if (mode === 'driving') {
        request.drivingOptions = {
          departureTime: departureTime,
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        };
      } else if (mode === 'transit') {
        request.transitOptions = {
          departureTime: departureTime,
          routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
        };
      }
    }

    directionsService.route(request, (result: any, status: any) => {
      if (status === 'OK' && result && result.routes && result.routes.length > 0) {
        directionsRenderer.setDirections(result);
        if (outlineRenderer) outlineRenderer.setDirections(result);
        onLoad(true);
      } else {
        console.warn("Directions API Request Failed:", status);
        setRouteError(true);
        onLoad(false);
      }
    });

    return () => {
      if (directionsRenderer) directionsRenderer.setDirections({ routes: [] });
      if (outlineRenderer) outlineRenderer.setDirections({ routes: [] });
    };
  }, [directionsService, directionsRenderer, outlineRenderer, start, end, mode, activityTime, tripDate]);

  // Fallback: If Directions API fails, draw a straight line
  // Create stable coordinate keys to prevent unnecessary re-renders
  const startKey = useMemo(() => `${start.lat},${start.lng}`, [start.lat, start.lng]);
  const endKey = useMemo(() => `${end.lat},${end.lng}`, [end.lat, end.lng]);

  useEffect(() => {
    if (!routeError || !map) return;

    const fallbackLine = new google.maps.Polyline({
      path: [start, end],
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeWeight: 5,
      strokeOpacity: 0.8,
      zIndex: 999,
      map: map
    });

    return () => {
      fallbackLine.setMap(null);
    };
  }, [routeError, map, startKey, endKey, start, end]);

  return null;
};

// Component to draw polylines for travel legs
const DirectionsLayer = ({ 
  itinerary, 
  viewMode, 
  hoveredLeg
}: { 
  itinerary: Itinerary, 
  viewMode: string,
  hoveredLeg: { startId: string; endId: string } | null
}) => {
  // Calculate segments
  const segments = useMemo(() => {
    if (viewMode !== 'travel' || !itinerary?.days) return [];

    const segs: any[] = [];
    itinerary.days.forEach(day => {
      for(let i=0; i<day.activities.length-1; i++) {
        const start = day.activities[i];
        const end = day.activities[i+1];
        if(start.location.coordinates?.lat && end.location.coordinates?.lat) {
          const dist = getDistanceKm(
            start.location.coordinates.lat, start.location.coordinates.lng,
            end.location.coordinates.lat, end.location.coordinates.lng
          );
          
          segs.push({
            startId: start.id,
            endId: end.id,
            path: [start.location.coordinates, end.location.coordinates],
            mode: getRecommendedMode(dist),
            midpoint: {
              lat: (start.location.coordinates.lat + end.location.coordinates.lat) / 2,
              lng: (start.location.coordinates.lng + end.location.coordinates.lng) / 2
            }
          });
        }
      }
    });
    return segs;
  }, [itinerary, viewMode]);

  // Dashed polylines removed as they are superceded by ActiveLegRoute

  return (
    <>
      {segments.map((seg, idx) => {
        const isHovered = hoveredLeg && hoveredLeg.startId === seg.startId && hoveredLeg.endId === seg.endId;
        
        return (
          <AdvancedMarker 
            key={`mid-${idx}`}
            position={seg.midpoint}
            zIndex={isHovered ? 0 : 5}
            className={isHovered ? "opacity-0" : "opacity-100"}
          >
            <div className={`p-1.5 rounded-full border-2 shadow-sm bg-white border-slate-200 text-slate-400 transition-all`}>
              {seg.mode === 'walking' && <Footprints size={12} />}
              {seg.mode === 'driving' && <Car size={12} />}
              {seg.mode === 'transit' && <Train size={12} />}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
};

// Format duration in minutes to human readable string
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h${mins}m`;
};

// Component to draw inter-day travel lines (between different day locations)
const InterDayTravelLayer = ({
  segments,
}: {
  segments: {
    id: string;
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    fromDayNumber: number;
    toDayNumber: number;
    mode?: InterDayTravelMode;
    duration?: number;
    midpoint: { lat: number; lng: number };
  }[];
}) => {
  const map = useMap();

  // Draw polylines for each segment
  useEffect(() => {
    if (!map || segments.length === 0) return;

    const polylines = segments.map(seg => {
      return new google.maps.Polyline({
        path: [seg.from, seg.to],
        geodesic: true,
        strokeColor: seg.mode ? '#3b82f6' : '#94a3b8',
        strokeWeight: seg.mode ? 4 : 2,
        strokeOpacity: seg.mode ? 0.8 : 0.5,
        icons: seg.mode ? [] : [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            strokeWeight: 2,
            scale: 3,
          },
          offset: '0',
          repeat: '15px',
        }],
        zIndex: 5,
        map: map,
      });
    });

    return () => {
      polylines.forEach(p => p.setMap(null));
    };
  }, [map, segments]);

  // Get icon for travel mode
  const getTravelIcon = (mode?: InterDayTravelMode) => {
    switch (mode) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'train': return <Train className="w-4 h-4" />;
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'bus': return <Bus className="w-4 h-4" />;
      case 'ferry': return <Ship className="w-4 h-4" />;
      case 'walking': return <Footprints className="w-4 h-4" />;
      case 'other': return <MoreHorizontal className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <>
      {segments.map(seg => (
        <AdvancedMarker
          key={seg.id}
          position={seg.midpoint}
          zIndex={20}
        >
          <div className="flex flex-col items-center">
            {/* Travel mode icon */}
            <div
              className={`
                flex items-center justify-center
                ${seg.mode
                  ? 'w-9 h-9 bg-blue-500 border-blue-600 text-white'
                  : 'w-7 h-7 bg-slate-200 border-slate-300 text-slate-500'
                }
                rounded-full border-2 shadow-lg
              `}
            >
              {seg.mode ? (
                getTravelIcon(seg.mode)
              ) : (
                <span className="text-xs font-bold">?</span>
              )}
            </div>
            {/* Duration badge */}
            {seg.duration && (
              <div className="mt-1 px-2 py-0.5 bg-white border border-blue-200 rounded-full shadow-md">
                <span className="text-xs font-bold text-blue-600">
                  {formatDuration(seg.duration)}
                </span>
              </div>
            )}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
};

// --- MAIN COMPONENT ---

const MapView: React.FC<MapViewProps> = ({
  itinerary,
  activeDayId,
  viewMode,
  hoveredActivityId,
  selectedActivityId,
  hoveredDayId,
  hoveredLeg,
  onMarkerHover,
  onMarkerClick,
  enableClustering = false,
  showLiveLocation = false,
}) => {
  const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const [mapError, setMapError] = useState<string | null>(null);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Reset overview mode when active day changes (user clicked a day)
  useEffect(() => {
    if (activeDayId) {
      setIsOverviewMode(false);
    }
  }, [activeDayId]);

  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY) {
      const originalHandler = window.gm_authFailure;
      window.gm_authFailure = () => {
        console.error("Google Maps Authentication Failure");
        setMapError("AuthFailure");
        if (originalHandler) originalHandler();
      };

      return () => {
        window.gm_authFailure = originalHandler;
      };
    }
  }, [GOOGLE_MAPS_API_KEY]);

  // Find the day containing the hovered leg (for travel mode)
  const hoveredLegDayId = useMemo(() => {
    if (!hoveredLeg || viewMode !== 'travel') return null;

    for (const day of itinerary.days) {
      const hasStart = day.activities.some(a => a.id === hoveredLeg.startId);
      const hasEnd = day.activities.some(a => a.id === hoveredLeg.endId);
      if (hasStart && hasEnd) {
        return day.id;
      }
    }
    return null;
  }, [hoveredLeg, itinerary, viewMode]);

  // Get day-level primary locations (cities)
  const displayedDayLocations = useMemo(() => {
    let dayLocations: { dayId: string, dayNumber: number, location: any }[] = [];

    if (!itinerary?.days) return dayLocations;

    // Show all day locations in overview mode or when overview button is clicked
    if (viewMode === 'overview' || isOverviewMode) {
      itinerary.days.forEach(day => {
        if (day.primaryLocation?.coordinates &&
            (day.primaryLocation.coordinates.lat !== 0 || day.primaryLocation.coordinates.lng !== 0)) {
          dayLocations.push({
            dayId: day.id,
            dayNumber: day.dayNumber,
            location: day.primaryLocation
          });
        }
      });
    } else {
      // Day/travel mode: show only active day's location
      const targetDayId = (viewMode === 'travel' && hoveredLegDayId) ? hoveredLegDayId : activeDayId;
      const day = itinerary.days.find(d => d.id === targetDayId);
      if (day?.primaryLocation?.coordinates &&
          (day.primaryLocation.coordinates.lat !== 0 || day.primaryLocation.coordinates.lng !== 0)) {
        dayLocations.push({
          dayId: day.id,
          dayNumber: day.dayNumber,
          location: day.primaryLocation
        });
      }
    }
    return dayLocations;
  }, [itinerary, activeDayId, viewMode, hoveredLegDayId, isOverviewMode]);

  // Group day locations that are at the same coordinates
  const groupedDayLocations = useMemo(() => {
    const groups = new globalThis.Map<string, typeof displayedDayLocations>();

    displayedDayLocations.forEach(dayLoc => {
      // Create a key from coordinates (rounded to handle floating point)
      const key = `${dayLoc.location.coordinates.lat.toFixed(4)},${dayLoc.location.coordinates.lng.toFixed(4)}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(dayLoc);
    });

    // Convert to array with group info
    return Array.from(groups.entries()).map(([coordKey, days]) => ({
      id: coordKey,
      days: days.sort((a, b) => a.dayNumber - b.dayNumber), // Sort by day number
      location: days[0].location,
      coordinates: days[0].location.coordinates,
    }));
  }, [displayedDayLocations]);

  // Determine which activities to show based on View Mode
  const displayedActivities = useMemo(() => {
    let activities: { activity: any, dayId: string }[] = [];

    if (!itinerary?.days) return activities;

    // Show all activities in overview mode or when overview button is clicked
    if (viewMode === 'overview' || isOverviewMode) {
      itinerary.days.forEach(day => {
        day.activities.forEach(act => {
          if (act.location.coordinates && (act.location.coordinates.lat !== 0 || act.location.coordinates.lng !== 0)) {
            activities.push({ activity: act, dayId: day.id });
          }
        });
      });
    } else {
      // For day and travel modes, show only the relevant day's activities
      // In travel mode: if a leg is hovered, show that leg's day; otherwise show active day
      const targetDayId = (viewMode === 'travel' && hoveredLegDayId) ? hoveredLegDayId : activeDayId;
      const day = itinerary.days.find(d => d.id === targetDayId);
      if (day) {
        day.activities.forEach(act => {
           if (act.location.coordinates && (act.location.coordinates.lat !== 0 || act.location.coordinates.lng !== 0)) {
            activities.push({ activity: act, dayId: day.id });
          }
        });
      }
    }
    return activities;
  }, [itinerary, activeDayId, viewMode, hoveredLegDayId, isOverviewMode]);

  // Combine all coordinates for auto-zoom (both day locations and activities)
  const coordsList = useMemo(() => {
    const coords: { lat: number, lng: number }[] = [];

    // Add day-level location coordinates
    displayedDayLocations.forEach(item => {
      coords.push(item.location.coordinates);
    });

    // Add activity coordinates
    displayedActivities.forEach(item => {
      coords.push(item.activity.location.coordinates!);
    });

    return coords;
  }, [displayedDayLocations, displayedActivities]);

  // ALL coordinates across ALL days (for overview mode button)
  const allCoordsList = useMemo(() => {
    const coords: { lat: number, lng: number }[] = [];

    if (!itinerary?.days) return coords;

    itinerary.days.forEach(day => {
      // Add primary location
      if (day.primaryLocation?.coordinates &&
          (day.primaryLocation.coordinates.lat !== 0 || day.primaryLocation.coordinates.lng !== 0)) {
        coords.push(day.primaryLocation.coordinates);
      }

      // Add all activity coordinates
      day.activities.forEach(act => {
        if (act.location.coordinates &&
            (act.location.coordinates.lat !== 0 || act.location.coordinates.lng !== 0)) {
          coords.push(act.location.coordinates);
        }
      });
    });

    return coords;
  }, [itinerary]);

  // Calculate inter-day travel segments (lines between different day locations)
  const interDayTravelSegments = useMemo(() => {
    const segments: {
      id: string;
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      fromDayNumber: number;
      toDayNumber: number;
      mode?: InterDayTravelMode;
      duration?: number; // in minutes
      midpoint: { lat: number; lng: number };
    }[] = [];

    if (!itinerary?.days || itinerary.days.length < 2) return segments;

    // Only show when in overview mode or when isOverviewMode is true
    if (viewMode !== 'overview' && !isOverviewMode) return segments;

    for (let i = 1; i < itinerary.days.length; i++) {
      const prevDay = itinerary.days[i - 1];
      const currDay = itinerary.days[i];

      // Both days need primary locations with coordinates
      if (!prevDay.primaryLocation?.coordinates || !currDay.primaryLocation?.coordinates) continue;

      // Skip if same location (use same rounding as grouped markers)
      const prevKey = `${prevDay.primaryLocation.coordinates.lat.toFixed(4)},${prevDay.primaryLocation.coordinates.lng.toFixed(4)}`;
      const currKey = `${currDay.primaryLocation.coordinates.lat.toFixed(4)},${currDay.primaryLocation.coordinates.lng.toFixed(4)}`;
      if (prevKey === currKey) continue;

      segments.push({
        id: `travel-${prevDay.id}-${currDay.id}`,
        from: prevDay.primaryLocation.coordinates,
        to: currDay.primaryLocation.coordinates,
        fromDayNumber: prevDay.dayNumber,
        toDayNumber: currDay.dayNumber,
        mode: currDay.travelFromPrevious?.mode,
        duration: currDay.travelFromPrevious?.duration,
        midpoint: {
          lat: (prevDay.primaryLocation.coordinates.lat + currDay.primaryLocation.coordinates.lat) / 2,
          lng: (prevDay.primaryLocation.coordinates.lng + currDay.primaryLocation.coordinates.lng) / 2,
        },
      });
    }

    return segments;
  }, [itinerary, viewMode, isOverviewMode]);

  const selectedLocation = useMemo(() => {
    if (!selectedActivityId) return null;
    const item = displayedActivities.find(a => a.activity.id === selectedActivityId);
    return item ? item.activity.location.coordinates! : null;
  }, [selectedActivityId, displayedActivities]);

  // Get Active Leg Data for Directions API
  const activeLegData = useMemo(() => {
    if (!hoveredLeg || viewMode !== 'travel' || !itinerary?.days) return null;

    // Find start and end activities
    let start: any = undefined;
    let end: any = undefined;
    let dayDate: string | undefined = undefined;

    itinerary.days.forEach(day => {
      const s = day.activities.find(a => a.id === hoveredLeg.startId);
      const e = day.activities.find(a => a.id === hoveredLeg.endId);
      if (s) {
        start = s;
        dayDate = day.date;
      }
      if (e) end = e;
    });

    if (start && end && start.location.coordinates && end.location.coordinates) {
      const dist = getDistanceKm(
        start.location.coordinates.lat, start.location.coordinates.lng,
        end.location.coordinates.lat, end.location.coordinates.lng
      );

      // Use user's preferred mode if set, otherwise use recommended mode
      const userPreferredMode = end.details?.preferredTravelMode;
      const recommendedMode = getRecommendedMode(dist);
      const mode = userPreferredMode || recommendedMode;

      return {
        start: start.location.coordinates,
        end: end.location.coordinates,
        mode: mode,
        activityTime: start.time,
        tripDate: dayDate
      };
    }
    return null;

  }, [hoveredLeg, itinerary, viewMode]);

  // Get coordinates for the hovered leg (for zooming)
  const hoveredLegCoords = useMemo(() => {
    if (!activeLegData) return null;
    return {
      start: activeLegData.start,
      end: activeLegData.end
    };
  }, [activeLegData]);

  const defaultCenter = { lat: 48.8566, lng: 2.3522 };

  if (GOOGLE_MAPS_API_KEY && !mapError) {
    return (
      <div className="w-full h-full bg-slate-100 relative">
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={13}
            mapId="trip_pilot_map"
            gestureHandling={'greedy'}
            disableDefaultUI={false}
            className="w-full h-full"
          >
             {/* Map position and zoom controller */}
             <MapUpdater
               coordsList={coordsList}
               allCoordsList={allCoordsList}
               selectedLocation={selectedLocation}
               hoveredLegCoords={hoveredLegCoords}
               forceOverview={isOverviewMode}
             />

             {/* Render Lines if in travel mode */}
             <DirectionsLayer
               itinerary={itinerary}
               viewMode={viewMode}
               hoveredLeg={hoveredLeg}
             />

             {/* Inter-day travel lines (between different day locations) */}
             <InterDayTravelLayer segments={interDayTravelSegments} />

             {/* Render Active Real Route on Hover */}
             {activeLegData && (
               <ActiveLegRoute
                 start={activeLegData.start}
                 end={activeLegData.end}
                 mode={activeLegData.mode}
                 activityTime={activeLegData.activityTime}
                 tripDate={activeLegData.tripDate}
                 onLoad={() => {}}
               />
             )}

             {/* Live Location Tracking */}
             {showLiveLocation && <LiveLocationMarker showAccuracyCircle />}

             {/* Day Location Markers (City-level) - Grouped */}
             {groupedDayLocations.map((group) => {
               const isMultipleDays = group.days.length > 1;
               const isExpanded = expandedGroupId === group.id;
               const hasActiveDayInGroup = group.days.some(d => activeDayId === d.dayId);
               const hasHighlightedDayInGroup = group.days.some(d => hoveredDayId === d.dayId);
               const isActive = hasActiveDayInGroup || hasHighlightedDayInGroup || isExpanded;

               // For single day, show simple marker
               if (!isMultipleDays) {
                 const { dayId, dayNumber, location } = group.days[0];
                 const isDayHighlighted = hoveredDayId === dayId;
                 const isActiveDayLocation = activeDayId === dayId;
                 const isSingleActive = isDayHighlighted || isActiveDayLocation;

                 return (
                   <AdvancedMarker
                     key={`day-loc-${dayId}`}
                     position={location.coordinates}
                     title={location.name}
                     zIndex={isSingleActive ? 90 : 10}
                   >
                     <div className="relative">
                       <div
                         className={`
                           flex items-center justify-center
                           w-10 h-10 rounded-full
                           border-4 shadow-lg
                           font-black text-lg
                           transition-all duration-200
                           ${isSingleActive
                             ? 'bg-emerald-500 border-emerald-700 text-white scale-110'
                             : 'bg-white border-emerald-500 text-emerald-600'
                           }
                         `}
                       >
                         {dayNumber}
                       </div>
                       <div
                         className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200 ${isSingleActive ? 'opacity-100' : 'opacity-0 invisible'}`}
                       >
                         Day {dayNumber}: {location.name}
                         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-700 rotate-45"></div>
                       </div>
                     </div>
                   </AdvancedMarker>
                 );
               }

               // For multiple days at same location, show grouped marker with callout
               return (
                 <AdvancedMarker
                   key={`day-group-${group.id}`}
                   position={group.coordinates}
                   title={`${group.days.length} days in ${group.location.name}`}
                   zIndex={isActive ? 95 : 15}
                 >
                   <div className="relative">
                     {/* Main grouped marker */}
                     <div
                       onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                       className={`
                         flex items-center justify-center gap-1
                         px-3 h-10 rounded-full
                         border-4 shadow-lg
                         font-black text-base
                         transition-all duration-200
                         cursor-pointer
                         ${isActive
                           ? 'bg-emerald-500 border-emerald-700 text-white scale-110'
                           : 'bg-white border-emerald-500 text-emerald-600 hover:scale-105'
                         }
                       `}
                     >
                       <span>{group.days.map(d => d.dayNumber).join(', ')}</span>
                       <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                     </div>

                     {/* Expanded callout showing all days */}
                     {isExpanded && (
                       <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border-2 border-emerald-200 rounded-xl shadow-2xl z-50 min-w-[160px] overflow-hidden">
                         {/* Header */}
                         <div className="bg-emerald-500 text-white px-3 py-2 text-xs font-bold">
                           {group.location.name}
                         </div>
                         {/* Days list */}
                         <div className="p-1">
                           {group.days.map(({ dayId, dayNumber }) => {
                             const isThisDayActive = activeDayId === dayId;
                             return (
                               <button
                                 key={dayId}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   // Could add onDaySelect callback here if needed
                                   setExpandedGroupId(null);
                                 }}
                                 className={`
                                   w-full px-3 py-2 text-left text-sm font-bold rounded-lg
                                   transition-colors
                                   ${isThisDayActive
                                     ? 'bg-emerald-100 text-emerald-700'
                                     : 'text-slate-700 hover:bg-slate-100'
                                   }
                                 `}
                               >
                                 Day {dayNumber}
                               </button>
                             );
                           })}
                         </div>
                         {/* Arrow pointing up */}
                         <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-500 rotate-45 border-l-2 border-t-2 border-emerald-200"></div>
                       </div>
                     )}

                     {/* Hover tooltip (when not expanded) */}
                     {!isExpanded && (
                       <div
                         className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 invisible'}`}
                       >
                         {group.days.length} days in {group.location.name}
                         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-700 rotate-45"></div>
                       </div>
                     )}
                   </div>
                 </AdvancedMarker>
               );
             })}

             {/* Activity Markers */}
            {displayedActivities.map(({ activity, dayId }) => {
              const isHovered = hoveredActivityId === activity.id;
              const isSelected = selectedActivityId === activity.id;

              const isDayHighlighted = (viewMode === 'overview' || viewMode === 'travel') && hoveredDayId === dayId;

              const isLegStart = hoveredLeg?.startId === activity.id;
              const isLegEnd = hoveredLeg?.endId === activity.id;

              const isActive = isHovered || isSelected || isDayHighlighted || isLegStart || isLegEnd;

              // Activity type colors
              const activityColors: Record<string, { bg: string; border: string; icon: string }> = {
                food: { bg: '#f97316', border: '#c2410c', icon: '🍽️' },      // Orange
                lodging: { bg: '#6366f1', border: '#4338ca', icon: '🏨' },   // Indigo
                travel: { bg: '#3b82f6', border: '#1d4ed8', icon: '✈️' },    // Blue
                activity: { bg: '#ec4899', border: '#be185d', icon: '📍' },  // Pink
              };

              const typeColor = activityColors[activity.type] || activityColors.activity;

              return (
                <AdvancedMarker
                  key={activity.id}
                  position={activity.location.coordinates}
                  title={activity.location.name}
                  onClick={() => onMarkerClick(activity.id)}
                  onMouseEnter={() => onMarkerHover(activity.id)}
                  onMouseLeave={() => onMarkerHover(null)}
                  zIndex={isActive ? 100 : 1}
                >
                  <div className="relative">
                    {/* Activity marker - smaller pin with type-specific color */}
                    <div
                      className={`
                        flex items-center justify-center
                        w-7 h-7 rounded-full
                        border-2 shadow-md
                        text-sm
                        transition-all duration-200
                        ${isActive ? 'scale-125 ring-2 ring-white ring-offset-2' : ''}
                      `}
                      style={{
                        backgroundColor: typeColor.bg,
                        borderColor: typeColor.border,
                      }}
                    >
                      <span className="text-xs">{typeColor.icon}</span>
                    </div>
                    {/* Activity tooltip */}
                    <div
                      className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 invisible'}`}
                    >
                      {(viewMode === 'overview' || viewMode === 'travel') ? `Day ${itinerary?.days?.find(d => d.id === dayId)?.dayNumber}: ` : ''}
                      {activity.description || activity.location.name}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>

          {/* Zoom Control Buttons */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            {/* Overview Button - Show all locations */}
            <button
              onClick={() => setIsOverviewMode(true)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border-2 transition-all font-bold text-sm
                ${isOverviewMode
                  ? 'bg-emerald-500 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700'
                }
              `}
              title="Show all locations"
            >
              <Maximize2 className="w-5 h-5" />
              <span>View All</span>
            </button>

            {/* Focus on active day button - shows current day number */}
            {activeDayId && !isOverviewMode && (
              <button
                onClick={() => setIsOverviewMode(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border-2 bg-blue-500 border-blue-600 text-white font-bold text-sm cursor-default"
                title="Focused on current day"
              >
                <Focus className="w-5 h-5" />
                <span>Day {itinerary.days.find(d => d.id === activeDayId)?.dayNumber || ''}</span>
              </button>
            )}
          </div>

          {/* Overview mode indicator */}
          {isOverviewMode && allCoordsList.length > 1 && (
            <div className="absolute bottom-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 z-10">
              <Maximize2 className="w-4 h-4" />
              Showing all {allCoordsList.length} locations
            </div>
          )}
        </div>
    );
  }

  // --- FALLBACK PLACEHOLDER ---
  const getRelativePosition = (lat: number, lng: number) => {
    const x = (Math.abs(lat * 1000) % 70) + 15;
    const y = (Math.abs(lng * 1000) % 70) + 15;
    return { top: `${x}%`, left: `${y}%` };
  };

  return (
    <div className="relative w-full h-full bg-blue-50/50 overflow-hidden group font-sans">
      <div className="absolute inset-0 opacity-[0.03]" 
           style={{
             backgroundImage: 'radial-gradient(#3b82f6 2px, transparent 2px)', 
             backgroundSize: '30px 30px'
           }}>
      </div>
      
      {displayedActivities.map(({ activity }) => {
        const pos = getRelativePosition(activity.location.coordinates!.lat, activity.location.coordinates!.lng);
        const isActive = hoveredActivityId === activity.id || selectedActivityId === activity.id;

        return (
          <div
            key={activity.id}
            className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group/pin transition-all duration-300 ${isActive ? 'z-50 scale-125' : 'z-10 hover:scale-110'}`}
            style={{ top: pos.top, left: pos.left }}
            onClick={() => onMarkerClick(activity.id)}
            onMouseEnter={() => onMarkerHover(activity.id)}
            onMouseLeave={() => onMarkerHover(null)}
          >
             <MapPin className={`w-10 h-10 drop-shadow-lg transition-colors ${isActive ? 'text-blue-500 fill-blue-500' : 'text-slate-400 fill-slate-400'}`} />
          </div>
        );
      })}
    </div>
  );
};

export default MapView;