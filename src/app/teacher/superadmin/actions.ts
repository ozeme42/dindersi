

'use server';

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question } from "@/lib/types";
import { promises as fs } from 'fs';
import path from 'path';

export async function getAllUsers(): Promise<UserProfile[]> {
    const db = getAdminDb();
    const usersSnapshot = await db.collection('users').get();
    return JSON.parse(JSON.stringify(usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))));
}

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


export async function exportAllData(dataType: 'users' | 'curriculum' | 'questions' | 'activity-items' | 'yazilacaklar') {
    const db = getAdminDb();
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
        const db = getAdminDb();
        const publicDir = path.join(process.cwd(), 'public');
        const curriculumDir = path.join(publicDir, 'curriculum');
        
        await ensureDir(curriculumDir);
        await ensureDir(path.join(curriculumDir, 'questions'));
        await ensureDir(path.join(curriculumDir, 'activities'));
        await ensureDir(path.join(curriculumDir, 'yazilacaklar'));

        // 1. Fetch all curriculum data in parallel
        const [coursesSnap, classesSnap] = await Promise.all([
            db.collection("courses").get(),
            db.collection("classes").orderBy('name').get()
        ]);

        const allCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));

        // 2. Build the manifest structure
        const manifest = { courseGroups: [] as any[] };
        const courseGroups: { [className: string]: any[] } = {};

        for (const course of allCourses) {
            // Skip courses that are not published
            if (course.isPublished === false) continue;
            
            const className = allClasses.find(c => c.id === course.classId)?.name || 'Genel';
            if (!courseGroups[className]) {
                courseGroups[className] = [];
            }

            const unitsSnapshot = await db.collection(`courses/${course.id}/units`).orderBy("title").get();
            const units = [];
            for (const unitDoc of unitsSnapshot.docs) {
                const unitData = unitDoc.data() as Unit;
                // Skip unpublished units
                if (unitData.isPublished === false) continue;

                const topicsSnapshot = await db.collection(`courses/${course.id}/units/${unitDoc.id}/topics`).orderBy("title").get();
                const topics = topicsSnapshot.docs
                    .map(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                        if (topicData.isPublished === false) return null;
                        
                        const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                        const hasOzet = !!topicData.htmlContent;
                        // For games, assume all topics are relevant for now.
                        // For a more specific check, you'd need to query activities/questions collections here.
                        return { id: topicDoc.id, title: topicDoc.data().title, hasYazilacaklar, hasOzet };
                    })
                    .filter(Boolean); // Remove nulls (unpublished topics)

                // Only add unit if it has topics
                if (topics.length > 0 || unitData.htmlContent) {
                     units.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topics,
                        hasUnitOzet: !!unitData.htmlContent
                    });
                }
            }
            
            // Only add course if it has units with content
            if (units.length > 0) {
                 courseGroups[className].push({
                    id: course.id,
                    title: course.title,
                    units: units
                });
            }
        }
        
        manifest.courseGroups = Object.entries(courseGroups)
            .map(([name, courses]) => ({ name, courses }))
            .sort((a,b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));

        await fs.writeFile(path.join(curriculumDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // 3. Export Questions, ActivityItems, Yazilacaklar grouped by topicId
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
