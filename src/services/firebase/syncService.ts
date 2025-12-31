import { Unsubscribe } from 'firebase/firestore';
import { tripFirestoreService } from './tripFirestoreService';
import { tripRepository } from '@/services/db/tripRepository';
import { syncQueue } from '@/services/db/syncQueue';
import type { Trip } from '@/types';

/**
 * Sync Service
 * Manages bidirectional sync between IndexedDB and Firestore
 */
class SyncService {
  private unsubscribers: Unsubscribe[] = [];
  private isInitialized = false;
  private currentUserId: string | null = null;

  /**
   * Initialize sync for a user
   * - Downloads cloud trips to local
   * - Sets up real-time listeners
   * - Processes any pending sync queue items
   */
  async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      return;
    }

    // Clean up any existing subscriptions
    this.cleanup();

    this.currentUserId = userId;

    try {
      // 1. Fetch all cloud trips
      const cloudTrips = await tripFirestoreService.getAll(userId);
      const localTrips = await tripRepository.getAll();

      // 2. Merge cloud and local trips
      await this.mergeTrips(cloudTrips, localTrips, userId);

      // 3. Set up real-time listener for changes
      const unsubscribe = tripFirestoreService.subscribeToTrips(
        userId,
        async (trips) => {
          // Update local storage with changes from cloud
          await this.handleCloudUpdate(trips);
        },
        (error) => {
          console.error('Sync subscription error:', error);
        }
      );
      this.unsubscribers.push(unsubscribe);

      // 4. Recover any items stuck in 'syncing' state and process queue
      await syncQueue.recoverStuckItems();
      await syncQueue.processQueue();

      this.isInitialized = true;
      console.log('Sync service initialized for user:', userId);
    } catch (error) {
      console.error('Failed to initialize sync:', error);
      throw error;
    }
  }

  /**
   * Merge cloud and local trips
   * Strategy: Cloud wins for conflicts, but upload local-only trips
   */
  private async mergeTrips(
    cloudTrips: Trip[],
    localTrips: Trip[],
    userId: string
  ): Promise<void> {
    const cloudTripIds = new Set(cloudTrips.map(t => t.id));

    // Update local with cloud data
    for (const cloudTrip of cloudTrips) {
      await tripRepository.upsert(cloudTrip);
    }

    // Upload local-only trips to cloud
    for (const localTrip of localTrips) {
      if (!cloudTripIds.has(localTrip.id)) {
        try {
          await tripFirestoreService.create(localTrip, userId);
        } catch (error) {
          console.error('Failed to upload local trip:', localTrip.id, error);
        }
      }
    }

    // Remove local trips that were deleted from cloud
    // (Only if they exist locally and not in pending sync queue)
    const pendingCount = await syncQueue.getPendingCount();
    if (pendingCount === 0) {
      for (const localTrip of localTrips) {
        if (!cloudTripIds.has(localTrip.id)) {
          // This trip exists locally but not in cloud
          // Check if it was created locally and needs to be uploaded
          // or if it was deleted from cloud and needs to be removed locally
          // For now, we keep local trips and try to upload them
        }
      }
    }
  }

  /**
   * Handle updates from cloud
   */
  private async handleCloudUpdate(cloudTrips: Trip[]): Promise<void> {
    // Update local storage with cloud data
    for (const trip of cloudTrips) {
      await tripRepository.upsert(trip);
    }

    // Emit event for store to refresh
    window.dispatchEvent(new CustomEvent('trips-updated', { detail: { trips: cloudTrips } }));
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.isInitialized = false;
    this.currentUserId = null;
  }

  /**
   * Force sync all local trips to cloud
   */
  async forceSyncToCloud(userId: string): Promise<void> {
    const localTrips = await tripRepository.getAll();

    for (const trip of localTrips) {
      try {
        // Try to get existing trip
        const existing = await tripFirestoreService.get(trip.id, userId);

        if (existing) {
          // Update if local is newer
          if (new Date(trip.updatedAt) > new Date(existing.updatedAt)) {
            await tripFirestoreService.update(trip.id, trip, userId);
          }
        } else {
          // Create new
          await tripFirestoreService.create(trip, userId);
        }
      } catch (error) {
        console.error('Failed to sync trip:', trip.id, error);
      }
    }
  }

  /**
   * Check if sync is active
   */
  get isSyncing(): boolean {
    return this.isInitialized;
  }
}

export const syncService = new SyncService();
