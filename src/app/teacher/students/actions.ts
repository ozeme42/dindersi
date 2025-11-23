

'use server';

import { db, firebaseConfig } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, writeBatch, increment, getDocs, collection, query, where } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, updateProfile } from "firebase/auth"
import { normalizeNameToEmailLocalPart } from "@/lib/utils";
import { deleteUserFromFirestore } from "@/app/teacher/superadmin/actions";


export async function addStudentToClass(displayName: string, className: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }

    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is missing.");
        return { success: false, error: "Sunucu yapılandırma hatası." };
    }

    const password = "123456"; // Default password
    const appName = 'student-creation-' + Date.now() + Math.random();
    let secondaryApp;

    try {
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        const baseLocalPart = normalizeNameToEmailLocalPart(finalDisplayName);
        let finalEmail = `${baseLocalPart}@degerleroyunu.app`;
        let attempts = 0;
        
        while (true) {
            const methods = await fetchSignInMethodsForEmail(secondaryAuth, finalEmail);
            if (methods.length === 0) break;
            attempts++;
            finalEmail = `${baseLocalPart}${attempts}@degerleroyunu.app`;
            if (attempts > 100) {
                 throw new Error("Bu isimle çok fazla kullanıcı mevcut, lütfen farklı bir isim deneyin.");
            }
        }
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: finalDisplayName });

        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: finalEmail,
            role: 'student',
            class: className,
            score: 0,
            createdAt: serverTimestamp(),
        };

        // Use the primary admin-authenticated db instance to write to Firestore
        await setDoc(doc(db, "users", user.uid), newUserProfile);
        
        const serializableNewUser: UserProfile = {
            ...newUserProfile,
            uid: user.uid,
            createdAt: new Date().toISOString(), // for immediate client-side update
        };
        
        return { success: true, newUser: serializableNewUser };

    } catch (error: any) {
        console.error("Error creating new student:", error);
        return { success: false, error: `Öğrenci oluşturulurken hata: ${error.message}` };
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
}


export async function bulkAddStudentsToClass(names: string[], className: string): Promise<{ success: boolean; error?: string; successCount?: number; errorCount?: number; errorDetails?: {name: string, error: string}[] }> {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek öğrenci adı bulunamadı." };
    }
    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is missing.");
        return { success: false, error: "Sunucu yapılandırma hatası." };
    }

    const password = "123456";
    let successCount = 0;
    let errorCount = 0;
    const errorDetails: {name: string, error: string}[] = [];

    await Promise.all(names.map(async (name) => {
        const finalDisplayName = name.trim();
        if (!finalDisplayName) {
            errorCount++;
            errorDetails.push({ name, error: "Boş isim." });
            return;
        }

        const appName = 'student-creation-' + Date.now() + Math.random();
        let secondaryApp;
        try {
            secondaryApp = initializeApp(firebaseConfig, appName);
            const secondaryAuth = getAuth(secondaryApp);

            const baseLocalPart = normalizeNameToEmailLocalPart(finalDisplayName);
            let finalEmail = `${baseLocalPart}@degerleroyunu.app`;
            let attempts = 0;

            while (true) {
                const methods = await fetchSignInMethodsForEmail(secondaryAuth, finalEmail);
                if (methods.length === 0) break;
                attempts++;
                finalEmail = `${baseLocalPart}${attempts}@degerleroyunu.app`;
                if (attempts > 100) throw new Error("Benzersiz e-posta bulunamadı.");
            }
            
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: finalDisplayName });

            const newUserProfile: Omit<UserProfile, 'uid'> = {
                displayName: finalDisplayName,
                email: finalEmail,
                role: 'student',
                class: className,
                score: 0,
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, "users", user.uid), newUserProfile);
            successCount++;
        } catch (error: any) {
            errorCount++;
            errorDetails.push({ name: finalDisplayName, error: error.message });
            console.error(`Error creating student ${finalDisplayName}:`, error);
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
        }
    }));

    if (errorCount > 0) {
        return { success: false, error: `${errorCount} öğrenci eklenirken hata oluştu.`, successCount, errorCount, errorDetails };
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
