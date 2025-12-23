

'use server';

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { collection, doc, writeBatch, Timestamp, setDoc, updateDoc } from "firebase-admin/firestore";
import { firestore } from 'firebase-admin';
import type { UserProfile } from "@/lib/types";
import { normalizeNameToEmailLocalPart } from "@/lib/utils";

export async function addStudentToClass(displayName: string, className: string): Promise<{ success: boolean; error?: string; newUser?: UserProfile }> {
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        return { success: false, error: "Öğrenci adı boş olamaz." };
    }
    if (!className) {
        return { success: false, error: "Sınıf adı belirtilmedi." };
    }

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();

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
                    break;
                }
                throw error;
            }
        }

        const password = Math.random().toString(36).slice(-8);
        
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
            createdAt: Timestamp.now(),
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
    if (!className) {
        return { success: false, error: "Sınıf adı belirtilmedi." };
    }
    
    const auth = getAdminAuth();
    const db = getAdminDb();
    const successDetails: { name: string; email: string; pass: string }[] = [];
    const errorDetails: { name: string; error: string }[] = [];
    
    for (const name of names) {
        const finalDisplayName = name.trim();
        if (finalDisplayName) {
            try {
                const baseLocalPart = normalizeNameToEmailLocalPart(finalDisplayName);
                let finalEmail = `${baseLocalPart}@degerleroyunu.app`;
                let attempts = 0;
                 while (true) {
                    try {
                        await auth.getUserByEmail(finalEmail);
                        attempts++;
                        finalEmail = `${baseLocalPart}${attempts}@degerleroyunu.app`;
                         if (attempts > 100) {
                            throw new Error("Bu isimle çok fazla kullanıcı mevcut.");
                        }
                    } catch (error: any) {
                        if (error.code === 'auth/user-not-found') {
                            break;
                        }
                        throw error;
                    }
                }
                
                const password = Math.random().toString(36).slice(-8);

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
                    createdAt: Timestamp.now(),
                };

                await setDoc(doc(db, "users", userRecord.uid), newUserProfile);
                successDetails.push({ name: finalDisplayName, email: finalEmail, pass: password });

            } catch (error: any) {
                errorDetails.push({ name: finalDisplayName, error: error.message });
            }
        }
    }
    
    if (successDetails.length > 0) {
         return { success: true, successCount: successDetails.length, errorDetails: errorDetails.length > 0 ? errorDetails : undefined };
    }

    return { success: false, error: "Hiç öğrenci oluşturulamadı.", errorDetails };
}

export async function addManualScore(studentId: string, points: number, reason: string): Promise<{ success: boolean; error?: string }> {
    if (!studentId || !reason.trim() || points === 0) {
        return { success: false, error: 'Eksik bilgi.' };
    }

    try {
        const db = getAdminDb();
        const batch = db.batch();
        
        const userRef = db.collection('users').doc(studentId);
        batch.update(userRef, { score: firestore.FieldValue.increment(points) });

        const eventRef = db.collection('scoreEvents').doc();
        batch.set(eventRef, {
            userId: studentId,
            points: points,
            timestamp: Timestamp.now(),
            gameType: 'Manuel Puan',
            context: reason,
        });

        await batch.commit();

        return { success: true };
    } catch(e: any) {
        console.error("Error adding manual score:", e)
        return { success: false, error: 'Puan eklenirken bir hata oluştu.' };
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
        
        const firestoreDB = getAdminDb();
        
        const newUserProfile: Omit<UserProfile, 'uid'> = {
            displayName: finalDisplayName,
            email: finalEmail,
            role: data.role || 'student',
            class: data.class,
            score: 0,
            createdAt: Timestamp.now(),
        };

        await firestoreDB.collection("users").doc(userRecord.uid).set(newUserProfile);
        
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
