

'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, School } from "@/lib/types";

// --- YARDIMCI FONKSİYON: RECURSIVE (DERİNLEMESİNE) SERIALIZER ---
const deepSerialize = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'object' && 'toDate' in data && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    
    if (data instanceof Date) {
        return data.toISOString();
    }

    if (Array.isArray(data)) {
        return data.map(item => deepSerialize(item));
    }

    if (typeof data === 'object') {
        const newData: any = {};
        for (const key of Object.keys(data)) {
            newData[key] = deepSerialize(data[key]);
        }
        return newData;
    }

    return data;
};

// --- VERİ ÇEKME İŞLEMLERİ (Sadece Admin SDK ile) ---

export async function getStudentData(teacher?: UserProfile): Promise<{ students: UserProfile[], classes: SchoolClass[], schools: School[] }> {
  const db = getAdminDb();

  try {
    const [classesSnap, schoolsSnap, allUsersSnap] = await Promise.all([
      db.collection('classes').orderBy('name', 'asc').get(),
      db.collection('schools').orderBy('name', 'asc').get(),
      db.collection('users').get()
    ]);
    
    // 1. KULLANICI VERİLERİNİ GÜVENLİ HALE GETİRİYORUZ
    let allUsers = allUsersSnap.docs.map(doc => {
        const serializedData = deepSerialize(doc.data());
        return { 
            uid: doc.id, 
            ...serializedData, 
        } as UserProfile
    }).filter(user => ['student', 'guest', 'pending', 'teacher', 'superadmin'].includes(user.role));

    // Filtreleme artık istemci tarafında yapılacak, sunucudan tüm ilgili roller çekilir.
    
    // 2. SINIF VERİLERİNİ GÜVENLİ HALE GETİRİYORUZ
    const classes = classesSnap.docs.map(doc => {
        const serializedData = deepSerialize(doc.data());
        return { 
            id: doc.id, 
            ...serializedData 
        } as SchoolClass
    });
    
    // 3. OKUL VERİLERİNİ GÜVENLİ HALE GETİRİYORUZ
    const schoolSet = new Map<string, School>();
    schoolsSnap.docs.forEach(doc => {
        const schoolData = doc.data() as { name: string };
        if (schoolData.name && !schoolSet.has(schoolData.name.toLowerCase())) {
            schoolSet.set(schoolData.name.toLowerCase(), { id: doc.id, name: schoolData.name });
        }
    });

    allUsersSnap.docs.forEach(userDoc => {
        const student = userDoc.data() as any;
        if (student.schoolName && !schoolSet.has(student.schoolName.toLowerCase())) {
            const pseudoId = student.schoolName.toLowerCase().replace(/\s+/g, '-');
            schoolSet.set(student.schoolName.toLowerCase(), { id: pseudoId, name: student.schoolName });
        }
    });

    const combinedSchools = Array.from(schoolSet.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    return { 
        students: allUsers,
        classes: classes,
        schools: combinedSchools,
    };
  } catch (error) {
    console.error('Error fetching student data:', error);
    return { students: [], classes: [], schools: [] };
  }
}


// --- YAZMA İŞLEMLERİ (Admin SDK) ---

type SaveUserData = {
    uid?: string;
    displayName: string;
    email?: string;
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

        if (uid) { // Güncelleme
            const updatePayload: any = { displayName };
            if (password) {
                updatePayload.password = password;
            }
            
            if (Object.keys(updatePayload).length > 0) {
              await auth.updateUser(uid, updatePayload);
            }
            
            const userDocRef = db.collection('users').doc(uid);
            await userDocRef.update({
                displayName,
                role,
                class: className || '',
                schoolName: schoolName || '',
                score: score || 0,
            });

        } else { // Yeni Kayıt
            if (!password) {
                return { success: false, error: 'Yeni kullanıcı için şifre zorunludur.' };
            }
            
            const finalEmail = email || `${normalizeNameToEmailLocalPart(displayName)}@degerleroyunu.com`;
            
            const newUserRecord = await auth.createUser({
                email: finalEmail,
                password,
                displayName,
            });

            const userProfile: Omit<UserProfile, 'uid'> = {
                displayName,
                email: finalEmail,
                role,
                class: className || '',
                schoolName: schoolName || '',
                score: 0,
                createdAt: FieldValue.serverTimestamp() as any, 
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

export async function bulkAddStudents(names: string[], className: string, schoolName: string, teacherId?: string | null): Promise<{ success: boolean; error?: string, successCount?: number }> {
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
        
        // --- DEĞİŞİKLİK: TOPLU EKLEMEDE ŞİFRE 123456 ---
        const password = '123456'; 

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
                createdAt: FieldValue.serverTimestamp() as any,
                ownedItems: [],
                teacherId: teacherId || undefined,
            };
            
            successfulCreations.push({ uid: userRecord.uid, profile: userProfile });
        } catch (error: any) {
             if (error.code === 'auth/email-already-exists') {
                try {
                    const existingUser = await auth.getUserByEmail(email);
                    const userDoc = await db.collection('users').doc(existingUser.uid).get();
                    if (!userDoc.exists) {
                         const userProfile: Omit<UserProfile, 'uid'> = {
                            displayName: finalDisplayName, email, role: 'student', class: className, schoolName, score: 0, createdAt: FieldValue.serverTimestamp() as any, ownedItems: [], teacherId: teacherId || undefined,
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

export async function addGuestStudent(displayName: string, className: string, teacherId: string | null, schoolId?: string, schoolName?: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }
    
    try {
        const db = getAdminDb();
        const docRef = db.collection("users").doc();
        
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: `${docRef.id}@guest.degerleroyunu.app`,
            role: 'guest',
            class: className,
            score: 0,
            createdAt: FieldValue.serverTimestamp() as any,
            teacherId: teacherId || undefined,
            schoolId: schoolId || undefined,
            schoolName: schoolName || undefined,
            ownedItems: [],
        };

        await docRef.set(newUserProfile);
        
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

export async function approveStudent(uid: string): Promise<{ success: boolean; error?: string }> {
    if (!uid) {
        return { success: false, error: 'Kullanıcı ID\'si eksik.' };
    }
    try {
        const db = getAdminDb();
        const userDocRef = db.collection('users').doc(uid);
        await userDocRef.update({ role: 'student' });
        return { success: true };
    } catch (error: any) {
        console.error("Error approving student:", error);
        return { success: false, error: 'Öğrenci onaylanırken bir hata oluştu.' };
    }
}

export async function updateStudentClass(studentId: string, newClassName: string) {
    try {
      const db = getAdminDb();
      await db.collection('users').doc(studentId).update({
        class: newClassName
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error updating student class:", error);
      return { success: false, error: "Sınıf güncellenirken bir hata oluştu." };
    }
}

export async function bulkUpdateGuestStudents(
  studentIds: string[], 
  updates: { schoolId?: string; schoolName?: string; className?: string }
): Promise<{ success: boolean; error?: string }> {
    if (!studentIds || studentIds.length === 0) {
        return { success: false, error: "Güncellenecek öğrenci seçilmedi." };
    }

    try {
        const db = getAdminDb();
        const batch = db.batch();

        const updateData: any = {};
        
        if (updates.className) {
            updateData.class = updates.className;
        }

        // Admin okulu değiştirirse burası çalışır
        if (updates.schoolId && updates.schoolName) {
            updateData.schoolId = updates.schoolId;
            updateData.schoolName = updates.schoolName;
        }

        if (Object.keys(updateData).length === 0) {
             return { success: false, error: "Güncellenecek veri bulunamadı." };
        }

        studentIds.forEach(id => {
            const docRef = db.collection("users").doc(id);
            batch.update(docRef, updateData);
        });

        await batch.commit();
        return { success: true };

    } catch (error: any) {
        console.error("Error bulk updating guest students:", error);
        return { success: false, error: "Toplu güncelleme sırasında bir hata oluştu." };
    }
}
function normalizeNameToEmailLocalPart(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '.') // handle one or more spaces
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9.-]/g, '');
}

export async function deleteBulkGuestStudents(userIds: string[]): Promise<{ success: boolean, error?: string }> {
    if (!userIds || userIds.length === 0) {
        return { success: false, error: "Silinecek öğrenci seçilmedi." };
    }
    try {
        const db = getAdminDb();
        const batch = db.batch();
        userIds.forEach(id => {
            const docRef = db.collection("users").doc(id);
            batch.delete(docRef);
        });
        await batch.commit();
        return { success: true };
    } catch(e) {
        console.error("Error deleting bulk guest students", e);
        return { success: false, error: "Öğrenciler silinirken bir hata oluştu." };
    }
}
