import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { AppShell } from '@/app/AppShell';
import MapView from '@/components/modals/MapView';
import ChatAssistant from '@/components/modals/ChatAssistant';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTripStore, useUIStore } from '@/stores';
import { useAuth } from '@/hooks/useAuth';
import { parseItineraryText } from '@/services/geminiService';
import { useChat } from '@/hooks/useChat';
import { TripSettingsModal } from '@/components/features/trips/TripSettingsModal';
import { CreateTripModal } from '@/components/features/trips/CreateTripModal';
import type { Itinerary, TripId, CreateTripInput, Trip } from '@/types';

// Lazy load heavy components for code splitting
const ItineraryView = lazy(() => import('@/components/modals/ItineraryView'));
const TripOverview = lazy(() => import('@/components/modals/TripOverview'));
const CountryOverview = lazy(() => import('@/components/modals/CountryOverview'));
const TravelView = lazy(() => import('@/components/modals/TravelView'));
const ImportModal = lazy(() => import('@/components/modals/ImportModal'));
const ExportModal = lazy(() => import('@/components/modals/ExportModal'));
const TodayView = lazy(() => import('@/components/features/today/TodayView').then(m => ({ default: m.TodayView })));
const TripList = lazy(() => import('@/components/features/trips/TripList').then(m => ({ default: m.TripList })));
const PlannerView = lazy(() => import('@/components/planner').then(m => ({ default: m.PlannerView })));

