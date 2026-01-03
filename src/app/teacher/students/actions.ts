
'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import type { UserProfile, SchoolClass, School } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { normalizeNameToEmailLocalPart } from "@/lib/utils";
import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore';

export async function getAllUsers(): Promise<UserProfile[]> {
  noStore();
  try {
    const db = getAdminDb();
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        const serializedData = JSON.parse(JSON.stringify(data));
        return { uid: doc.id, ...serializedData } as UserProfile;
    });
  } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
  }
}

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

    // Check if school exists, if not, add it.
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
        // Generate a simple default password (e.g., '123456')
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
                // Try to find the existing user to add to Firestore if they don't have a doc
                try {
                    const existingUser = await auth.getUserByEmail(email);
                    const userDoc = await db.collection('users').doc(existingUser.uid).get();
                    if (!userDoc.exists) {
                         const userProfile: Omit<UserProfile, 'uid'> = {
                            displayName: finalDisplayName, email, role: 'student', class: className, schoolName, score: 0, createdAt: serverTimestamp(), ownedItems: [],
                        };
                        successfulCreations.push({ uid: existingUser.uid, profile: userProfile });
                    } else {
                        // User already fully exists, skip
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

export async function addGuestStudent(displayName: string, className: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }

    try {
        const db = getAdminDb();
        const docRef = doc(collection(db, "users"));
        
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: `${docRef.id}@guest.degerleroyunu.app`, // A dummy email
            role: 'guest', // The key difference
            class: className,
            score: 0,
            createdAt: serverTimestamp(),
        };

        await setDoc(docRef, newUserProfile);
        
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: docRef.id,
            createdAt: new Date().toISOString(),
        };
        
        return { success: true, newUser: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new guest student:", error);
        return { success: false, error: `Sanal öğrenci oluşturulurken hata: ${error.message}` };
    }
}


export async function bulkAddGuestStudents(names: string[], className: string): Promise<{ success: boolean; error?: string; successCount?: number; errorDetails?: {name: string, error: string}[] }> {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek öğrenci adı bulunamadı." };
    }
    
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const usersCollection = collection(db, "users");

        names.forEach(name => {
            const finalDisplayName = name.trim();
            if (finalDisplayName) {
                const docRef = doc(usersCollection);
                const newUserProfile: Omit<UserProfile, 'uid'> = {
                    displayName: finalDisplayName,
                    email: `${docRef.id}@guest.degerleroyunu.app`,
                    role: 'guest',
                    class: className,
                    score: 0,
                    createdAt: serverTimestamp(),
                };
                batch.set(docRef, newUserProfile);
            }
        });

        await batch.commit();
        return { success: true, successCount: names.filter(Boolean).length };
    } catch (error: any) {
        console.error("Error creating bulk guest students:", error);
        return { success: false, error: `Sanal öğrenciler oluşturulurken hata: ${error.message}` };
    }
}

export async function updateStudentClass(studentId: string, newClassName: string): Promise<{ success: boolean; error?: string }> {
    if (!studentId || !newClassName) {
        return { success: false, error: "Öğrenci ID'si veya yeni sınıf adı eksik." };
    }

    try {
        const db = getAdminDb();
        const studentRef = db.collection('users').doc(studentId);
        await studentRef.update({
            class: newClassName
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating student class:", error);
        return { success: false, error: "Öğrenci sınıfı güncellenirken bir hata oluştu." };
    }
}
