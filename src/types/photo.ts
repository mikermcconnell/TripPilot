import { TripId, ActivityId, PhotoId } from './trip';
import { GeoCoordinates } from './itinerary';

export type PhotoSyncStatus = 'pending' | 'uploading' | 'synced' | 'error';

export interface TripPhoto {
  id: PhotoId;
  tripId: TripId;
  activityId?: ActivityId;
  dayNumber?: number;

  // File info
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;

  // Local Storage (IndexedDB)
  blobKey: string;            // IndexedDB blob reference
  thumbnailBlobKey: string;

  // Cloud Storage (Firebase)
  cloudStoragePath?: string;
  cloudDownloadUrl?: string;
  thumbnailStoragePath?: string;
  thumbnailDownloadUrl?: string;
  syncStatus: PhotoSyncStatus;

  // Metadata
  caption?: string;
  location?: GeoCoordinates;
  takenAt?: string;           // EXIF date or user-set

  createdAt: string;
  updatedAt: string;
}

export interface PhotoUploadInput {
  file: File;
  tripId: TripId;
  activityId?: ActivityId;
  caption?: string;
}
