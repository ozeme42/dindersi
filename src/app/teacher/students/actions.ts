

'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { UserProfile, SchoolClass, School } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { normalizeNameToEmailLocalPart } from '@/lib/utils';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore';

export async function getStudentData(): Promise<{ students: UserProfile[], classes: SchoolClass[], schools: School[] }> {
  noStore();
  try {
    const db = getAdminDb();
    
    // Fetch all collections in parallel
    const [userRecords, classesSnapshot, schoolsSnapshot] = await Promise.all([
      getAdminAuth().listUsers(),
      db.collection('classes').orderBy('name', 'asc').get(),
      db.collection('schools').orderBy('name', 'asc').get(),
    ]);

    const usersList: UserProfile[] = userRecords.users.map(user => ({
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      role: 'student', 
      score: 0, 
    }));
    
    // Enrich with Firestore data
    const firestoreUsersSnapshot = await db.collection('users').get();
    const firestoreUsersMap = new Map<string, UserProfile>();
    firestoreUsersSnapshot.forEach(doc => {
        firestoreUsersMap.set(doc.id, doc.data() as UserProfile);
    });

    const combinedUsers = usersList.map(user => {
        const firestoreData = firestoreUsersMap.get(user.uid);
        return { ...user, ...firestoreData };
    });

    const students = combinedUsers.filter(u => u.role === 'student' || u.role === 'guest');

    const classes = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
    const schools = schoolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));

    return { 
        students: JSON.parse(JSON.stringify(students)),
        classes: JSON.parse(JSON.stringify(classes)),
        schools: JSON.parse(JSON.stringify(schools)),
    };
  } catch (error) {
    console.error('Error fetching student data:', error);
    return { students: [], classes: [], schools: [] };
  }
}

type SaveUserData = {
    uid?: string;
    displayName: string;
    email: string;
    role: 'student' | 'teacher' | 'superadmin' | 'guest';
    class?: string;
    schoolName?: string;
    password?: string;
    score?: number;
};

export async function saveUser(data: SaveUserData): Promise<{ success: boolean; error?: string }> {
    const { uid, displayName, email, role, class: className, schoolName, password, score } = data;
    
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();

        if (schoolName) {
            const schoolsRef = db.collection('schools');
            const schoolQuery = await schoolsRef.where('name', '==', schoolName).limit(1).get();
            if (schoolQuery.empty) {
                await schoolsRef.add({ name: schoolName });
            }
        }

        if (uid) { // Update existing user
            const updatePayload: any = { displayName };
            if (password) {
                updatePayload.password = password;
            }
            await auth.updateUser(uid, updatePayload);
            
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, {
                displayName,
                role,
                class: className || '',
                schoolName: schoolName || '',
                score: score || 0,
            });

        } else { // Create new user
            const newUserRecord = await auth.createUser({
                email,
                password,
                displayName,
            });

            const userProfile: Omit<UserProfile, 'uid'> = {
                displayName,
                email,
                role,
                class: className || '',
                schoolName: schoolName || '',
                score: 0,
                createdAt: serverTimestamp(),
                ownedItems: [],
            };
            
            await setDoc(doc(db, 'users', newUserRecord.uid), userProfile);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error saving user: ", error);
        return { success: false, error: error.message };
    }
}

export async function deleteStudents(studentIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (!studentIds || studentIds.length === 0) {
        return { success: false, error: "No students selected." };
    }
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        // Delete from Auth
        await auth.deleteUsers(studentIds);
        
        // Delete from Firestore
        const batch = db.batch();
        studentIds.forEach(id => {
            const docRef = doc(db, 'users', id);
            batch.delete(docRef);
        });
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting students: ", error);
        return { success: false, error: error.message };
    }
}
