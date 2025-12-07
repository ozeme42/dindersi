
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, DocumentData, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthUser extends User {
    role?: 'student' | 'teacher' | 'superadmin' | 'guest';
    ownedItems?: string[];
    equippedFrameUrl?: string | null;
    equippedBadgeId?: string | null;
    class?: string;
    score?: number;
    avatar?: string;
    createdAt?: string;
    uid: string; // Ensure uid is always present
}

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

// Helper function to recursively convert Firestore Timestamps to ISO strings
function serializeFirestoreTimestamps(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(serializeFirestoreTimestamps);
  }
  if (data instanceof Timestamp) {
      return data.toDate().toISOString();
  }
  if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = serializeFirestoreTimestamps(data[key]);
      }
    }
    return newObj;
  }
  return data;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                // Use onSnapshot for real-time updates
                const unsubFromDoc = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const firestoreData = docSnap.data();
                        // Serialize Timestamps to prevent Next.js hydration errors
                        const serializedData = serializeFirestoreTimestamps(firestoreData);
                        
                        setUser({
                            ...firebaseUser,
                            ...serializedData,
                            uid: firebaseUser.uid, // ensure uid from auth is used
                        } as AuthUser);
                    } else {
                        // If Firestore doc doesn't exist, they are authenticated but have no profile data.
                        setUser(firebaseUser as AuthUser);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user document with onSnapshot:", error);
                    setUser(firebaseUser as AuthUser); // Fallback to auth data
                    setLoading(false);
                });
                // Return the unsubscribe function for the snapshot listener
                return () => unsubFromDoc();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        // Return the unsubscribe function for the auth state listener
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
