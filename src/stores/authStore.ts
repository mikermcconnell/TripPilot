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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
    console.log('Initializing auth...');

    // Check for redirect result from Google Sign-In
    authService.handleRedirectResult().catch((error) => {
      console.error('Error processing redirect result:', error);
    });

    return authService.onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user ? user.email : 'signed out');

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
        // Create/update user profile in Firestore (for new sign-ups or first Google sign-in)
        try {
          await authService.createOrUpdateUserProfile(user);
        } catch (error) {
          console.error('Failed to create/update user profile:', error);
        }

        // Sync any local trips created in guest mode
        try {
          await useTripStore.getState().syncLocalTrips();
        } catch (error) {
          console.error('Failed to sync local trips:', error);
        }

        // Load trips initially
        try {
          await useTripStore.getState().loadTrips();
        } catch (error) {
          console.error('Failed to load trips:', error);
        }

        // Set up real-time listener for trip updates
        try {
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
        } catch (error) {
          console.error('Failed to set up trips subscription:', error);
        }
      } else {
        // Guest mode: load local trips from IndexedDB
        try {
          await useTripStore.getState().loadTrips();
        } catch (error) {
          console.error('Failed to load local trips:', error);
        }
      }
    });
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      // This will redirect away from the page
      await authService.signInWithGoogle();
      // Code below won't run due to redirect
    } catch (error: any) {
      console.error('Sign in with Google error:', error);
      set({
        error: error.message || 'Sign in with Google failed',
        isLoading: false
      });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.signInWithEmail(email, password);
    } catch (error: any) {
      let message = 'Sign in failed';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      }
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  signUpWithEmail: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.signUpWithEmail(email, password, displayName);
    } catch (error: any) {
      let message = 'Sign up failed';
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      }
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resetPassword(email);
    } catch (error: any) {
      let message = 'Password reset failed';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      }
      set({ error: message, isLoading: false });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
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
