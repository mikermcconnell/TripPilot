import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '@/services/firebase/authService';
import { tripFirestoreService } from '@/services/firebase/tripFirestoreService';
import { useTripStore } from './tripStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  _unsubscribeTrips: (() => void) | null;
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  _unsubscribeTrips: null,

  initialize: () => {
    // Handle redirect result on page load (for sign-in redirect flow)
    authService.handleRedirectResult().catch((error) => {
      console.error('Redirect result error:', error);
      set({ error: error instanceof Error ? error.message : 'Sign in failed' });
    });

    return authService.onAuthStateChange(async (user) => {
      // Cleanup previous listener if exists
      const currentUnsubscribe = get()._unsubscribeTrips;
      if (currentUnsubscribe) {
        currentUnsubscribe();
        set({ _unsubscribeTrips: null });
      }

      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });

      if (user) {
        // Load trips initially
        await useTripStore.getState().loadTrips();

        // Set up real-time listener for trip updates
        const unsubscribe = tripFirestoreService.subscribeToTrips(
          user.uid,
          (trips) => {
            const currentActiveTripId = useTripStore.getState().activeTripId;
            const activeTrip = trips.find(t => t.id === currentActiveTripId) || null;
            useTripStore.setState({ trips, activeTrip });
          },
          (error) => {
            console.error('Trips subscription error:', error);
          }
        );
        set({ _unsubscribeTrips: unsubscribe });
      } else {
        // Clear trips on logout
        useTripStore.setState({ trips: [], activeTrip: null, activeTripId: null });
      }
    });
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      // This will redirect to Google - the page will navigate away
      await authService.signInWithGoogle();
      // Note: We won't reach here normally as the page redirects
    } catch (error) {
      // Only reached if redirect fails to start
      set({
        error: error instanceof Error ? error.message : 'Sign in failed',
        isLoading: false
      });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      // Cleanup trips subscription before signing out
      const currentUnsubscribe = get()._unsubscribeTrips;
      if (currentUnsubscribe) {
        currentUnsubscribe();
        set({ _unsubscribeTrips: null });
      }
      await authService.signOut();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign out failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
