'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore"; // Admin SDK timestamp
import type { UserProfile } from "@/lib/types";

// Auth kullanıcısı OLUŞTURMADAN sadece Firestore kaydı oluşturur.
export async function addGuestStudent(displayName: string, className: string, teacherId: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }
     if (!teacherId) {
        return { success: false, error: "Öğretmen bilgisi eksik." };
    }

    try {
        const db = getAdminDb();
        // Admin SDK syntax: db.collection().doc()
        const docRef = db.collection("users").doc(); 
        
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: `${docRef.id}@guest.degerleroyunu.app`, // Dummy email
            role: 'guest',
            class: className,
            score: 0,
            // Admin SDK syntax: FieldValue
            createdAt: FieldValue.serverTimestamp() as any,
            teacherId: teacherId,
            ownedItems: [],
        };

        // Admin SDK syntax: docRef.set()
        await docRef.set(newUserProfile);
        
        // Serileştirilebilir (Client'a dönebilir) veri hazırlama
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: docRef.id,
            createdAt: new Date().toISOString(), // Timestamp'i string'e çeviriyoruz
        };
        
        return { success: true, newUser: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new guest student:", error);
        return { success: false, error: `Sanal öğrenci oluşturulurken hata: ${error.message}` };
    }
}

export async function bulkAddGuestStudents(names: string[], className: string, teacherId: string): Promise<{ success: boolean; error?: string; successCount?: number; errorDetails?: {name: string, error: string}[] }> {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek öğrenci adı bulunamadı." };
    }
     if (!teacherId) {
        return { success: false, error: "Öğretmen bilgisi eksik." };
    }
    
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const usersCollection = db.collection("users"); // Admin SDK

        let operationCount = 0;

        names.forEach(name => {
            const finalDisplayName = name.trim();
            if (finalDisplayName) {
                const docRef = usersCollection.doc(); // Yeni ID üretir
                const newUserProfile: Omit<UserProfile, 'uid'> = {
                    displayName: finalDisplayName,
                    email: `${docRef.id}@guest.degerleroyunu.app`,
                    role: 'guest',
                    class: className,
                    score: 0,
                    createdAt: FieldValue.serverTimestamp() as any,
                    teacherId: teacherId,
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

export async function updateStudentClass(studentId: string, newClassName: string): Promise<{ success: boolean; error?: string }> {
    if (!studentId || !newClassName) {
        return { success: false, error: "Öğrenci ID'si veya yeni sınıf adı eksik." };
    }

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

export async function deleteBulkGuestStudents(userIds: string[]): Promise<{ success: boolean; error?: string }> {
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
    } catch (error: any) {
        console.error("Error bulk deleting guest students:", error);
        return { success: false, error: "Sanal öğrenciler silinirken bir hata oluştu." };
    }
}
