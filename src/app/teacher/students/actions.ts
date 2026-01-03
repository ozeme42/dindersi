
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, setDoc, orderBy } from "firebase/firestore";
import type { UserProfile, SchoolClass, School } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { normalizeNameToEmailLocalPart } from "@/lib/utils";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function getStudentData(): Promise<{ students: UserProfile[], classes: SchoolClass[], schools: School[] }> {
  noStore();
  try {
    const [studentsSnap, classesSnap, schoolsSnap] = await Promise.all([
      getDocs(query(collection(db, "users"))),
      getDocs(query(collection(db, 'classes'), orderBy('name', 'asc'))),
      getDocs(query(collection(db, 'schools'), orderBy('name', 'asc'))),
    ]);
    
    const students = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
    
    // Sadece 'schools' koleksiyonundan gelen veriyi kullan, böylece ID'si olmayan veri olmaz.
    const schoolsData = schoolsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as School))
        .filter(school => school.id && school.name && school.name.trim()); 

    return { 
        students: JSON.parse(JSON.stringify(students)),
        classes: JSON.parse(JSON.stringify(classes)),
        schools: JSON.parse(JSON.stringify(schoolsData)),
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
            
            const userDocRef = db.collection('users').doc(uid);
            await userDocRef.update({
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
            
            await db.collection('users').doc(newUserRecord.uid).set(userProfile);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error saving user: ", error);
        return { success: false, error: error.message };
    }
}

export async function bulkAddStudents(names: string[], className: string, schoolName: string): Promise<{ success: boolean; error?: string, successCount?: number }> {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek öğrenci adı bulunamadı." };
    }
    
    const auth = getAdminAuth();
    const db = getAdminDb();

    if (schoolName) {
        const schoolsRef = db.collection('schools');
        const schoolQuery = await schoolsRef.where('name', '==', schoolName).limit(1).get();
        if (schoolQuery.empty) {
            await schoolsRef.add({ name: schoolName });
        }
    }

    const successfulCreations: any[] = [];
    const failedCreations: any[] = [];

    for (const name of names) {
        const finalDisplayName = name.trim();
        if (!finalDisplayName) continue;

        const email = `${normalizeNameToEmailLocalPart(finalDisplayName)}@degerleroyunu.com`;
        const password = 'password'; 

        try {
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: finalDisplayName,
            });

            const userProfile: Omit<UserProfile, 'uid'> = {
                displayName: finalDisplayName,
                email,
                role: 'student',
                class: className,
                schoolName: schoolName,
                score: 0,
                createdAt: serverTimestamp(),
                ownedItems: [],
            };
            
            successfulCreations.push({ uid: userRecord.uid, profile: userProfile });
        } catch (error: any) {
             if (error.code === 'auth/email-already-exists') {
                try {
                    const existingUser = await auth.getUserByEmail(email);
                    const userDoc = await db.collection('users').doc(existingUser.uid).get();
                    if (!userDoc.exists) {
                         const userProfile: Omit<UserProfile, 'uid'> = {
                            displayName: finalDisplayName, email, role: 'student', class: className, schoolName, score: 0, createdAt: serverTimestamp(), ownedItems: [],
                        };
                        successfulCreations.push({ uid: existingUser.uid, profile: userProfile });
                    }
                } catch (e) {
                     failedCreations.push({ name, reason: `Kullanıcı zaten var ama profili oluşturulamadı: ${e}` });
                }
            } else {
                failedCreations.push({ name, reason: error.message });
            }
        }
    }
    
    if (successfulCreations.length > 0) {
        const batch = db.batch();
        successfulCreations.forEach(({ uid, profile }) => {
            const userRef = db.collection('users').doc(uid);
            batch.set(userRef, profile);
        });
        await batch.commit();
    }

    if (failedCreations.length > 0) {
        console.error("Bulk add failures:", failedCreations);
        return { 
            success: false, 
            error: `${failedCreations.length} öğrenci oluşturulamadı. Lütfen isimleri kontrol edin (örn: daha önce eklenmiş olabilirler).`,
            successCount: successfulCreations.length 
        };
    }

    return { success: true, successCount: successfulCreations.length };
}

export async function approveStudent(uid: string): Promise<{ success: boolean; error?: string }> {
    if (!uid) {
        return { success: false, error: 'Kullanıcı ID\'si eksik.' };
    }
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, { role: 'student' });
        return { success: true };
    } catch (error: any) {
        console.error("Error approving student:", error);
        return { success: false, error: 'Öğrenci onaylanırken bir hata oluştu.' };
    }
}
