import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '@/services/firebase/authService';
import { syncService } from '@/services/firebase/syncService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  error: string | null;
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isSyncing: false,
  error: null,

  initialize: () => {
    return authService.onAuthStateChange(async (user) => {
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });

      // Initialize or cleanup sync based on auth state
      if (user) {
        set({ isSyncing: true });
        try {
          await syncService.initialize(user.uid);
        } catch (error) {
          console.error('Sync initialization failed:', error);
        } finally {
          set({ isSyncing: false });
        }
      } else {
        syncService.cleanup();
      }
    });
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign in failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await authService.signOut();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign out failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
