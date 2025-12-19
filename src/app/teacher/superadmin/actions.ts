

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

        const [coursesSnap, classesSnap] = await Promise.all([
            db.collection("courses").where('isPublished', '==', true).get(),
            db.collection("classes").orderBy('name').get()
        ]);

        const allCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));

        const courseGroups: { name: string, courses: any[] }[] = [];

        for (const cls of allClasses) {
            const classGroup = {
                name: cls.name,
                courses: [] as any[]
            };

            const coursesForClass = allCourses.filter(course => course.classId === cls.id);

            for (const course of coursesForClass) {
                const unitsSnapshot = await db.collection(`courses/${course.id}/units`).where('isPublished', '==', true).orderBy("title").get();
                const units = [];
                for (const unitDoc of unitsSnapshot.docs) {
                    const unitData = unitDoc.data() as Unit;
                    
                    const topicsSnapshot = await db.collection(`courses/${course.id}/units/${unitDoc.id}/topics`).where('isPublished', '==', true).orderBy("title").get();
                    const topics = topicsSnapshot.docs
                        .map(topicDoc => {
                            const topicData = topicDoc.data() as Topic;
                            const hasYazilacaklar = !!topicData.writingContent && (topicData.writingContent.notes.length > 0 || topicData.writingContent.conceptDefinitions.length > 0);
                            const hasOzet = !!topicData.htmlContent;
                            
                            if (hasYazilacaklar || hasOzet) {
                                return { id: topicDoc.id, title: topicData.title, hasYazilacaklar, hasOzet };
                            }
                            return null;
                        }).filter(Boolean);

                    if (topics.length > 0 || unitData.htmlContent) {
                         units.push({
                            id: unitDoc.id,
                            title: unitData.title,
                            topics: topics,
                            hasUnitOzet: !!unitData.htmlContent
                        });
                    }
                }
                
                if (units.length > 0) {
                    classGroup.courses.push({
                        id: course.id,
                        title: course.title,
                        units: units
                    });
                }
            }
             if (classGroup.courses.length > 0) {
                courseGroups.push(classGroup);
            }
        }
        
        // Add "Genel" courses to every class group for simplicity, or handle separately
        const generalCourses = allCourses.filter(course => !course.classId);
        if (generalCourses.length > 0) {
             courseGroups.push({
                name: "Genel",
                courses: generalCourses.map(c => ({...c, units:[]})) // units will be populated below
            });
        }
        
        // This is a simplified manifest structure
        const manifest = {
            courseGroups: courseGroups
        };

        await fs.writeFile(path.join(curriculumDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        
        // Export Questions, ActivityItems, Yazilacaklar
        const [questionsSnapshot, activityItemsSnapshot, yazilacaklarTopicsSnapshot] = await Promise.all([
            db.collection("questions").get(),
            db.collection("activityItems").get(),
            db.collectionGroup('topics').where("writingContent", "!=", null).get()
        ]);
        
        const groupAndSave = async (snapshot: FirebaseFirestore.QuerySnapshot, folder: string) => {
            const itemsByTopic: { [key: string]: any[] } = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const topicId = data.topicId;
                if(topicId) {
                    if (!itemsByTopic[topicId]) itemsByTopic[topicId] = [];
                    itemsByTopic[topicId].push({ id: doc.id, ...data });
                }
            });
            for (const topicId in itemsByTopic) {
                await fs.writeFile(path.join(curriculumDir, folder, `${topicId}.json`), JSON.stringify(itemsByTopic[topicId], null, 2));
            }
        };

        await groupAndSave(questionsSnapshot, 'questions');
        await groupAndSave(activityItemsSnapshot, 'activities');

        for (const topicDoc of yazilacaklarTopicsSnapshot.docs) {
            const data = topicDoc.data() as Topic;
            if (data.writingContent) {
                await fs.writeFile(path.join(curriculumDir, 'yazilacaklar', `${topicDoc.id}.json`), JSON.stringify(data.writingContent, null, 2));
            }
        }

        return { success: true, message: "Static site data has been successfully generated." };
    } catch (error: any) {
        console.error("Error exporting data for static site:", error);
        return { success: false, error: "Static site data could not be generated: " + error.message };
    }
}