const App: React.FC = () => {
  // Initialize Firebase auth
  useAuth();

  // Zustand stores
  const {
    activeTrip,
    activeTripId,
    trips,
    loadTrips,
    createTrip,
    setActiveTrip,
    addActivity,
    updateActivity,
    deleteActivity,
    replaceItinerary,
    addDays,
    modifyDay,
    getTripSummaries,
    deleteTrip,
    archiveTrip,
    unarchiveTrip,
    duplicateTrip,
    updateTrip,
    isLoading,
  } = useTripStore();

  const {
    viewMode,
    activeDayId,
    setActiveDayId,
    hoveredActivityId,
    selectedActivityId,
    hoveredDayId,
    hoveredLeg,
    setHoveredActivity,
    setSelectedActivity,
    setHoveredDayId,
    setHoveredLeg,
    isChatOpen,
    toggleChat,
    setTripViewMode,
    getTripViewMode,
    setViewMode,
  } = useUIStore();

  // Local state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [exportingTrip, setExportingTrip] = useState<Trip | null>(null);

  // Handler for creating trips from chat
  const handleChatTripCreate = useCallback(async (input: CreateTripInput, itinerary: Itinerary): Promise<void> => {
    // 1. Create the trip (returns the created trip directly)
    const trip = await createTrip(input);

    // 2. Update the trip with the AI-generated itinerary using returned trip ID
    await updateTrip(trip.id, { itinerary });

    // 3. Switch to day view
    useUIStore.getState().setViewMode('day');
  }, [createTrip, updateTrip]);

  // Chat hook
  const { messages, isLoading: isChatLoading, sendMessage, confirmAction, cancelAction, mode: chatMode, setMode: setChatMode } = useChat(
    activeTrip?.itinerary || { title: '', days: [] },
    !!activeTrip,
    async (itinerary: Itinerary) => {
      if (activeTrip) {
        await replaceItinerary(itinerary);
      }
    },
    async (dayNumber: number, activity) => {
      await addActivity(dayNumber, activity);
    },
    handleChatTripCreate,
    // onDayAdd callback - adds new days to the trip
    async (days, position) => {
      if (activeTrip) {
        await addDays(days, position);
      }
    },
    // onDayModify callback - modifies activities within a day
    async (dayNumber, action, activities, removeIndices) => {
      if (activeTrip) {
        await modifyDay(dayNumber, action, activities, removeIndices);
      }
    }
  );

  // Load trips on mount
  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Keyboard shortcuts for view navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Ignore if any modifiers are pressed
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      // Only trigger shortcuts if there's an active trip
      if (!activeTrip) {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          setViewMode('country');
          break;
        case '2':
          event.preventDefault();
          setViewMode('overview');
          break;
        case '3':
          event.preventDefault();
          setViewMode('day');
          break;
        case '4':
          event.preventDefault();
          setViewMode('travel');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTrip, setViewMode]);

  // Set initial active day when trip loads
  useEffect(() => {
    const days = activeTrip?.itinerary?.days;
    if (activeTrip && !activeDayId && days && days.length > 0) {
      setActiveDayId(days[0].id);
    }
  }, [activeTrip, activeDayId, setActiveDayId]);

  // Persist current view per trip
  useEffect(() => {
    if (activeTripId && viewMode !== 'trips') {
      setTripViewMode(activeTripId, viewMode);
    }
  }, [viewMode, activeTripId, setTripViewMode]);

  const handleImport = useCallback(async (text: string) => {
    const parsed = await parseItineraryText(text);
    if (parsed) {
      // If no active trip exists, create one first
      if (!activeTrip) {
        // Extract trip metadata from parsed itinerary
        const firstDay = parsed.days[0];
        const lastDay = parsed.days[parsed.days.length - 1];

        if (firstDay && lastDay) {
          const trip = await createTrip({
            title: parsed.title || 'Imported Trip',
            destination: 'Imported Destination',
            startDate: firstDay.date,
            endDate: lastDay.date,
          });

          // Update the newly created trip with the parsed itinerary
          await updateTrip(trip.id, { itinerary: parsed });
          setIsImportOpen(false);
          return;
        }
      }

      // Replace the itinerary in the active trip
      await replaceItinerary(parsed);
      setIsImportOpen(false);
    } else {
      throw new Error("Parse failed");
    }
  }, [activeTrip, createTrip, updateTrip, replaceItinerary]);

  const handleSwitchToDay = useCallback((dayId: string) => {
    setActiveDayId(dayId);
    useUIStore.getState().setViewMode('day');
  }, [setActiveDayId]);

  const handleCreateTrip = useCallback(async (title: string, destination: string, startDate: string, endDate: string) => {
    const input: CreateTripInput = {
      title,
      destination,
      startDate,
      endDate,
    };
    await createTrip(input);
    useUIStore.getState().setViewMode('day');
  }, [createTrip]);

  const handleSelectTrip = useCallback((tripId: TripId) => {
    setActiveTrip(tripId);
    // Restore the last viewed mode for this trip, or default to 'day'
    const savedView = getTripViewMode(tripId);
    setViewMode(savedView || 'day');
  }, [setActiveTrip, getTripViewMode, setViewMode]);

  // Trip action handlers
  const handleTripEdit = useCallback((tripId: TripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      setEditingTrip(trip);
    }
  }, [trips]);

  const handleTripSave = useCallback(async (tripId: string, updates: Partial<Trip>) => {
    await updateTrip(tripId as TripId, updates);
  }, [updateTrip]);

  const handleTripDuplicate = useCallback(async (tripId: TripId) => {
    try {
      const newTrip = await duplicateTrip(tripId);
      // Select the new trip
      setActiveTrip(newTrip.id);
      setViewMode('day');
    } catch (error) {
      console.error('Failed to duplicate trip:', error);
    }
  }, [duplicateTrip, setActiveTrip, setViewMode]);

  const handleTripArchive = useCallback(async (tripId: TripId) => {
    try {
      await archiveTrip(tripId);
    } catch (error) {
      console.error('Failed to archive trip:', error);
    }
  }, [archiveTrip]);

  const handleTripUnarchive = useCallback(async (tripId: TripId) => {
    try {
      await unarchiveTrip(tripId);
    } catch (error) {
      console.error('Failed to unarchive trip:', error);
    }
  }, [unarchiveTrip]);

  const handleTripExport = useCallback((tripId: TripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      setExportingTrip(trip);
    }
  }, [trips]);

  const handleTripDelete = useCallback(async (tripId: TripId) => {
    try {
      await deleteTrip(tripId);
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  }, [deleteTrip]);

  const handleDaySelectFromCountry = useCallback((dayId: string) => {
    // Switch to day view and select the specific day
    setActiveDayId(dayId);
    useUIStore.getState().setViewMode('day');
  }, [setActiveDayId]);

  const handleDayHoverFromCountry = useCallback((dayId: string | null) => {
    // Update hovered day for map highlighting
    setHoveredDayId(dayId);
  }, [setHoveredDayId]);

  const handleCountrySelect = useCallback((countryCode: string) => {
    // Find all days for this country and set the first one as active
    // This effectively zooms the map to show that country's activities
    if (activeTrip) {
      const countryDays = activeTrip.itinerary.days.filter(day => {
        // Check if any activity in this day is in the selected country
        return day.activities.some(activity => {
          const address = activity.location.address || '';
          // Simple country detection - could be enhanced
          return address.toLowerCase().includes(countryCode.toLowerCase()) ||
                 (countryCode === 'IE' && address.toLowerCase().includes('ireland')) ||
                 (countryCode === 'GB' && (address.toLowerCase().includes('united kingdom') || address.toLowerCase().includes('england') || address.toLowerCase().includes('scotland') || address.toLowerCase().includes('wales'))) ||
                 (countryCode === 'US' && address.toLowerCase().includes('united states'));
        });
      });

      // If we found matching days, select the first one to zoom the map
      if (countryDays.length > 0) {
        setActiveDayId(countryDays[0].id);
      }
    }
  }, [activeTrip, setActiveDayId]);

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Loading trips...</p>
          </div>
        </div>
      );
    }

    if (!activeTrip) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✈️</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              No Active Trip
            </h2>
            <p className="text-slate-500 mb-6">
              Create your first trip to start planning your next adventure!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setIsCreateTripOpen(true)}
                className="btn-press px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold rounded-xl transition-all"
              >
                Create New Trip
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="btn-press px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white border-b-4 border-emerald-700 font-bold rounded-xl transition-all"
              >
                Import Itinerary
              </button>
              {trips.length > 0 && (
                <button
                  onClick={() => setViewMode('trips')}
                  className="btn-press px-6 py-3 bg-slate-500 hover:bg-slate-400 text-white border-b-4 border-slate-700 font-bold rounded-xl transition-all"
                >
                  Load Existing Trip ({trips.length})
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    switch (viewMode) {
      case 'country':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading country overview..." />}>
            <ErrorBoundary>
              <CountryOverview
                trip={activeTrip}
                days={activeTrip.itinerary.days}
                onDaySelect={handleDaySelectFromCountry}
                onDayHover={handleDayHoverFromCountry}
                onCountrySelect={handleCountrySelect}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case 'overview':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading overview..." />}>
            <ErrorBoundary>
              <TripOverview
                days={activeTrip.itinerary.days}
                trip={activeTrip}
                onDaySelect={handleSwitchToDay}
                onDayHover={setHoveredDayId}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case 'travel':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading travel view..." />}>
            <ErrorBoundary>
              <TravelView
                days={activeTrip.itinerary.days}
                onDaySelect={handleSwitchToDay}
                onLegHover={setHoveredLeg}
                onUpdateActivity={updateActivity}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case 'day':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading itinerary..." />}>
            <ErrorBoundary>
              <ItineraryView
                days={activeTrip.itinerary.days}
                activeDayId={activeDayId}
                onDaySelect={setActiveDayId}
                onDeleteActivity={deleteActivity}
                onUpdateActivity={updateActivity}
                hoveredActivityId={hoveredActivityId}
                selectedActivityId={selectedActivityId}
                onActivityHover={setHoveredActivity}
                onActivitySelect={setSelectedActivity}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case 'today':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading today's activities..." />}>
            <ErrorBoundary>
              <TodayView />
            </ErrorBoundary>
          </Suspense>
        );
      case 'trips':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading trips..." />}>
            <ErrorBoundary>
              <TripList
                trips={getTripSummaries()}
                activeTripId={activeTripId}
                onTripSelect={handleSelectTrip}
                onTripCreate={handleCreateTrip}
                onTripEdit={handleTripEdit}
                onTripDuplicate={handleTripDuplicate}
                onTripArchive={handleTripArchive}
                onTripUnarchive={handleTripUnarchive}
                onTripExport={handleTripExport}
                onTripDelete={handleTripDelete}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case 'planner':
        return (
          <Suspense fallback={<LoadingSpinner message="Loading planner..." />}>
            <ErrorBoundary>
              <PlannerView tripId={activeTripId!} />
            </ErrorBoundary>
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell onImportClick={() => setIsImportOpen(true)}>
      {viewMode === 'planner' ? (
        // Full-width layout for planner view
        <div className="h-full">
          {renderView()}
        </div>
      ) : (
        <div className="flex h-full">
          {/* Left: View Content */}
          <div className="w-full md:w-[480px] flex-shrink-0 h-full bg-white md:border-r-2 md:border-slate-200">
            {renderView()}
          </div>

          {/* Right: Map */}
          <div className="hidden md:flex flex-1 h-full relative">
            {activeTrip && (
              <MapView
                itinerary={activeTrip.itinerary}
                activeDayId={activeDayId}
                viewMode={viewMode === 'day' || viewMode === 'overview' || viewMode === 'travel' ? viewMode : 'day'}
                hoveredActivityId={hoveredActivityId}
                selectedActivityId={selectedActivityId}
                hoveredDayId={hoveredDayId}
                hoveredLeg={hoveredLeg}
                onMarkerHover={setHoveredActivity}
                onMarkerClick={setSelectedActivity}
              />
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <Suspense fallback={null}>
        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImport={handleImport}
        />
      </Suspense>

      {/* Export Modal */}
      <Suspense fallback={null}>
        {exportingTrip && (
          <ExportModal
            isOpen={!!exportingTrip}
            onClose={() => setExportingTrip(null)}
            trip={exportingTrip}
          />
        )}
      </Suspense>

      {/* Trip Settings Modal */}
      <TripSettingsModal
        isOpen={editingTrip !== null}
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSave={handleTripSave}
      />

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onCreate={handleCreateTrip}
      />

      {/* Global Chat - Available Anytime */}
      <ErrorBoundary
        fallback={
          <button
            onClick={toggleChat}
            className="fixed bottom-6 right-6 w-14 h-14 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl z-50"
            title="Chat error - Click to retry"
          >
            ⚠️
          </button>
        }
      >
        <FloatingChatButton
          onClick={toggleChat}
          isOpen={isChatOpen}
        />
      </ErrorBoundary>

      <ErrorBoundary
        fallback={
          isChatOpen ? (
            <div className="fixed bottom-24 right-6 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border-2 border-red-200 z-50 flex items-center justify-center">
              <div className="text-center p-4">
                <span className="text-4xl mb-2 block">⚠️</span>
                <p className="text-sm text-slate-600">Chat encountered an error.</p>
                <button
                  onClick={toggleChat}
                  className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null
        }
      >
        <ChatAssistant
          messages={messages}
          onSendMessage={sendMessage}
          onConfirmAction={confirmAction}
          onCancelAction={cancelAction}
          isLoading={isChatLoading}
          hasActiveTrip={!!activeTrip}
          activeTripTitle={activeTrip?.title}
          mode={chatMode}
          onModeChange={setChatMode}
          onClose={toggleChat}
          isVisible={isChatOpen}
        />
      </ErrorBoundary>
    </AppShell>
  );
};

export default App;
