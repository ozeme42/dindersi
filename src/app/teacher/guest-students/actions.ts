

'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { collection, doc, serverTimestamp, setDoc } from "firebase-admin/firestore";
import type { UserProfile } from "@/lib/types";
import { normalizeNameToEmailLocalPart } from "@/lib/utils";

// This is a simplified version of student creation that does NOT create an auth user.
// It only creates a document in Firestore.
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
        const docRef = doc(collection(db, "users"));
        
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: `${docRef.id}@guest.degerleroyunu.app`, // A dummy email
            role: 'guest', // The key difference
            class: className,
            score: 0,
            createdAt: serverTimestamp(),
            teacherId: teacherId, // Associate with the teacher
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
                    teacherId: teacherId,
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
