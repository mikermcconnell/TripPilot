import {
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import type { UserProfile } from '@/types/auth';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  async signInWithGoogle(): Promise<void> {
    // Try popup first, fall back to redirect if COOP issues
    try {
      console.log('Attempting Google sign-in with popup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Popup sign-in result:', result?.user?.email);
      if (result?.user) {
        console.log('Creating/updating user profile...');
        await this.createOrUpdateUserProfile(result.user);
        console.log('User profile created/updated successfully');
      }
    } catch (error: any) {
      console.log('Popup sign-in error:', error.code, error.message);
      // If popup blocked or COOP issue, use redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        console.log('Falling back to redirect sign-in...');
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw error;
      }
    }
  },

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(result.user, { displayName });

    // Create user profile in Firestore
    await this.createOrUpdateUserProfile(result.user);

    return result.user;
  },

  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async handleRedirectResult(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        await this.createOrUpdateUserProfile(result.user);
        return result.user;
      }
      return null;
    } catch (error) {
      console.error('Error handling redirect result:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  async createOrUpdateUserProfile(user: User): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const profile: Omit<UserProfile, 'uid'> = {
        email: user.email || '',
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          defaultCurrency: 'USD',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notifications: true,
        },
      };
      await setDoc(userRef, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
      await setDoc(userRef, { displayName: user.displayName, photoURL: user.photoURL, updatedAt: serverTimestamp() }, { merge: true });
    }
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    return { uid, ...userSnap.data() } as UserProfile;
  },

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },
};
