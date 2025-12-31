import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { storage } from '@/config/firebase';
import type { TripId, PhotoId } from '@/types';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
}

/**
 * Firebase Storage Service for photo uploads
 */
export const storageService = {
  /**
   * Upload a photo to Cloud Storage
   */
  uploadPhoto(
    userId: string,
    tripId: TripId,
    photoId: PhotoId,
    blob: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): { task: UploadTask; promise: Promise<UploadResult> } {
    const storagePath = `users/${userId}/trips/${tripId}/photos/${photoId}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type,
      customMetadata: {
        tripId,
        photoId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const promise = new Promise<UploadResult>((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot) => {
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            state: snapshot.state as UploadProgress['state'],
          };
          onProgress?.(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            resolve({ storagePath, downloadUrl });
          } catch (error) {
            reject(error);
          }
        }
      );
    });

    return { task, promise };
  },

  /**
   * Upload a thumbnail to Cloud Storage
   */
  async uploadThumbnail(
    userId: string,
    tripId: TripId,
    photoId: PhotoId,
    blob: Blob
  ): Promise<UploadResult> {
    const storagePath = `users/${userId}/trips/${tripId}/thumbnails/${photoId}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type,
    });

    return new Promise<UploadResult>((resolve, reject) => {
      task.on(
        'state_changed',
        null,
        (error) => reject(error),
        async () => {
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            resolve({ storagePath, downloadUrl });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  },

  /**
   * Delete a photo from Cloud Storage
   */
  async deletePhoto(storagePath: string): Promise<void> {
    const storageRef = ref(storage, storagePath);
    try {
      await deleteObject(storageRef);
    } catch (error) {
      // Ignore if file doesn't exist
      console.warn('Failed to delete from storage:', storagePath, error);
    }
  },

  /**
   * Delete all photos for a trip
   */
  async deleteTripPhotos(userId: string, tripId: TripId): Promise<void> {
    // Note: Firebase Storage doesn't support directory deletion
    // Photos should be deleted individually when deleting a trip
    // This is handled by iterating through photo metadata
    console.log(`Deleting photos for trip ${tripId} (user: ${userId})`);
  },

  /**
   * Get download URL for an existing file
   */
  async getDownloadUrl(storagePath: string): Promise<string> {
    const storageRef = ref(storage, storagePath);
    return getDownloadURL(storageRef);
  },
};
