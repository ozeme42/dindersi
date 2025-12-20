

'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question } from "@/lib/types";
import { promises as fs } from 'fs';
import path from 'path';

export async function getAllUsers(): Promise<UserProfile[]> {
    const db = getAdminDb();
    const usersSnapshot = await db.collection('users').get();
    return JSON.parse(JSON.stringify(usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            uid: doc.id, 
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : null
        } as UserProfile
    })));
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
        case 'curriculum': {
            const classesSnapshot = await db.collection("classes").get();
            const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as SchoolClass }));
            const classMap = new Map(classesData.map(c => [c.id, c.name]));

            const coursesSnapshot = await db.collection("courses").orderBy("title").get();
            const courses = [];
            for (const courseDoc of coursesSnapshot.docs) {
                const courseData = { 
                    id: courseDoc.id, 
                    ...courseDoc.data(),
                    className: classMap.get(courseDoc.data().classId) || 'Genel' 
                } as Course;
                
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
        }
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
        const questionsDir = path.join(curriculumDir, 'questions');
        const activitiesDir = path.join(curriculumDir, 'activities');
        const yazilacaklarDir = path.join(curriculumDir, 'yazilacaklar');
        
        await Promise.all([
            ensureDir(questionsDir),
            ensureDir(activitiesDir),
            ensureDir(yazilacaklarDir)
        ]);
        
        const [classesSnap, coursesSnap, questionsSnap, activitiesSnap] = await Promise.all([
            db.collection('classes').get(),
            db.collection('courses').get(),
            db.collection('questions').get(),
            db.collection('activityItems').get()
        ]);

        const allQuestions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allActivities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const classMap = new Map(classesSnap.docs.map(doc => [doc.id, doc.data().name]));

        const courseGroups: { name: string; courses: any[] }[] = classesSnap.docs.map(doc => ({
            name: doc.data().name,
            courses: [],
        }));
        const generalCourses: any[] = [];
        
        for (const courseDoc of coursesSnap.docs) {
            const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
            if (courseData.isPublished === false) continue;
            
            const unitsSnap = await db.collection(`courses/${courseDoc.id}/units`).orderBy('title').get();
            const units = [];

            for (const unitDoc of unitsSnap.docs) {
                const unitData = unitDoc.data() as Unit;
                if (unitData.isPublished === false) continue;

                const topicsSnap = await db.collection(`courses/${courseDoc.id}/units/${unitDoc.id}/topics`).orderBy('title').get();
                const topics = [];
                for (const topicDoc of topicsSnap.docs) {
                    const topicData = topicDoc.data() as Topic;
                    if (topicData.isPublished === false) continue;

                    const topicId = topicDoc.id;
                    const topicQuestions = allQuestions.filter(q => q.topicId === topicId);
                    const topicActivities = allActivities.filter(a => a.topicId === topicId);
                    
                    if (topicQuestions.length > 0) {
                        await fs.writeFile(path.join(questionsDir, `${topicId}.json`), JSON.stringify(topicQuestions));
                    }
                    if (topicActivities.length > 0) {
                        await fs.writeFile(path.join(activitiesDir, `${topicId}.json`), JSON.stringify(topicActivities));
                    }
                    if (topicData.writingContent && (topicData.writingContent.notes.length > 0 || topicData.writingContent.conceptDefinitions.length > 0)) {
                        await fs.writeFile(path.join(yazilacaklarDir, `${topicId}.json`), JSON.stringify(topicData.writingContent));
                    }
                    
                    topics.push({ id: topicId, title: topicData.title });
                }
                 if(topics.length > 0) {
                    units.push({ id: unitDoc.id, title: unitData.title, topics });
                }
            }

            if (units.length > 0) {
                 const enrichedCourse = { ...courseData, units };
                 if (courseData.classId) {
                    const group = courseGroups.find(g => g.name === classMap.get(courseData.classId));
                    if (group) group.courses.push(enrichedCourse);
                 } else {
                    generalCourses.push(enrichedCourse);
                 }
            }
        }

        if (generalCourses.length > 0) {
             courseGroups.forEach(group => {
                group.courses.push(...generalCourses);
            });
        }
        
        await fs.writeFile(path.join(curriculumDir, 'manifest.json'), JSON.stringify({ courseGroups }));

        return { success: true, message: "Statik site verileri başarıyla oluşturuldu." };

    } catch (error: any) {
        console.error("Error exporting data for static site:", error);
        return { success: false, error: "Statik site verileri oluşturulamadı: " + error.message };
    }
}
