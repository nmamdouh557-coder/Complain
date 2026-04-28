import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isComplaintsTeam: boolean;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  isComplaintsTeam: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register the forbidden callback to handle stale sessions
    api.onForbidden(() => {
      console.warn('Forbidden access detected, logging out to refresh session.');
      logout();
    });

    // 1. Load local profile
    const savedUser = localStorage.getItem('cms_user');
    if (savedUser) {
      setProfile(JSON.parse(savedUser));
    }
    setLoading(false);

    // 2. Firebase Auth - Sign in anonymously to enable Firestore access
    // This provides a UID even if they haven't "logged in" to our CMS yet
    const initFirebase = async () => {
      try {
        let currentUid = auth.currentUser?.uid;
        if (!auth.currentUser) {
          try {
            const userCredential = await signInAnonymously(auth);
            currentUid = userCredential.user.uid;
          } catch (authError: any) {
            if (authError.code === 'auth/admin-restricted-operation') {
              console.warn("Firebase Anonymous Auth is disabled in the console. Real-time notifications may be limited until enabled or Google Sign-in is used.");
            } else {
              throw authError;
            }
          }
        }
        
        if (currentUid && savedUser) {
          syncProfileToFirestore(JSON.parse(savedUser), currentUid);
        }
      } catch (error) {
        console.error("Firebase auth initialization error:", error);
      }
    };
    initFirebase();
  }, []);

  const syncProfileToFirestore = async (p: UserProfile, firebaseUid: string) => {
    try {
      await setDoc(doc(db, 'users', firebaseUid), {
        uid: firebaseUid,
        username: p.username,
        role: p.role,
        branch: p.branch,
        brand: p.brand,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error syncing profile to Firestore:", error);
    }
  };

  const login = (userData: UserProfile) => {
    setProfile(userData);
    localStorage.setItem('cms_user', JSON.stringify(userData));
    if (auth.currentUser) {
      syncProfileToFirestore(userData, auth.currentUser.uid);
    }
  };

  const logout = useCallback(() => {
    setProfile(null);
    localStorage.removeItem('cms_user');
    auth.signOut();
    toast.success("Logged out successfully");
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';
  const isComplaintsTeam = ['complaints_team', 'manager', 'admin', 'supervisor', 'team_leader'].includes(profile?.role || '');
  const isManager = ['manager', 'admin', 'supervisor'].includes(profile?.role || '');

  return (
    <AuthContext.Provider value={{ 
      user: profile, 
      profile, 
      loading, 
      isAdmin, 
      isManager, 
      isComplaintsTeam,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
