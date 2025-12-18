
'use server';

import { getAdminApp } from "@/lib/firebase-admin";
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, collection, getDocs, query, orderBy, where, doc, getDoc, deleteDoc, updateDoc, Timestamp } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question } from "@/lib/types";
import { promises as fs } from 'fs';
import path from 'path';

const db = getFirestore(getAdminApp());

export async function getAllUsers(): Promise<UserProfile[]> {
    const usersSnapshot = await db.collection('users').get();
    return JSON.parse(JSON.stringify(usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))));
}

export async function deleteUserFromFirestore(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    }
    try {
        // Delete from Authentication
        const auth = getAuth(getAdminApp());
        await auth.deleteUser(userId);

        // Delete from Firestore
        await db.collection('users').doc(userId).delete();

        // Note: Subcollections are not deleted automatically. This requires a Cloud Function for a full cleanup.
        // For this app's purpose, this is sufficient.

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
        const auth = getAuth(getAdminApp());
        const { uid, email, displayName, password } = user;
        const firestoreData: any = {
            displayName: user.displayName,
            role: user.role,
            class: user.class,
            score: user.score,
        };

        // Update Authentication
        const authUpdatePayload: any = { email, displayName };
        if (password) {
            authUpdatePayload.password = password;
        }
        await auth.updateUser(uid, authUpdatePayload);

        // Update Firestore
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


export async function exportAllData(dataType: 'users' | 'curriculum' | 'questions' | 'activity-items' | 'yazilacaklar') {
    switch (dataType) {
        case 'users':
            return await getAllUsers();
        case 'curriculum':
            const coursesSnapshot = await db.collection("courses").orderBy("title").get();
            const courses = [];
            for (const courseDoc of coursesSnapshot.docs) {
                const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
                const unitsSnapshot = await db.collection(`courses/${courseDoc.id}/units`).orderBy("title").get();
                const units = [];
                for (const unitDoc of unitsSnapshot.docs) {
                    const unitData = { id: unitDoc.id, ...unitDoc.data() } as Unit;
                    const topicsSnapshot = await db.collection(`courses/${courseDoc.id}/units/${unitDoc.id}/topics`).orderBy("title").get();
                    unitData.topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, title: topicDoc.data().title }));
                    units.push(unitData);
                }
                courseData.units = units;
                courses.push(courseData);
            }
            return courses;
        case 'questions':
            const questionsSnapshot = await db.collection("questions").orderBy("topicId").get();
            return questionsSnapshot.docs.map(doc => {
                const { id, classId, className, courseId, unitId, createdAt, ...rest } = doc.data();
                return rest;
            });
        case 'activity-items':
            const activityItemsSnapshot = await db.collection("activityItems").orderBy("topicId").get();
            return activityItemsSnapshot.docs.map(doc => {
                 const { id, courseId, unitId, createdAt, ...rest } = doc.data();
                 return rest;
            });
        case 'yazilacaklar':
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
        default:
            throw new Error("Invalid data type for export");
    }
}

async function ensureDir(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch (e) {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

export async function exportDataForStaticSite() {
    try {
        const publicDir = path.join(process.cwd(), 'public');
        const curriculumDir = path.join(publicDir, 'curriculum');
        
        await ensureDir(curriculumDir);
        await ensureDir(path.join(curriculumDir, 'questions'));
        await ensureDir(path.join(curriculumDir, 'activities'));
        await ensureDir(path.join(curriculumDir, 'yazilacaklar'));

        // 1. Export Curriculum Structure
        const coursesQuery = db.collection("courses");
        const coursesSnapshot = await coursesQuery.get();
        const manifest = { courseGroups: [] as any[] };
        
        const courseGroups: { [key: string]: any[] } = {};

        for (const courseDoc of coursesSnapshot.docs) {
            const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
            
            const unitsSnapshot = await db.collection(`courses/${courseDoc.id}/units`).orderBy("title").get();
            const units = [];
            for (const unitDoc of unitsSnapshot.docs) {
                const unitData = { id: unitDoc.id, title: unitDoc.data().title } as Partial<Unit>;
                const topicsSnapshot = await db.collection(`courses/${courseDoc.id}/units/${unitDoc.id}/topics`).orderBy("title").get();
                unitData.topics = topicsSnapshot.docs.map(topicDoc => {
                    const topicData = topicDoc.data();
                    return { id: topicDoc.id, title: topicData.title, htmlContent: !!topicData.htmlContent };
                });
                units.push(unitData);
            }
            
            const courseContent = { ...courseData, units };
            const courseFilePath = `${courseData.id}.json`;
            await fs.writeFile(path.join(curriculumDir, courseFilePath), JSON.stringify(courseContent, null, 2));

            const groupTitle = courseData.title.toUpperCase() === 'DKAB' ? 'Din Kültürü ve Ahlak Bilgisi' : courseData.title.toUpperCase() === 'SİYER' ? 'Peygamberimizin Hayatı (Siyer)' : courseData.title;
            if (!courseGroups[groupTitle]) {
                courseGroups[groupTitle] = [];
            }
            courseGroups[groupTitle].push({
                id: courseData.id,
                title: courseData.title,
                className: courseData.className,
                file: courseFilePath
            });
        }
        
        manifest.courseGroups = Object.entries(courseGroups).map(([title, courses]) => ({ title, courses }));
        await fs.writeFile(path.join(curriculumDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // 2. Export Questions, ActivityItems, Yazilacaklar grouped by topicId
        const [questionsSnapshot, activityItemsSnapshot, topicsSnapshot] = await Promise.all([
            db.collection("questions").get(),
            db.collection("activityItems").get(),
            db.collectionGroup('topics').where("writingContent", "!=", null).get()
        ]);

        const questionsByTopic: { [key: string]: any[] } = {};
        questionsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!questionsByTopic[data.topicId]) questionsByTopic[data.topicId] = [];
            questionsByTopic[data.topicId].push({ id: doc.id, ...data });
        });

        const activityItemsByTopic: { [key: string]: any[] } = {};
        activityItemsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!activityItemsByTopic[data.topicId]) activityItemsByTopic[data.topicId] = [];
            activityItemsByTopic[data.topicId].push({ id: doc.id, ...data });
        });
        
        const yazilacaklarByTopic: { [key: string]: any } = {};
        for(const topicDoc of topicsSnapshot.docs) {
             const data = topicDoc.data() as Topic;
             if (data.writingContent) {
                 yazilacaklarByTopic[topicDoc.id] = data.writingContent;
             }
        }
        
        for (const topicId in questionsByTopic) {
            await fs.writeFile(path.join(curriculumDir, 'questions', `${topicId}.json`), JSON.stringify(questionsByTopic[topicId], null, 2));
        }

        for (const topicId in activityItemsByTopic) {
            await fs.writeFile(path.join(curriculumDir, 'activities', `${topicId}.json`), JSON.stringify(activityItemsByTopic[topicId], null, 2));
        }
        
        for (const topicId in yazilacaklarByTopic) {
             await fs.writeFile(path.join(curriculumDir, 'yazilacaklar', `${topicId}.json`), JSON.stringify(yazilacaklarByTopic[topicId], null, 2));
        }

        return { success: true, message: "Static site data has been successfully generated." };
    } catch (error: any) {
        console.error("Error exporting data for static site:", error);
        return { success: false, error: "Static site data could not be generated: " + error.message };
    }
}
