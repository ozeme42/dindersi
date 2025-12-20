
'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth } from "firebase-admin/auth";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question, Assignment, ScoreEvent } from "@/lib/types";

// Helper to serialize any data, converting Timestamps
const serialize = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(serialize);
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = serialize(data[key]);
            }
        }
        return newObj;
    }
    return data;
};

export async function getAllUsers(): Promise<UserProfile[]> {
    const db = getAdminDb();
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return serialize({ uid: doc.id, ...data }) as UserProfile;
    });
}

// ... other superadmin actions like deleteUser, updateUser, resetScores remain the same ...
export async function deleteUserFromFirestore(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    }
    try {
        const auth = getAdminAuth();
        await auth.deleteUser(userId);

        const db = getAdminDb();
        await db.collection('users').doc(userId).delete();

        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting user ${userId}:`, error);
        return { success: false, error: 'Kullanıcı silinirken bir hata oluştu: ' + error.message };
    }
}

export async function updateUser(user: UserProfile): Promise<{ success: boolean; error?: string }> {
    if (!user || !user.uid) {
        return { success: false, error: "Geçersiz kullanıcı verisi." };
    }

    try {
        const db = getAdminDb();
        const auth = getAdminAuth();
        const { uid, email, displayName, password } = user;
        const firestoreData: any = {
            displayName: user.displayName,
            role: user.role,
            class: user.class,
            score: user.score,
        };

        const authUpdatePayload: any = { email, displayName };
        if (password) {
            authUpdatePayload.password = password;
        }
        await auth.updateUser(uid, authUpdatePayload);

        const userRef = db.collection('users').doc(uid);
        await userRef.update(firestoreData);
        
        return { success: true };

    } catch (error: any) {
        console.error("Error updating user:", error);
        return { success: false, error: "Kullanıcı güncellenirken bir hata oluştu: " + error.message };
    }
}

export async function resetAllGeneralScores(): Promise<{success: boolean, error?: string}> {
    try {
        const db = getAdminDb();
        const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
        if (usersSnapshot.empty) {
            return { success: true };
        }
        
        const batch = db.batch();
        usersSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { score: 0 });
        });
        
        await batch.commit();
        return { success: true };
        
    } catch (error: any) {
        console.error("Error resetting all scores:", error);
        return { success: false, error: "Puanlar sıfırlanırken bir hata oluştu." };
    }
}

// --- UPDATED EXPORT FUNCTION ---
export async function exportAllData(
    dataType: 'users' | 'curriculum' | 'questions' | 'examQuestions' | 'assignments' | 'scoreEvents' | 'activity-items' | 'yazilacaklar',
    filters: { classId?: string; courseId?: string; unitId?: string; topicId?: string; }
) {
    const db = getAdminDb();
    
    // Base collections
    const collections = {
        users: db.collection("users"),
        classes: db.collection("classes"),
        courses: db.collection("courses"),
        questions: db.collection("questions"),
        examQuestions: db.collection("examQuestions"),
        assignments: db.collection("assignments"),
        scoreEvents: db.collection("scoreEvents"),
        activityItems: db.collection("activityItems"),
    };

    let query: FirebaseFirestore.Query = collections[dataType === 'curriculum' ? 'courses' : dataType === 'activity-items' ? 'activityItems' : dataType];
    
    // Apply filters. This is a simplified filtering logic.
    if (filters.topicId && filters.topicId !== 'all') {
        query = query.where('topicId', '==', filters.topicId);
    } else if (filters.unitId && filters.unitId !== 'all') {
        query = query.where('unitId', '==', filters.unitId);
    } else if (filters.courseId && filters.courseId !== 'all') {
        query = query.where('courseId', '==', filters.courseId);
    } else if (filters.classId && filters.classId !== 'all') {
         // This is complex because questions don't have a direct classId.
         // For simplicity, we'll filter on the client if a class is selected, or do a more complex query if needed.
         // Here, we just add a courseId filter if we can derive it.
         const coursesInClass = (await collections.courses.where('classId', '==', filters.classId).get()).docs.map(d => d.id);
         if (coursesInClass.length > 0) {
             query = query.where('courseId', 'in', coursesInClass);
         }
    }
    
    if(dataType === 'yazilacaklar') {
         const topicsSnapshot = await db.collectionGroup('topics').where("writingContent", "!=", null).get();
         const yazilacaklarData = [];
         for (const topicDoc of topicsSnapshot.docs) {
            const topicData = topicDoc.data() as Topic;
            const pathSegments = topicDoc.ref.path.split('/');
            if (pathSegments.length >= 4) {
                const courseId = pathSegments[1];
                const unitId = pathSegments[3];
                const courseRef = db.doc(`courses/${courseId}`);
                const unitRef = db.doc(`courses/${courseId}/units/${unitId}`);
                const [courseSnap, unitSnap] = await Promise.all([courseRef.get(), unitRef.get()]);
                
                yazilacaklarData.push({
                    courseTitle: courseSnap.data()?.title || 'Bilinmeyen Ders',
                    unitTitle: unitSnap.data()?.title || 'Bilinmeyen Ünite',
                    topicTitle: topicData.title,
                    writingContent: topicData.writingContent
                });
            }
         }
         return yazilacaklarData;
    }


    const snapshot = await query.get();
    return snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
}


// This function is no longer used by the UI but kept for potential direct use or reference.
export async function exportDataForStaticSite() {
    // This logic is now handled by more granular functions or could be a separate, more complex build process.
    // For now, it will do nothing to avoid creating a massive, unmanageable file.
    console.log("exportDataForStaticSite is deprecated. Use granular exports.");
    return { success: true, message: "This function is deprecated. Please use granular export buttons." };
}
