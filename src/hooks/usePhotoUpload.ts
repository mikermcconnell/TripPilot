import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useAuthStore } from '@/stores/authStore';
import { storageService, UploadProgress } from '@/services/firebase/storageService';
import { photoRepository } from '@/services/db/photoRepository';
import type { TripPhoto, TripId, PhotoId, ActivityId } from '@/types';

interface UsePhotoUploadOptions {
  tripId: TripId;
  activityId?: ActivityId;
  dayNumber?: number;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function usePhotoUpload({ tripId, activityId, dayNumber }: UsePhotoUploadOptions) {
  const { user } = useAuthStore();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const uploadPhoto = useCallback(
    async (file: File, caption?: string): Promise<TripPhoto | null> => {
      if (!user) {
        setUploadState({ isUploading: false, progress: 0, error: 'Must be signed in to upload' });
        return null;
      }

      setUploadState({ isUploading: true, progress: 0, error: null });

      try {
        const photoId = nanoid() as PhotoId;
        const now = new Date().toISOString();

        // Create thumbnail
        const thumbnail = await createThumbnail(file);

        // Get image dimensions
        const dimensions = await getImageDimensions(file);

        // Upload to cloud storage
        const handleProgress = (p: UploadProgress) => {
          setUploadState(prev => ({ ...prev, progress: p.progress }));
        };

        const { promise: uploadPromise } = storageService.uploadPhoto(
          user.uid,
          tripId,
          photoId,
          file,
          handleProgress
        );

        const [photoResult, thumbnailResult] = await Promise.all([
          uploadPromise,
          storageService.uploadThumbnail(user.uid, tripId, photoId, thumbnail),
        ]);

        // Create photo metadata
        const photo: TripPhoto = {
          id: photoId,
          tripId,
          activityId,
          dayNumber,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          width: dimensions.width,
          height: dimensions.height,
          blobKey: `local-${photoId}`, // Local blob key
          thumbnailBlobKey: `local-thumb-${photoId}`,
          caption,
          createdAt: now,
          updatedAt: now,
          // Cloud storage paths
          cloudStoragePath: photoResult.storagePath,
          cloudDownloadUrl: photoResult.downloadUrl,
          thumbnailStoragePath: thumbnailResult.storagePath,
          thumbnailDownloadUrl: thumbnailResult.downloadUrl,
          syncStatus: 'synced',
        } as TripPhoto & {
          cloudStoragePath?: string;
          cloudDownloadUrl?: string;
          thumbnailStoragePath?: string;
          thumbnailDownloadUrl?: string;
          syncStatus?: 'pending' | 'synced' | 'error';
        };

        // Save to local storage (with blobs for offline access)
        await photoRepository.save(photo, file, thumbnail);

        setUploadState({ isUploading: false, progress: 100, error: null });
        return photo;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setUploadState({ isUploading: false, progress: 0, error: message });
        return null;
      }
    },
    [user, tripId, activityId, dayNumber]
  );

  const uploadMultiple = useCallback(
    async (files: FileList | File[]): Promise<TripPhoto[]> => {
      const photos: TripPhoto[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const photo = await uploadPhoto(file);
        if (photo) {
          photos.push(photo);
        }
      }

      return photos;
    },
    [uploadPhoto]
  );

  return {
    uploadPhoto,
    uploadMultiple,
    ...uploadState,
  };
}

/**
 * Create a thumbnail from an image file
 */
async function createThumbnail(file: File, maxSize = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate thumbnail dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get image dimensions
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
