import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (authUser) {
        const userDoc = doc(db, 'users', authUser.uid);
        
        try {
          // Initial setup for new users
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
            const newProfile = {
              userId: authUser.uid,
              username: authUser.email?.split('@')[0] || `user_${authUser.uid.slice(0, 5)}`,
              displayName: authUser.displayName || authUser.email?.split('@')[0],
              email: authUser.email,
              photoURL: authUser.photoURL || '',
              bio: '',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDoc, newProfile);
          }

          // Listen for real-time changes
          unsubscribeProfile = onSnapshot(userDoc, (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data());
            }
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
