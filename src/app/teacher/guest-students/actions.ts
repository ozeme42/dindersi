'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, School } from "@/lib/types";

// --- YARDIMCI: DATA TEMİZLEME ---
const deepSerialize = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (typeof data === 'object' && 'toDate' in data && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (data instanceof Date) return data.toISOString();
    if (Array.isArray(data)) return data.map(item => deepSerialize(item));
    if (typeof data === 'object') {
        const newData: any = {};
        for (const key of Object.keys(data)) {
            newData[key] = deepSerialize(data[key]);
        }
        return newData;
    }
    return data;
};

// --- İSİM NORMALİZASYONU (Email oluşturmak için) ---
function normalizeNameToEmailLocalPart(name: string): string {
  if (!name) return '';
  return name.trim().toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '.')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9.-]/g, '');
}

// --- VERİ ÇEKME ---
export async function getStudentData(teacher?: UserProfile): Promise<{ students: UserProfile[], classes: SchoolClass[], schools: School[] }> {
  const db = getAdminDb();
  try {
    const [classesSnap, schoolsSnap] = await Promise.all([
      db.collection('classes').orderBy('name', 'asc').get(),
      db.collection('schools').orderBy('name', 'asc').get(),
    ]);

    let usersQuery: FirebaseFirestore.Query = db.collection('users');

    // FİLTRELEME: Eğer SuperAdmin değilse
    if (teacher && teacher.role !== 'superadmin') {
        if (teacher.schoolName) {
            usersQuery = usersQuery.where('schoolName', '==', teacher.schoolName);
        } else {
            usersQuery = usersQuery.where('teacherId', '==', teacher.uid);
        }
    }

    const allUsersSnap = await usersQuery.get();
    
    // Sadece misafir, öğrenci veya beklemedeki kullanıcıları al
    let allUsers = allUsersSnap.docs.map(doc => {
        const serializedData = deepSerialize(doc.data());
        return { uid: doc.id, ...serializedData } as UserProfile
    }).filter(user => ['student', 'guest', 'pending'].includes(user.role)); 

    const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...deepSerialize(doc.data()) } as SchoolClass));
    
    const schoolSet = new Map<string, School>();
    schoolsSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.name) schoolSet.set(d.name.toLowerCase(), { id: doc.id, name: d.name });
    });
    const combinedSchools = Array.from(schoolSet.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    return { students: allUsers, classes, schools: combinedSchools };
  } catch (error) {
    console.error('Veri çekme hatası:', error);
    return { students: [], classes: [], schools: [] };
  }
}

// --- TEKİL EKLEME ---
export async function addGuestStudent(
    displayName: string, 
    className: string, 
    teacherId: string,
    overrideSchoolId?: string, // Admin manuel seçerse
    overrideSchoolName?: string
): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) return { success: false, error: "İsim boş olamaz." };
    if (!teacherId) return { success: false, error: "Öğretmen kimliği bulunamadı." };

    try {
        const db = getAdminDb();
        
        let schoolName = "Tanımsız Okul";
        let schoolId = undefined;

        // Okul bilgisini belirle
        if (overrideSchoolName && overrideSchoolId) {
            schoolName = overrideSchoolName;
            schoolId = overrideSchoolId;
        } else {
            // Öğretmenden çek
            const teacherDoc = await db.collection('users').doc(teacherId).get();
            const teacherData = teacherDoc.data();
            if (teacherData?.schoolName) schoolName = teacherData.schoolName;
            if (teacherData?.schoolId) schoolId = teacherData.schoolId;
        }

        const docRef = db.collection("users").doc();
        // Benzersiz email oluştur
        const email = `${normalizeNameToEmailLocalPart(finalDisplayName)}.${docRef.id.substring(0,4)}@guest.degerleroyunu.app`;

        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: email,
            role: 'guest',
            class: className,
            score: 0,
            createdAt: FieldValue.serverTimestamp() as any,
            teacherId: teacherId,
            schoolId: schoolId,
            schoolName: schoolName,
            ownedItems: [],
        };

        await docRef.set(newUserProfile);
        
        return { 
            success: true, 
            newUser: { 
                ...newUserProfile, 
                uid: docRef.id, 
                createdAt: new Date().toISOString() 
            } 
        };
    } catch (error: any) {
        console.error("Add Guest Error:", error);
        return { success: false, error: error.message };
    }
}

