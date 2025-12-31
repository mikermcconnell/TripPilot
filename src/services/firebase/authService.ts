import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import type { UserProfile } from '@/types/auth';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  async signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    await this.createOrUpdateUserProfile(result.user);
    return result.user;
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
