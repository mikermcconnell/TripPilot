import { create } from 'zustand';
import type { SyncAction } from '@/types';
import { syncQueue } from '@/services/db/syncQueue';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  failedActions: number;
  lastSyncAt: string | null;

  // Actions
  setOnline: (online: boolean) => void;
  enqueueAction: (action: SyncAction, payload: unknown) => Promise<void>;
  processQueue: () => Promise<void>;
  clearCompletedActions: () => Promise<void>;
  retryFailedActions: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()((set, get) => ({
  // Initial state
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingActions: 0,
  failedActions: 0,
  lastSyncAt: null,

  // Set online status
  setOnline: (online) => {
    set({ isOnline: online });

    // If we just came online, recover stuck items and process the queue
    if (online) {
      void (async () => {
        await syncQueue.recoverStuckItems();
        await get().processQueue();
      })();
    }
  },

  // Enqueue a sync action
  enqueueAction: async (action, payload) => {
    await syncQueue.enqueue(action, payload);
    await get().refreshCounts();
  },

  // Process the sync queue
  processQueue: async () => {
    if (!get().isOnline || get().isSyncing) {
      return;
    }

    set({ isSyncing: true });

    try {
      await syncQueue.processQueue();
      set({ lastSyncAt: new Date().toISOString() });
    } finally {
      set({ isSyncing: false });
      await get().refreshCounts();
    }
  },

  // Clear completed actions
  clearCompletedActions: async () => {
    await syncQueue.clearCompleted();
    await get().refreshCounts();
  },

  // Retry failed actions
  retryFailedActions: async () => {
    await syncQueue.retryFailed();
    await get().refreshCounts();
  },

  // Refresh pending/failed counts
  refreshCounts: async () => {
    const [pendingCount, failedCount] = await Promise.all([
      syncQueue.getPendingCount(),
      syncQueue.getFailedCount(),
    ]);

    set({
      pendingActions: pendingCount,
      failedActions: failedCount,
    });
  },
}));

// Setup online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
  });
}