// --- TOPLU EKLEME (LISTE) ---
export async function bulkAddStudents(
    names: string[], 
    className: string, 
    teacherId: string,
    overrideSchoolId?: string,
    overrideSchoolName?: string
): Promise<{ success: boolean; error?: string, successCount?: number }> {
    
    if (!names.length) return { success: false, error: "Liste boş." };
    if (!teacherId) return { success: false, error: "Öğretmen kimliği yok." };
    
    const auth = getAdminAuth();
    const db = getAdminDb();
    const batch = db.batch();
    
    try {
        let schoolName = "Tanımsız Okul";
        let schoolId = undefined;

        // Okul bilgisini belirle
        if (overrideSchoolName && overrideSchoolId) {
            schoolName = overrideSchoolName;
            schoolId = overrideSchoolId;
        } else {
            const teacherDoc = await db.collection('users').doc(teacherId).get();
            const teacherData = teacherDoc.data();
            if (teacherData?.schoolName) schoolName = teacherData.schoolName;
            if (teacherData?.schoolId) schoolId = teacherData.schoolId;
        }

        let successCount = 0;
        
        for (const name of names) {
            const cleanName = name.trim();
            if (!cleanName) continue;

            try {
                // Doküman ID'sini önceden oluştur (Batch işlemi için)
                const userRef = db.collection('users').doc();
                const randomSuffix = userRef.id.substring(0, 4);
                
                const email = `${normalizeNameToEmailLocalPart(cleanName)}.${randomSuffix}@guest.degerleroyunu.app`;
                // Guest kullanıcılar auth tablosunda olmak zorunda değil ama 
                // sistem tutarlılığı için genelde users koleksiyonu yeterlidir.
                // Eğer Auth da gerekiyorsa `auth.createUser` eklenmeli. 
                // Performans için şu an sadece Firestore'a ekliyoruz (Guest mantığı).

                const userProfile: Omit<UserProfile, 'uid'> = {
                    displayName: cleanName,
                    email: email,
                    role: 'guest', 
                    class: className,
                    schoolName: schoolName,
                    schoolId: schoolId,
                    score: 0,
                    createdAt: FieldValue.serverTimestamp() as any,
                    ownedItems: [],
                    teacherId: teacherId,
                };

                batch.set(userRef, userProfile);
                successCount++;
            } catch (e) { console.error(`Hata ${cleanName}:`, e); }
        }

        if (successCount > 0) {
            await batch.commit();
            return { success: true, successCount };
        }
        return { success: false, error: "Öğrenciler oluşturulamadı." };

    } catch(e: any) {
        return { success: false, error: "Sunucu hatası: " + e.message };
    }
}

// --- TOPLU SİLME ---
export async function deleteBulkGuestStudents(userIds: string[]): Promise<{ success: boolean, error?: string }> {
    if (!userIds.length) return { success: false, error: "Seçim yok." };
    const db = getAdminDb();
    const auth = getAdminAuth();
    const batch = db.batch();
    try {
        for (const uid of userIds) {
            batch.delete(db.collection("users").doc(uid));
            // Eğer auth kaydı varsa silmeyi dene, yoksa devam et
            auth.deleteUser(uid).catch(() => {});
        }
        await batch.commit();
        return { success: true };
    } catch(e: any) { return { success: false, error: e.message }; }
}

// --- SINIF GÜNCELLEME (Tablo üzerinden hızlı işlem için) ---
export async function updateStudentClass(studentId: string, newClassName: string) {
    try { 
        await getAdminDb().collection('users').doc(studentId).update({ class: newClassName }); 
        return { success: true }; 
    } catch (e: any) { return { success: false, error: e.message }; }
}

// --- TOPLU DÜZENLEME ---
export async function bulkUpdateGuestStudents(studentIds: string[], updates: any) {
    if (!studentIds.length) return { success: false, error: "Seçim yok." };
    try {
        const batch = getAdminDb().batch();
        const updateData: any = {};
        if (updates.className) updateData.class = updates.className;
        if (updates.schoolId && updates.schoolName) { 
            updateData.schoolId = updates.schoolId; 
            updateData.schoolName = updates.schoolName; 
        }
        studentIds.forEach(id => batch.update(getAdminDb().collection("users").doc(id), updateData));
        await batch.commit();
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// --- TEKİL KAYDETME (Dialog İçin) ---
export async function saveUser(data: any): Promise<{ success: boolean; error?: string }> {
    const { uid, displayName, role, class: className, schoolName, password } = data;
    try {
        const db = getAdminDb();
        const auth = getAdminAuth();
        if(uid) {
             if(password) await auth.updateUser(uid, { password });
             await auth.updateUser(uid, { displayName });
             await db.collection('users').doc(uid).update({ displayName, role, class: className, schoolName });
        }
        return { success: true };
    } catch(e:any) { return { success: false, error: e.message }; }
}