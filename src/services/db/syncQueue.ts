import { nanoid } from 'nanoid';
import { getDB } from './index';
import type { SyncQueueItem, SyncAction } from '@/types';
import { tripFirestoreService } from '@/services/firebase/tripFirestoreService';
import { auth } from '@/config/firebase';

/**
 * Offline Sync Queue
 * Manages queued actions for when the app goes offline
 */
export class SyncQueue {
  private isProcessing = false;

  /**
   * Add an action to the sync queue
   */
  async enqueue(action: SyncAction, payload: unknown): Promise<string> {
    const db = await getDB();

    const item: SyncQueueItem = {
      id: nanoid(),
      action,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };

    await db.add('syncQueue', item);

    // Trigger processing if online
    if (navigator.onLine) {
      // Don't await - process in background
      void this.processQueue();
    }

    return item.id;
  }

  /**
   * Process all pending items in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    try {
      const db = await getDB();
      const pending = await db.getAllFromIndex('syncQueue', 'by-status', 'pending');

      for (const item of pending) {
        await this.processItem(item);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    const db = await getDB();

    // Update status to syncing
    item.status = 'syncing';
    item.lastAttemptAt = new Date().toISOString();
    await db.put('syncQueue', item);

    try {
      // Execute the action
      await this.executeAction(item);

      // Mark as completed
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      await db.put('syncQueue', item);
    } catch (error) {
      // Handle failure
      item.retryCount++;

      if (item.retryCount >= item.maxRetries) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
      } else {
        // Reset to pending for retry
        item.status = 'pending';
      }

      await db.put('syncQueue', item);
    }
  }

  /**
   * Execute the actual sync action using Firebase
   */
  private async executeAction(item: SyncQueueItem): Promise<void> {
    // Only sync if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      // Keep in queue for later when user signs in
      throw new Error('User not authenticated');
    }

    const userId = user.uid;
    const payload = item.payload as Record<string, unknown>;

    switch (item.action) {
      case 'create_trip':
        await tripFirestoreService.create(payload.trip as import('@/types').Trip, userId);
        break;

      case 'update_trip':
        await tripFirestoreService.update(
          payload.tripId as import('@/types').TripId,
          payload.updates as Partial<import('@/types').Trip>,
          userId
        );
        break;

      case 'delete_trip':
        await tripFirestoreService.delete(
          payload.tripId as import('@/types').TripId,
          userId
        );
        break;

      case 'add_activity':
      case 'update_activity':
      case 'delete_activity':
        // Activities are embedded in trips, so update the whole trip
        // The trip store already handles this via updateTrip
        break;

      case 'add_expense':
      case 'update_expense':
      case 'delete_expense':
        // Future: expenses subcollection
        break;

      case 'upload_photo':
        // Handled by storage service
        break;

      default:
        console.warn(`Unknown sync action: ${item.action}`);
    }
  }

  /**
   * Get count of pending items (includes both 'pending' and 'syncing' status)
   */
  async getPendingCount(): Promise<number> {
    const db = await getDB();
    const [pending, syncing] = await Promise.all([
      db.getAllFromIndex('syncQueue', 'by-status', 'pending'),
      db.getAllFromIndex('syncQueue', 'by-status', 'syncing'),
    ]);
    return pending.length + syncing.length;
  }

  /**
   * Get count of failed items
   */
  async getFailedCount(): Promise<number> {
    const db = await getDB();
    const failed = await db.getAllFromIndex('syncQueue', 'by-status', 'failed');
    return failed.length;
  }

  /**
   * Clear all completed items from the queue
   */
  async clearCompleted(): Promise<void> {
    const db = await getDB();
    const completed = await db.getAllFromIndex('syncQueue', 'by-status', 'completed');

    const tx = db.transaction('syncQueue', 'readwrite');
    for (const item of completed) {
      await tx.store.delete(item.id);
    }
    await tx.done;
  }

  /**
   * Retry all failed items
   */
  async retryFailed(): Promise<void> {
    const db = await getDB();
    const failed = await db.getAllFromIndex('syncQueue', 'by-status', 'failed');

    const tx = db.transaction('syncQueue', 'readwrite');
    for (const item of failed) {
      item.status = 'pending';
      item.retryCount = 0;
      item.error = undefined;
      await tx.store.put(item);
    }
    await tx.done;

    // Trigger processing
    void this.processQueue();
  }

  /**
   * Clear all items from the queue (for testing/reset)
   */
  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('syncQueue');
  }

  /**
   * Recover any items stuck in 'syncing' status (e.g., after app restart)
   * Resets them to 'pending' so they can be retried
   */
  async recoverStuckItems(): Promise<void> {
    const db = await getDB();
    const syncing = await db.getAllFromIndex('syncQueue', 'by-status', 'syncing');

    if (syncing.length > 0) {
      const tx = db.transaction('syncQueue', 'readwrite');
      for (const item of syncing) {
        item.status = 'pending';
        await tx.store.put(item);
      }
      await tx.done;
      console.log(`Recovered ${syncing.length} stuck sync items`);
    }
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
