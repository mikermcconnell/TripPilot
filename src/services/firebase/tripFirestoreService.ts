import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Trip, TripId } from '@/types';

// Firestore collection reference
const tripsCollection = collection(db, 'trips');

// Convert Firestore timestamps to ISO strings
function convertTimestamps<T extends Record<string, unknown>>(data: T): T {
  const converted = { ...data };
  for (const key in converted) {
    const value = converted[key];
    if (value instanceof Timestamp) {
      (converted as Record<string, unknown>)[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (converted as Record<string, unknown>)[key] = convertTimestamps(value as Record<string, unknown>);
    }
  }
  return converted;
}

// Remove undefined values recursively (Firebase doesn't accept undefined)
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Prepare trip data for Firestore (add userId, convert dates, remove undefined)
function prepareForFirestore(trip: Trip, userId: string) {
  return {
    ...removeUndefined(trip),
    userId,
    updatedAt: serverTimestamp(),
  };
}

export const tripFirestoreService = {
  /**
   * Create a new trip in Firestore
   */
  async create(trip: Trip, userId: string): Promise<void> {
    const tripRef = doc(tripsCollection, trip.id);
    await setDoc(tripRef, prepareForFirestore(trip, userId));
  },

  /**
   * Get a single trip by ID
   */
  async get(tripId: TripId, userId: string): Promise<Trip | null> {
    const tripRef = doc(tripsCollection, tripId);
    const snapshot = await getDoc(tripRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    if (data.userId !== userId) return null; // Security check

    return convertTimestamps(data) as Trip;
  },

  /**
   * Get all trips for a user
   */
  async getAll(userId: string): Promise<Trip[]> {
    const q = query(
      tripsCollection,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertTimestamps(doc.data()) as Trip);
  },

  /**
   * Update a trip
   */
  async update(tripId: TripId, updates: Partial<Trip>, userId: string): Promise<void> {
    const tripRef = doc(tripsCollection, tripId);

    // Verify ownership before updating
    const existing = await getDoc(tripRef);
    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Trip not found or access denied');
    }

    await updateDoc(tripRef, {
      ...removeUndefined(updates),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Delete a trip
   */
  async delete(tripId: TripId, userId: string): Promise<void> {
    const tripRef = doc(tripsCollection, tripId);

    // Verify ownership before deleting
    const existing = await getDoc(tripRef);
    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Trip not found or access denied');
    }

    await deleteDoc(tripRef);
  },

  /**
   * Subscribe to real-time updates for user's trips
   * Returns unsubscribe function
   */
  subscribeToTrips(
    userId: string,
    onUpdate: (trips: Trip[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      tripsCollection,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const trips = snapshot.docs.map(doc => convertTimestamps(doc.data()) as Trip);
        onUpdate(trips);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        onError?.(error);
      }
    );
  },

  /**
   * Subscribe to a single trip's updates
   */
  subscribeToTrip(
    tripId: TripId,
    userId: string,
    onUpdate: (trip: Trip | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const tripRef = doc(tripsCollection, tripId);

    return onSnapshot(
      tripRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }

        const data = snapshot.data();
        if (data.userId !== userId) {
          onUpdate(null);
          return;
        }

        onUpdate(convertTimestamps(data) as Trip);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        onError?.(error);
      }
    );
  },
};
