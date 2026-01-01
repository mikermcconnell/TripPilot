import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  Trip,
  TripId,
  Expense,
  ExpenseId,
  TripPhoto,
  PhotoId,
  ActivityId,
  PackingList,
  TripStatus,
} from '@/types';
import type { MapsCacheEntry, DayTravelMatrix } from '@/types/maps';

/**
 * IndexedDB Schema for TripPilot
 */
export interface TripPilotDB extends DBSchema {
  trips: {
    key: TripId;
    value: Trip;
    indexes: {
      'by-status': TripStatus;
      'by-start-date': string;
      'by-updated': string;
    };
  };

  expenses: {
    key: ExpenseId;
    value: Expense;
    indexes: {
      'by-trip': TripId;
      'by-date': string;
    };
  };

  photos: {
    key: PhotoId;
    value: TripPhoto;
    indexes: {
      'by-trip': TripId;
      'by-activity': ActivityId;
    };
  };

  photoBlobs: {
    key: string;              // blobKey
    value: Blob;
  };

  packingLists: {
    key: TripId;
    value: PackingList;
  };

  cache: {
    key: string;              // Cache key (e.g., 'exchange_rates')
    value: {
      data: unknown;
      expiresAt: string;
    };
  };

  mapsCache: {
    key: string;              // Cache key
    value: MapsCacheEntry;
    indexes: {
      'by-type': string;      // 'directions' | 'place_details' | etc.
      'by-expires': string;   // For cleanup
    };
  };

  dayTravelMatrices: {
    key: string;              // `${tripId}_${dayId}`
    value: DayTravelMatrix;
    indexes: {
      'by-trip': string;
    };
  };
}

const DB_NAME = 'trippilot';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<TripPilotDB> | null = null;

/**
 * Initialize IndexedDB with all object stores and indexes
 */
export async function initDB(): Promise<IDBPDatabase<TripPilotDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<TripPilotDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, _transaction) {
        // Trips store
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
          tripStore.createIndex('by-status', 'status');
          tripStore.createIndex('by-start-date', 'startDate');
          tripStore.createIndex('by-updated', 'updatedAt');
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('by-trip', 'tripId');
          expenseStore.createIndex('by-date', 'date');
        }

        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('by-trip', 'tripId');
          photoStore.createIndex('by-activity', 'activityId');
        }

        // Photo blobs store
        if (!db.objectStoreNames.contains('photoBlobs')) {
          db.createObjectStore('photoBlobs');
        }

        // Packing lists store
        if (!db.objectStoreNames.contains('packingLists')) {
          db.createObjectStore('packingLists', { keyPath: 'tripId' });
        }

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }

        // Version 2: Add maps cache stores
        if (oldVersion < 2) {
          // Maps cache store
          if (!db.objectStoreNames.contains('mapsCache')) {
            const mapsCacheStore = db.createObjectStore('mapsCache', { keyPath: 'key' });
            mapsCacheStore.createIndex('by-type', 'type');
            mapsCacheStore.createIndex('by-expires', 'expiresAt');
          }

          // Day travel matrices store
          if (!db.objectStoreNames.contains('dayTravelMatrices')) {
            const matricesStore = db.createObjectStore('dayTravelMatrices', { keyPath: 'key' });
            matricesStore.createIndex('by-trip', 'tripId');
          }
        }
      },
      blocked() {
        console.warn('IndexedDB upgrade blocked by another tab');
      },
      blocking() {
        console.warn('IndexedDB version change blocked');
        // Close the database to allow upgrade
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      },
      terminated() {
        console.error('IndexedDB connection terminated unexpectedly');
        dbInstance = null;
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw new Error('Database initialization failed');
  }
}

/**
 * Get the database instance (will initialize if needed)
 */
export async function getDB(): Promise<IDBPDatabase<TripPilotDB>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Clear all data from the database (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(
    ['trips', 'expenses', 'photos', 'photoBlobs', 'packingLists', 'cache', 'mapsCache', 'dayTravelMatrices'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('trips').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('photoBlobs').clear(),
    tx.objectStore('packingLists').clear(),
    tx.objectStore('cache').clear(),
    tx.objectStore('mapsCache').clear(),
    tx.objectStore('dayTravelMatrices').clear(),
  ]);

  await tx.done;
}
