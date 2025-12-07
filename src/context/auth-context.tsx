
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, DocumentData, Timestamp } from 'firebase/firestore';
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                try {
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const firestoreData = docSnap.data();
                        const serializedData = serializeFirestoreTimestamps(firestoreData);
                        
                        setUser({
                            ...firebaseUser,
                            ...serializedData,
                            uid: firebaseUser.uid,
                        } as AuthUser);
                    } else {
                        setUser(firebaseUser as AuthUser);
                    }
                } catch (error) {
                    console.error("Error fetching user document:", error);
                    setUser(firebaseUser as AuthUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
