import React, { useState, useEffect } from 'react';
import { Car, Train, Plane, Bus, Ship, Footprints, MoreHorizontal, ChevronDown, X, Clock, Loader2, Check, Sun, Sunset, Moon, CloudMoon } from 'lucide-react';
import type { InterDayTravel, InterDayTravelMode, TravelPeriod, GeoCoordinates } from '@/types';
import { directionsService } from '@/services/maps/directionsService';
import type { TravelMode } from '@/types/maps';

interface InterDayTravelEditorProps {
  fromDayNumber: number;
  toDayNumber: number;
  fromLocation: string;
  toLocation: string;
  fromCoordinates?: GeoCoordinates;
  toCoordinates?: GeoCoordinates;
  travel?: InterDayTravel;
  onTravelChange: (travel: InterDayTravel | undefined) => void;
}

const TRAVEL_MODES: { mode: InterDayTravelMode; label: string; icon: React.ReactNode; googleMode?: TravelMode }[] = [
  { mode: 'car', label: 'Car', icon: <Car className="w-4 h-4" />, googleMode: 'driving' },
  { mode: 'train', label: 'Train', icon: <Train className="w-4 h-4" />, googleMode: 'transit' },
  { mode: 'flight', label: 'Flight', icon: <Plane className="w-4 h-4" /> },
  { mode: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4" />, googleMode: 'transit' },
  { mode: 'ferry', label: 'Ferry', icon: <Ship className="w-4 h-4" /> },
  { mode: 'walking', label: 'Walking', icon: <Footprints className="w-4 h-4" />, googleMode: 'walking' },
  { mode: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
];

const TRAVEL_PERIODS: { period: TravelPeriod; label: string; icon: React.ReactNode; timeRange: string }[] = [
  { period: 'morning', label: 'Morning', icon: <Sun className="w-4 h-4" />, timeRange: '6am - 12pm' },
  { period: 'afternoon', label: 'Afternoon', icon: <Sunset className="w-4 h-4" />, timeRange: '12pm - 5pm' },
  { period: 'evening', label: 'Evening', icon: <CloudMoon className="w-4 h-4" />, timeRange: '5pm - 9pm' },
  { period: 'night', label: 'Night', icon: <Moon className="w-4 h-4" />, timeRange: '9pm - 6am' },
];

// Format duration in minutes to human readable string
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

export const InterDayTravelEditor: React.FC<InterDayTravelEditorProps> = ({
  fromDayNumber,
  toDayNumber,
  fromLocation,
  toLocation,
  fromCoordinates,
  toCoordinates,
  travel,
  onTravelChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [manualInputMode, setManualInputMode] = useState<InterDayTravelMode | null>(null);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [estimatedDurations, setEstimatedDurations] = useState<Record<InterDayTravelMode, number | null>>({
    car: null,
    train: null,
    flight: null,
    bus: null,
    ferry: null,
    walking: null,
    other: null,
  });

  const selectedMode = travel ? TRAVEL_MODES.find(m => m.mode === travel.mode) : null;
  const selectedPeriod = travel?.departurePeriod ? TRAVEL_PERIODS.find(p => p.period === travel.departurePeriod) : null;

  // Calculate travel times when dropdown opens
  useEffect(() => {
    if (!isExpanded || !fromCoordinates || !toCoordinates) return;

    const calculateTimes = async () => {
      setIsCalculating(true);

      const modesToCalculate: { mode: InterDayTravelMode; googleMode: TravelMode }[] = [
        { mode: 'car', googleMode: 'driving' },
        { mode: 'train', googleMode: 'transit' },
        { mode: 'bus', googleMode: 'transit' },
        { mode: 'walking', googleMode: 'walking' },
      ];

      const results: Record<InterDayTravelMode, number | null> = { ...estimatedDurations };

      await Promise.all(
        modesToCalculate.map(async ({ mode, googleMode }) => {
          try {
            const result = await directionsService.getDirections({
              origin: fromCoordinates,
              destination: toCoordinates,
              travelMode: googleMode,
            });

            if (result.status === 'OK' && result.routes.length > 0) {
              const durationMinutes = Math.round(result.routes[0].totalDuration / 60);
              results[mode] = durationMinutes;
            }
          } catch (error) {
            console.error(`Failed to get ${mode} directions:`, error);
          }
        })
      );

      setEstimatedDurations(results);
      setIsCalculating(false);
    };

    calculateTimes();
  }, [isExpanded, fromCoordinates, toCoordinates]);

  // Reset manual input when dropdown closes
  useEffect(() => {
    if (!isExpanded) {
      setManualInputMode(null);
      setManualHours('');
      setManualMinutes('');
    }
  }, [isExpanded]);

  const handleModeSelect = (mode: InterDayTravelMode) => {
    const modeConfig = TRAVEL_MODES.find(m => m.mode === mode);
    const hasGoogleMode = !!modeConfig?.googleMode;
    const duration = estimatedDurations[mode];

    if (!hasGoogleMode) {
      // Show manual input for modes without Google API support
      setManualInputMode(mode);
      // Pre-fill with existing duration if editing
      if (travel?.mode === mode && travel?.duration) {
        const hours = Math.floor(travel.duration / 60);
        const mins = travel.duration % 60;
        setManualHours(hours > 0 ? hours.toString() : '');
        setManualMinutes(mins > 0 ? mins.toString() : '');
      }
    } else {
      // Auto modes - save immediately, preserve existing period
      onTravelChange({
        mode,
        details: travel?.details,
        duration: duration || undefined,
        departurePeriod: travel?.departurePeriod,
      });
      setIsExpanded(false);
    }
  };

  const handlePeriodSelect = (period: TravelPeriod | undefined) => {
    if (!travel) return;
    onTravelChange({
      ...travel,
      departurePeriod: period,
    });
  };

  const handleManualSave = () => {
    if (!manualInputMode) return;

    const hours = parseInt(manualHours) || 0;
    const mins = parseInt(manualMinutes) || 0;
    const totalMinutes = hours * 60 + mins;

    onTravelChange({
      mode: manualInputMode,
      details: travel?.details,
      duration: totalMinutes > 0 ? totalMinutes : undefined,
      departurePeriod: travel?.departurePeriod,
    });
    setIsExpanded(false);
    setManualInputMode(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTravelChange(undefined);
    setIsExpanded(false);
  };

  // Don't show if locations are the same
  if (fromLocation === toLocation) {
    return null;
  }

  const manualModeConfig = manualInputMode ? TRAVEL_MODES.find(m => m.mode === manualInputMode) : null;

  return (
    <div className="relative flex items-center justify-center py-2">
      {/* Connector line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-blue-300 to-slate-200" />

      {/* Travel mode button */}
      <div className="relative z-10">
        {!travel ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-dashed border-blue-300 rounded-full text-blue-500 hover:bg-blue-50 hover:border-blue-400 transition-all text-sm font-medium"
          >
            <Plane className="w-4 h-4" />
            <span>How are you getting there?</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <div className="group flex items-center gap-2 px-3 py-1.5 bg-blue-500 border-2 border-blue-600 rounded-full text-white text-sm font-bold shadow-md">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {selectedMode?.icon}
              <span>{selectedMode?.label}</span>
              {selectedPeriod && (
                <span className="flex items-center gap-1 text-blue-200 font-medium">
                  {selectedPeriod.icon}
                  <span className="text-xs">{selectedPeriod.label}</span>
                </span>
              )}
              {travel.duration && (
                <span className="flex items-center gap-1 text-blue-200 font-medium">
                  <Clock className="w-3 h-3" />
                  {formatDuration(travel.duration)}
                </span>
              )}
              {travel.details && (
                <span className="text-blue-200 font-normal">({travel.details})</span>
              )}
            </button>
            <button
              onClick={handleClear}
              className="ml-1 p-0.5 hover:bg-blue-700 rounded-full transition-colors"
              title="Clear travel mode"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Dropdown for selecting travel mode */}
        {isExpanded && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 min-w-[280px] overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase">Travel from</div>
              <div className="text-sm font-bold text-slate-700">
                Day {fromDayNumber} ({fromLocation}) <span className="text-slate-400">to</span> Day {toDayNumber} ({toLocation})
              </div>
            </div>

            {/* Manual time input panel */}
            {manualInputMode && manualModeConfig && (
              <div className="p-3 border-b border-slate-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-blue-600">{manualModeConfig.icon}</span>
                  <span className="font-bold text-blue-700">{manualModeConfig.label}</span>
                  <span className="text-sm text-blue-500">- Enter travel time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="0"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      className="w-14 px-2 py-1.5 border-2 border-slate-300 rounded-lg text-center font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-sm font-medium text-slate-500">hrs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-14 px-2 py-1.5 border-2 border-slate-300 rounded-lg text-center font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-sm font-medium text-slate-500">min</span>
                  </div>
                  <button
                    onClick={handleManualSave}
                    className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                </div>
                <button
                  onClick={() => setManualInputMode(null)}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  &larr; Back to all options
                </button>
              </div>
            )}

            {/* Mode selection list */}
            {!manualInputMode && (
              <div className="p-1">
                {TRAVEL_MODES.map(({ mode, label, icon, googleMode }) => {
                  const duration = estimatedDurations[mode];
                  const canCalculate = !!googleMode;
                  const isManualMode = !googleMode;

                  return (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-left
                        ${travel?.mode === mode
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-100'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={travel?.mode === mode ? 'text-blue-600' : 'text-slate-400'}>
                          {icon}
                        </span>
                        <span className="font-medium">{label}</span>
                      </div>
                      <div className="text-right">
                        {isCalculating && canCalculate ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : duration ? (
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(duration)}
                          </span>
                        ) : canCalculate ? (
                          <span className="text-xs text-slate-400">--</span>
                        ) : isManualMode ? (
                          <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Enter time &rarr;
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Departure time period selector (only show when mode is selected) */}
            {!manualInputMode && travel && (
              <div className="border-t border-slate-200 p-3">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                  Departure Time (Optional)
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {TRAVEL_PERIODS.map(({ period, label, icon }) => (
                    <button
                      key={period}
                      onClick={() => handlePeriodSelect(travel.departurePeriod === period ? undefined : period)}
                      className={`
                        flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors text-xs
                        ${travel.departurePeriod === period
                          ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                          : 'text-slate-500 hover:bg-slate-100 border-2 border-transparent'
                        }
                      `}
                    >
                      <span className={travel.departurePeriod === period ? 'text-amber-600' : 'text-slate-400'}>
                        {icon}
                      </span>
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
