
'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { collection, writeBatch, serverTimestamp, updateDoc, setDoc, doc } from "firebase-admin/firestore";
import type { UserProfile } from "@/lib/types";
import { normalizeNameToEmailLocalPart } from "@/lib/utils";

// This is a simplified version of student creation that does NOT create an auth user.
// It only creates a document in Firestore.
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
        const studentRef = doc(db, 'users', studentId);
        await updateDoc(studentRef, {
            class: newClassName
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating student class:", error);
        return { success: false, error: "Öğrenci sınıfı güncellenirken bir hata oluştu." };
    }
}


export async function createNewStudent(data: Omit<UserProfile, 'uid' | 'createdAt' | 'score'> & { password?: string }): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const finalDisplayName = data.displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }
    if (!data.password || data.password.length < 6) {
        return { success: false, error: "Yeni kullanıcı için şifre zorunludur ve en az 6 karakter olmalıdır." };
    }

    try {
        const auth = getAdminAuth();

        const baseLocalPart = normalizeNameToEmailLocalPart(finalDisplayName);
        let finalEmail = `${baseLocalPart}@degerleroyunu.app`;
        let attempts = 0;
        
        while (true) {
            try {
                await auth.getUserByEmail(finalEmail);
                attempts++;
                finalEmail = `${baseLocalPart}${attempts}@degerleroyunu.app`;
                 if (attempts > 100) {
                    throw new Error("Bu isimle çok fazla kullanıcı mevcut, lütfen farklı bir isim deneyin.");
                }
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    break; // Email is available
                }
                throw error; // Other errors
            }
        }
        
        const userRecord = await auth.createUser({
            email: finalEmail,
            password: data.password,
            displayName: finalDisplayName,
        });
        
        const firestore = getAdminDb();
        
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: finalEmail,
            role: data.role || 'student',
            class: data.class,
            score: 0,
            createdAt: serverTimestamp(),
        };

        await firestore.collection("users").doc(userRecord.uid).set(newUserProfile);
        
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: userRecord.uid,
            createdAt: new Date().toISOString(),
        };
        
        return { success: true, user: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new student:", error);
        return { success: false, error: `Öğrenci oluşturulurken hata: ${error.message}` };
    }
}
