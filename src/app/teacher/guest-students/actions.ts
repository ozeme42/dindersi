
'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { UserProfile } from "@/lib/types";

// --- TEKİL ÖĞRENCİ EKLEME ---
export async function addGuestStudent(
    displayName: string, 
    className: string, 
    teacherId: string,
    schoolId?: string,     // Eklendi
    schoolName?: string    // Eklendi
): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) return { success: false, error: "Öğrenci adı boş olamaz." };
    if (!teacherId) return { success: false, error: "Öğretmen bilgisi eksik." };

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
            teacherId: teacherId,
            // Okul bilgileri varsa ekle
            ...(schoolId && { schoolId }),
            ...(schoolName && { schoolName }),
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

// --- TOPLU ÖĞRENCİ EKLEME ---
export async function bulkAddGuestStudents(
    names: string[], 
    className: string, 
    teacherId: string,
    schoolId?: string,      // Eklendi
    schoolName?: string     // Eklendi
): Promise<{ success: boolean; error?: string; successCount?: number; errorDetails?: {name: string, error: string}[] }> {
    if (!names || names.length === 0) return { success: false, error: "Eklenecek öğrenci adı bulunamadı." };
    if (!teacherId) return { success: false, error: "Öğretmen bilgisi eksik." };
    
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const usersCollection = db.collection("users");

        let operationCount = 0;

        names.forEach(name => {
            const finalDisplayName = name.trim();
            if (finalDisplayName) {
                const docRef = usersCollection.doc();
                const newUserProfile: Omit<UserProfile, 'uid'> = {
                    displayName: finalDisplayName,
                    email: `${docRef.id}@guest.degerleroyunu.app`,
                    role: 'guest',
                    class: className,
                    score: 0,
                    createdAt: FieldValue.serverTimestamp() as any,
                    teacherId: teacherId,
                    // Okul bilgileri varsa ekle
                    ...(schoolId && { schoolId }),
                    ...(schoolName && { schoolName }),
                    ownedItems: [],
                };
                batch.set(docRef, newUserProfile);
                operationCount++;
            }
        });

        if (operationCount > 0) {
            await batch.commit();
        }
        
        return { success: true, successCount: operationCount };
    } catch (error: any) {
        console.error("Error creating bulk guest students:", error);
        return { success: false, error: `Sanal öğrenciler oluşturulurken hata: ${error.message}` };
    }
}

// --- SINIF GÜNCELLEME ---
export async function updateStudentClass(studentId: string, newClassName: string): Promise<{ success: boolean; error?: string }> {
    if (!studentId || !newClassName) return { success: false, error: "Eksik bilgi." };

    try {
        const db = getAdminDb();
        await db.collection('users').doc(studentId).update({
            class: newClassName
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating student class:", error);
        return { success: false, error: "Öğrenci sınıfı güncellenirken bir hata oluştu." };
    }
}

// --- TOPLU SİLME ---
export async function deleteBulkGuestStudents(userIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (!userIds || userIds.length === 0) return { success: false, error: "Silinecek öğrenci seçilmedi." };

    try {
        const db = getAdminDb();
        const batch = db.batch();
        userIds.forEach(id => {
            const docRef = db.collection("users").doc(id);
            batch.delete(docRef);
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error bulk deleting guest students:", error);
        return { success: false, error: "Sanal öğrenciler silinirken bir hata oluştu." };
    }
}

// --- TOPLU GÜNCELLEME (OKUL/SINIF) ---
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
