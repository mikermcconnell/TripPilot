import { getDB } from './index';
import type { TripPhoto, TripId, PhotoId, ActivityId } from '@/types';

/**
 * Photo Repository - CRUD operations for photos and blobs in IndexedDB
 */
export class PhotoRepository {
  /**
   * Get all photos for a trip
   */
  async getByTrip(tripId: TripId): Promise<TripPhoto[]> {
    const db = await getDB();
    return db.getAllFromIndex('photos', 'by-trip', tripId);
  }

  /**
   * Get all photos for an activity
   */
  async getByActivity(activityId: ActivityId): Promise<TripPhoto[]> {
    const db = await getDB();
    return db.getAllFromIndex('photos', 'by-activity', activityId);
  }

  /**
   * Get a single photo by ID
   */
  async getById(photoId: PhotoId): Promise<TripPhoto | undefined> {
    const db = await getDB();
    return db.get('photos', photoId);
  }

  /**
   * Save a photo with its blob data
   */
  async save(photo: TripPhoto, blob: Blob, thumbnail: Blob): Promise<void> {
    const db = await getDB();

    // Use transaction to ensure atomic write
    const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');

    // Store photo metadata
    await tx.objectStore('photos').put(photo);

    // Store full-size blob
    await tx.objectStore('photoBlobs').put(blob, photo.blobKey);

    // Store thumbnail blob
    await tx.objectStore('photoBlobs').put(thumbnail, photo.thumbnailBlobKey);

    await tx.done;
  }

  /**
   * Update photo metadata only (not the blobs)
   */
  async update(photoId: PhotoId, updates: Partial<TripPhoto>): Promise<void> {
    const db = await getDB();
    const existing = await db.get('photos', photoId);

    if (!existing) {
      throw new Error(`Photo ${photoId} not found`);
    }

    const updated: TripPhoto = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('photos', updated);
  }

  /**
   * Delete a photo and its blobs
   */
  async delete(photoId: PhotoId): Promise<void> {
    const db = await getDB();
    const photo = await db.get('photos', photoId);

    if (!photo) {
      return; // Already deleted
    }

    // Use transaction to ensure all are deleted
    const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');

    // Delete metadata
    await tx.objectStore('photos').delete(photoId);

    // Delete blobs
    await tx.objectStore('photoBlobs').delete(photo.blobKey);
    await tx.objectStore('photoBlobs').delete(photo.thumbnailBlobKey);

    await tx.done;
  }

  /**
   * Get the full-size blob for a photo
   */
  async getBlob(blobKey: string): Promise<Blob | undefined> {
    const db = await getDB();
    return db.get('photoBlobs', blobKey);
  }

  /**
   * Get the thumbnail blob for a photo
   */
  async getThumbnail(photoId: PhotoId): Promise<Blob | undefined> {
    const db = await getDB();
    const photo = await db.get('photos', photoId);

    if (!photo) {
      return undefined;
    }

    return db.get('photoBlobs', photo.thumbnailBlobKey);
  }

  /**
   * Get total storage size for a trip's photos
   */
  async getTripPhotoSize(tripId: TripId): Promise<number> {
    const photos = await this.getByTrip(tripId);
    return photos.reduce((total, photo) => total + photo.size, 0);
  }

  /**
   * Delete all photos for a trip (used when deleting a trip)
   */
  async deleteByTrip(tripId: TripId): Promise<void> {
    const photos = await this.getByTrip(tripId);

    const db = await getDB();
    const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');

    for (const photo of photos) {
      await tx.objectStore('photos').delete(photo.id);
      await tx.objectStore('photoBlobs').delete(photo.blobKey);
      await tx.objectStore('photoBlobs').delete(photo.thumbnailBlobKey);
    }

    await tx.done;
  }
}

// Export singleton instance
export const photoRepository = new PhotoRepository();
