

'use server';

import { adminApp } from "@/lib/firebase-admin";
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, setDoc, serverTimestamp, writeBatch, increment, collection } from "firebase-admin/firestore";
import type { UserProfile } from "@/lib/types";
import { normalizeNameToEmailLocalPart } from "@/lib/utils";

const db = getFirestore(adminApp);

export async function createNewStudent(data: Omit<UserProfile, 'uid' | 'createdAt' | 'score'> & { password?: string }): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const finalDisplayName = data.displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }
    if (!data.password || data.password.length < 6) {
        return { success: false, error: "Yeni kullanıcı için şifre zorunludur ve en az 6 karakter olmalıdır." };
    }

    try {
        const auth = getAuth(adminApp);

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
        
        const user = userRecord;

        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: finalEmail,
            role: data.role || 'student',
            class: data.class,
            score: 0,
            createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "users", user.uid), newUserProfile);
        
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: user.uid,
            createdAt: new Date().toISOString(),
        };
        
        return { success: true, user: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new student:", error);
        return { success: false, error: `Öğrenci oluşturulurken hata: ${error.message}` };
    }
}


export async function addStudentToClass(displayName: string, className: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }

    const password = "123456"; // Default password

    try {
        const auth = getAuth(adminApp);

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
            password: password,
            displayName: finalDisplayName,
        });

        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: finalEmail,
            role: 'student',
            class: className,
            score: 0,
            createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "users", userRecord.uid), newUserProfile);
        
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: userRecord.uid,
            createdAt: new Date().toISOString(),
        };
        
        return { success: true, newUser: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new student:", error);
        return { success: false, error: `Öğrenci oluşturulurken hata: ${error.message}` };
    }
}


export async function bulkAddStudentsToClass(names: string[], className: string): Promise<{ success: boolean; error?: string; successCount?: number; errorDetails?: {name: string, error: string}[] }> {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek öğrenci adı bulunamadı." };
    }
    
    const password = "123456";
    let successCount = 0;
    const errorDetails: {name: string, error: string}[] = [];

     for (const name of names) {
        const finalDisplayName = name.trim();
        if (!finalDisplayName) continue;

        try {
            const result = await addStudentToClass(finalDisplayName, className);
            if (result.success) {
                successCount++;
            } else {
                errorDetails.push({ name: finalDisplayName, error: result.error || 'Bilinmeyen hata' });
            }
        } catch (error: any) {
            errorDetails.push({ name: finalDisplayName, error: error.message });
        }
    }

    if (errorDetails.length > 0) {
        return { success: false, error: `${errorDetails.length} öğrenci eklenirken hata oluştu.`, successCount, errorDetails };
    }

    return { success: true, successCount };
}

export async function addManualScore(studentId: string, points: number, reason: string): Promise<{ success: boolean, error?: string }> {
    if (!studentId || !reason.trim() || !Number.isInteger(points)) {
        return { success: false, error: "Eksik veya geçersiz bilgi." };
    }

    try {
        const batch = writeBatch(db);

        // 1. Update user's score
        const userRef = doc(db, 'users', studentId);
        batch.update(userRef, { score: increment(points) });

        // 2. Log the score event
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: studentId,
            points: points,
            timestamp: serverTimestamp(),
            gameType: 'Manuel Puan',
            context: reason,
        });

        await batch.commit();
        return { success: true };

    } catch (error: any) {
        console.error("Error adding manual score:", error);
        return { success: false, error: "Puan eklenirken bir veritabanı hatası oluştu." };
    }
}

// Duplicating this here to avoid circular dependencies
export async function deleteStudent(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    }
    try {
        const auth = getAuth(adminApp);
        await auth.deleteUser(userId);
        await deleteDoc(doc(db, 'users', userId));
        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting user ${userId}:`, error);
        return { success: false, error: 'Kullanıcı silinirken bir hata oluştu: ' + error.message };
    }
}
