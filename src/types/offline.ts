/**
 * Offline sync queue types for IndexedDB persistence
 */

export type SyncAction =
  | 'create_trip'
  | 'update_trip'
  | 'delete_trip'
  | 'add_activity'
  | 'update_activity'
  | 'delete_activity'
  | 'add_days'
  | 'modify_day'
  | 'add_expense'
  | 'update_expense'
  | 'delete_expense'
  | 'upload_photo'
  | 'reorder_activities'
  | 'move_activity'
  | 'reorder_days'
  | 'add_day'
  | 'remove_day';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export interface SyncQueueItem {
  id: string;
  action: SyncAction;
  payload: unknown;

  status: SyncStatus;
  retryCount: number;
  maxRetries: number;

  createdAt: string;
  lastAttemptAt?: string;
  completedAt?: string;

  error?: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
  pendingCount: number;
  failedCount: number;
}
