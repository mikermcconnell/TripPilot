import { getDB } from './index';
import type { Trip, TripId, TripStatus } from '@/types';

/**
 * Trip Repository - CRUD operations for trips in IndexedDB
 */
export class TripRepository {
  /**
   * Get all trips
   */
  async getAll(): Promise<Trip[]> {
    const db = await getDB();
    return db.getAll('trips');
  }

  /**
   * Get trip by ID
   */
  async getById(id: TripId): Promise<Trip | undefined> {
    const db = await getDB();
    return db.get('trips', id);
  }

  /**
   * Get trips by status
   */
  async getByStatus(status: TripStatus): Promise<Trip[]> {
    const db = await getDB();
    return db.getAllFromIndex('trips', 'by-status', status);
  }

  /**
   * Get active trip (if any)
   */
  async getActive(): Promise<Trip | undefined> {
    const db = await getDB();
    const activeTrips = await db.getAllFromIndex('trips', 'by-status', 'active');
    return activeTrips[0];
  }

  /**
   * Create a new trip
   */
  async create(trip: Trip): Promise<void> {
    const db = await getDB();
    await db.add('trips', trip);
  }

  /**
   * Update an existing trip
   */
  async update(id: TripId, updates: Partial<Trip>): Promise<void> {
    const db = await getDB();
    const existing = await db.get('trips', id);

    if (!existing) {
      throw new Error(`Trip ${id} not found`);
    }

    const updated: Trip = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('trips', updated);
  }

  /**
   * Delete a trip
   */
  async delete(id: TripId): Promise<void> {
    const db = await getDB();

    // Use transaction to delete trip and related data
    const tx = db.transaction(['trips', 'expenses', 'photos', 'photoBlobs', 'packingLists'], 'readwrite');

    // Delete the trip
    await tx.objectStore('trips').delete(id);

    // Delete related expenses
    const expenses = await tx.objectStore('expenses').index('by-trip').getAll(id);
    for (const expense of expenses) {
      await tx.objectStore('expenses').delete(expense.id);
    }

    // Delete related photos and blobs
    const photos = await tx.objectStore('photos').index('by-trip').getAll(id);
    for (const photo of photos) {
      await tx.objectStore('photoBlobs').delete(photo.blobKey);
      await tx.objectStore('photoBlobs').delete(photo.thumbnailBlobKey);
      await tx.objectStore('photos').delete(photo.id);
    }

    // Delete packing list
    await tx.objectStore('packingLists').delete(id);

    await tx.done;
  }

  /**
   * Search trips by title or destination
   */
  async search(query: string): Promise<Trip[]> {
    const allTrips = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return allTrips.filter(
      trip =>
        trip.title.toLowerCase().includes(lowerQuery) ||
        trip.destination.name.toLowerCase().includes(lowerQuery) ||
        trip.destination.country.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get trips ordered by last accessed (most recent first)
   */
  async getRecent(limit: number = 10): Promise<Trip[]> {
    const allTrips = await this.getAll();
    return allTrips
      .sort((a, b) => {
        const dateA = new Date(a.lastAccessedAt).getTime();
        const dateB = new Date(b.lastAccessedAt).getTime();
        return dateB - dateA; // Descending order
      })
      .slice(0, limit);
  }

  /**
   * Update last accessed timestamp
   */
  async touch(id: TripId): Promise<void> {
    await this.update(id, {
      lastAccessedAt: new Date().toISOString(),
    });
  }

  /**
   * Upsert a trip (create or update)
   * Used for sync operations
   */
  async upsert(trip: Trip): Promise<void> {
    const db = await getDB();
    await db.put('trips', trip);
  }

  /**
   * Get all local-only trips (not synced to cloud)
   * Used for syncing when user signs in
   */
  async getLocalOnly(): Promise<Trip[]> {
    const allTrips = await this.getAll();
    return allTrips.filter(trip => trip.isLocalOnly === true);
  }

  /**
   * Mark a trip as synced (no longer local-only)
   */
  async markAsSynced(id: TripId): Promise<void> {
    const db = await getDB();
    const existing = await db.get('trips', id);

    if (!existing) {
      throw new Error(`Trip ${id} not found`);
    }

    const updated: Trip = {
      ...existing,
      isLocalOnly: false,
      updatedAt: new Date().toISOString(),
    };

    await db.put('trips', updated);
  }

  /**
   * Clear all local trips (after successful sync or logout)
   */
  async clearLocalTrips(): Promise<void> {
    const localTrips = await this.getLocalOnly();
    for (const trip of localTrips) {
      await this.delete(trip.id);
    }
  }
}

// Export singleton instance
export const tripRepository = new TripRepository();
