import { useState } from 'react';
import { Briefcase, Plus, Search, Archive } from 'lucide-react';
import { TripCard } from './TripCard';
import { CreateTripModal } from './CreateTripModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { TripSummary, TripId } from '@/types';

interface TripListProps {
  trips: TripSummary[];
  activeTripId: TripId | null;
  onTripSelect: (tripId: TripId) => void;
  onTripCreate: (title: string, destination: string, startDate: string, endDate: string) => void;
  onTripEdit?: (tripId: TripId) => void;
  onTripDuplicate?: (tripId: TripId) => void;
  onTripArchive?: (tripId: TripId) => void;
  onTripUnarchive?: (tripId: TripId) => void;
  onTripExport?: (tripId: TripId) => void;
  onTripDelete?: (tripId: TripId) => void;
}

export function TripList({
  trips,
  activeTripId,
  onTripSelect,
  onTripCreate,
  onTripEdit,
  onTripDuplicate,
  onTripArchive,
  onTripUnarchive,
  onTripExport,
  onTripDelete,
}: TripListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; trip: TripSummary | null; isLoading: boolean }>({
    isOpen: false,
    trip: null,
    isLoading: false,
  });

  const handleDeleteClick = (tripId: TripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      setDeleteConfirm({ isOpen: true, trip, isLoading: false });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.trip || !onTripDelete) return;

    setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await onTripDelete(deleteConfirm.trip.id);
      setDeleteConfirm({ isOpen: false, trip: null, isLoading: false });
    } catch (error) {
      console.error('Failed to delete trip:', error);
      setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, trip: null, isLoading: false });
  };

  const filteredTrips = trips.filter(trip =>
    trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const planningTrips = filteredTrips.filter(t => t.status === 'planning');
  const upcomingTrips = filteredTrips.filter(t => t.status === 'upcoming');
  const activeTrips = filteredTrips.filter(t => t.status === 'active');
  const completedTrips = filteredTrips.filter(t => t.status === 'completed');
  const archivedTrips = filteredTrips.filter(t => t.status === 'archived');

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="p-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-slate-700 flex items-center gap-3 uppercase tracking-wider text-sm">
            <Briefcase className="w-5 h-5 text-blue-500" />
            All Trips
          </h2>
          <button
            data-testid="create-trip-button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-press flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold text-sm rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trips by name or destination..."
              className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Empty State */}
        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Briefcase className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 mb-2">
              No Trips Yet
            </h3>
            <p className="text-slate-500 mb-6 max-w-md">
              Start planning your next adventure by creating your first trip!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-press px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold rounded-xl transition-all"
            >
              Create Your First Trip
            </button>
          </div>
        )}

        {/* No Search Results */}
        {trips.length > 0 && filteredTrips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              No trips found
            </h3>
            <p className="text-slate-500">
              Try adjusting your search terms
            </p>
          </div>
        )}

        {/* Trip Lists */}
        {filteredTrips.length > 0 && (
          <div className="space-y-8">
            {/* Active Trips */}
            {activeTrips.length > 0 && (
              <section>
                <h3 className="section-header mb-3 text-green-600">
                  Active Trips
                </h3>
                <div className="space-y-3">
                  {activeTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isActive={trip.id === activeTripId}
                      onClick={() => onTripSelect(trip.id)}
                      onEdit={onTripEdit}
                      onDuplicate={onTripDuplicate}
                      onArchive={onTripArchive}
                      onExport={onTripExport}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Planning Trips */}
            {planningTrips.length > 0 && (
              <section>
                <h3 className="section-header mb-3 text-purple-600">
                  Planning
                </h3>
                <div className="space-y-3">
                  {planningTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isActive={trip.id === activeTripId}
                      onClick={() => onTripSelect(trip.id)}
                      onEdit={onTripEdit}
                      onDuplicate={onTripDuplicate}
                      onArchive={onTripArchive}
                      onExport={onTripExport}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <section>
                <h3 className="section-header mb-3 text-blue-600">
                  Upcoming Trips
                </h3>
                <div className="space-y-3">
                  {upcomingTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isActive={trip.id === activeTripId}
                      onClick={() => onTripSelect(trip.id)}
                      onEdit={onTripEdit}
                      onDuplicate={onTripDuplicate}
                      onArchive={onTripArchive}
                      onExport={onTripExport}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Trips */}
            {completedTrips.length > 0 && (
              <section>
                <h3 className="section-header mb-3 text-slate-400">
                  Completed Trips
                </h3>
                <div className="space-y-3">
                  {completedTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isActive={trip.id === activeTripId}
                      onClick={() => onTripSelect(trip.id)}
                      onEdit={onTripEdit}
                      onDuplicate={onTripDuplicate}
                      onArchive={onTripArchive}
                      onExport={onTripExport}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Archived Trips */}
            {archivedTrips.length > 0 && (
              <section>
                <h3 className="section-header mb-3 text-amber-600 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived Trips
                </h3>
                <div className="space-y-3">
                  {archivedTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isActive={trip.id === activeTripId}
                      onClick={() => onTripSelect(trip.id)}
                      onEdit={onTripEdit}
                      onDuplicate={onTripDuplicate}
                      onUnarchive={onTripUnarchive}
                      onExport={onTripExport}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={onTripCreate}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Trip"
        message="Are you sure you want to delete"
        itemName={deleteConfirm.trip?.title}
        confirmText="Delete Trip"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  );
}
