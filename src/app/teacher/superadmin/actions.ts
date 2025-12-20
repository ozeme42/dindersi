

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

export async function exportAllData(
    dataType: 'users' | 'curriculum' | 'questions' | 'examQuestions' | 'assignments' | 'scoreEvents' | 'activity-items' | 'yazilacaklar',
    filters: { classId?: string | null; courseId?: string | null; unitId?: string | null; topicId?: string | null; }
) {
    const db = getAdminDb();
    const { classId, courseId, unitId, topicId } = filters;

    // --- HIERARCHICAL ID GATHERING ---
    let relevantCourseIds: string[] = [];
    if (courseId && courseId !== 'all') {
        relevantCourseIds = [courseId];
    } else if (classId && classId !== 'all') {
        const coursesSnap = await db.collection('courses').where('classId', '==', classId).get();
        relevantCourseIds = coursesSnap.docs.map(doc => doc.id);
    } else {
        const allCoursesSnap = await db.collection('courses').get();
        relevantCourseIds = allCoursesSnap.docs.map(doc => doc.id);
    }

    let relevantUnitIds: string[] = [];
    if (unitId && unitId !== 'all') {
        relevantUnitIds = [unitId];
    } else if (relevantCourseIds.length > 0) {
        const unitPromises = relevantCourseIds.map(cId => db.collection(`courses/${cId}/units`).get());
        relevantUnitIds = (await Promise.all(unitPromises)).flatMap(snap => snap.docs.map(doc => doc.id));
    }

    let relevantTopicIds: string[] = [];
    if (topicId && topicId !== 'all') {
        relevantTopicIds = [topicId];
    } else if (relevantCourseIds.length > 0 && relevantUnitIds.length > 0) {
        const topicPromises = relevantCourseIds.flatMap(cId => 
            relevantUnitIds.map(uId => db.collection(`courses/${cId}/units/${uId}/topics`).get())
        );
        relevantTopicIds = (await Promise.all(topicPromises)).flatMap(snap => snap.docs.map(doc => doc.id));
    }


    // --- DATA FETCHING BASED ON TYPE ---

    const fetchCollectionByFilter = async (collectionName: string, field: string, ids: string[]) => {
        if (ids.length === 0 && (filters.classId || filters.courseId || filters.unitId || filters.topicId)) {
            return []; // If filters are present but no relevant IDs found, return empty
        }
        let query: FirebaseFirestore.Query = db.collection(collectionName);
        if (ids.length > 0) {
            // Firestore 'in' query supports max 30 items. We need to chunk.
            const chunks: string[][] = [];
            for (let i = 0; i < ids.length; i += 30) {
                chunks.push(ids.slice(i, i + 30));
            }
            const chunkPromises = chunks.map(chunk => query.where(field, 'in', chunk).get());
            const snapshots = await Promise.all(chunkPromises);
            return snapshots.flatMap(snap => snap.docs.map(doc => serialize({ id: doc.id, ...doc.data() })));
        }
        // No filter, fetch all
        const snapshot = await query.get();
        return snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
    };

    switch (dataType) {
        case 'users':
            return getAllUsers();
        case 'curriculum': {
            const classesSnap = await db.collection('classes').get();
            const classes = classesSnap.docs.map(d => ({id: d.id, ...d.data()}));
            const coursesToExport = (await fetchCollectionByFilter('courses', '__name__', relevantCourseIds));
            
            const curriculumData = await Promise.all(coursesToExport.map(async (course: any) => {
                const className = classes.find(c => c.id === course.classId)?.name || 'Genel';
                const unitsSnap = await db.collection(`courses/${course.id}/units`).get();
                const units = await Promise.all(unitsSnap.docs.map(async unitDoc => {
                    const topicsSnap = await db.collection(`courses/${course.id}/units/${unitDoc.id}/topics`).get();
                    const topics = topicsSnap.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() }));
                    return { id: unitDoc.id, ...unitDoc.data(), topics };
                }));
                return { ...course, className, units };
            }));
            return serialize(curriculumData);
        }
        case 'questions':
            return fetchCollectionByFilter('questions', 'topicId', relevantTopicIds);
        case 'examQuestions':
             return fetchCollectionByFilter('examQuestions', 'topicId', relevantTopicIds);
        case 'activity-items':
            return fetchCollectionByFilter('activityItems', 'topicId', relevantTopicIds);
        case 'assignments':
             return fetchCollectionByFilter('assignments', 'classId', classId && classId !== 'all' ? [classId] : []);
        case 'scoreEvents':
            // Score events don't have hierarchical IDs, fetching all for now. A more complex query would be needed for filtering.
            const snapshot = await db.collection('scoreEvents').orderBy('timestamp', 'desc').limit(5000).get();
            return snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));

        case 'yazilacaklar': {
            const topicsQuery = relevantTopicIds.length > 0
                ? db.collectionGroup('topics').where('__name__', 'in', relevantTopicIds.map(id => `topics/${id}`)) // This part is tricky with collectionGroup
                : db.collectionGroup('topics');
            
            // Due to collectionGroup query limitations, a simpler approach is better. Fetch filtered topics and process.
            const yazilacaklarData = [];
            const allTopicsSnap = await db.collectionGroup('topics').get();

            for (const topicDoc of allTopicsSnap.docs) {
                if (relevantTopicIds.length > 0 && !relevantTopicIds.includes(topicDoc.id)) continue;
                
                const topicData = topicDoc.data() as Topic;
                if (topicData.writingContent && (topicData.writingContent.notes?.length || topicData.writingContent.conceptDefinitions?.length)) {
                    const pathSegments = topicDoc.ref.path.split('/');
                     if (pathSegments.length >= 4) {
                       const cId = pathSegments[1];
                       const uId = pathSegments[3];
                       const courseRef = db.doc(`courses/${cId}`);
                       const unitRef = db.doc(`courses/${cId}/units/${uId}`);
                       const [courseSnap, unitSnap] = await Promise.all([courseRef.get(), unitRef.get()]);
                       
                       yazilacaklarData.push({
                           courseTitle: courseSnap.data()?.title || 'Bilinmeyen Ders',
                           unitTitle: unitSnap.data()?.title || 'Bilinmeyen Ünite',
                           topicTitle: topicData.title,
                           writingContent: topicData.writingContent
                       });
                   }
                }
            }
            return serialize(yazilacaklarData);
        }
        default:
            throw new Error(`Invalid data type: ${dataType}`);
    }
}


export async function exportDataForStaticSite() {
    const db = getAdminDb();
    const allDocsToWrite: { path: string, content: string }[] = [];

    // 1. Export flat collections
    const collectionsToExport = ['classes', 'courses', 'questions', 'activityItems', 'examQuestions'];
    for (const collectionName of collectionsToExport) {
        const snapshot = await db.collection(collectionName).get();
        const data = snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
        allDocsToWrite.push({
            path: `public/curriculum/${collectionName}.json`,
            content: JSON.stringify(data, null, 2)
        });
    }

    // 2. Export subcollections and specific content files
    const coursesSnapshot = await db.collection("courses").get();
    for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data() as Course;
        const courseId = courseDoc.id;

        const unitsSnapshot = await db.collection('courses').doc(courseId).collection('units').get();
        
        // Export ozet for unit if it exists
        const unitDataForCourse = unitsSnapshot.docs.map(doc => serialize({id: doc.id, ...doc.data() as Unit}));
        allDocsToWrite.push({
            path: `public/curriculum/units/${courseId}.json`,
            content: JSON.stringify(unitDataForCourse, null, 2)
        });
        
        for (const unitDoc of unitsSnapshot.docs) {
            const unitData = unitDoc.data() as Unit;
            const unitId = unitDoc.id;

            // Export Ozet for Unit
            if(unitData.htmlContent) {
                allDocsToWrite.push({
                    path: `public/curriculum/ozetler/unit_${unitId}.json`,
                    content: JSON.stringify({ title: unitData.title, htmlContent: unitData.htmlContent }, null, 2)
                });
            }

            // Export topics for unit
            const topicsSnapshot = await db.collection('courses').doc(courseId).collection('units').doc(unitId).collection('topics').get();
            const topics = topicsSnapshot.docs.map(d => serialize({id: d.id, ...d.data()}));
            if(topics.length > 0) {
                 allDocsToWrite.push({
                    path: `public/curriculum/topics/${unitId}.json`,
                    content: JSON.stringify(topics, null, 2)
                });
            }

            // Export content for each topic
            for (const topicDoc of topicsSnapshot.docs) {
                const topicData = topicDoc.data() as Topic;
                // Yazilacaklar
                if(topicData.writingContent && ((topicData.writingContent.notes || []).length > 0 || (topicData.writingContent.conceptDefinitions || []).length > 0)) {
                    allDocsToWrite.push({
                        path: `public/curriculum/yazilacaklar/${topicDoc.id}.json`,
                        content: JSON.stringify(serialize(topicData.writingContent), null, 2)
                    });
                }
                // Ozetler
                if(topicData.htmlContent) {
                    allDocsToWrite.push({
                        path: `public/curriculum/ozetler/${topicDoc.id}.json`,
                        content: JSON.stringify({ title: topicData.title, htmlContent: topicData.htmlContent }, null, 2)
                    });
                }
            }
        }
    }

    // 3. Create a manifest file
    const classesSnapshotForManifest = await db.collection("classes").orderBy('createdAt', 'asc').get();
    const coursesSnapshotForManifest = await db.collection("courses").get();
    const allCoursesForManifest = coursesSnapshotForManifest.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

    const manifestCourseGroups = await Promise.all(classesSnapshotForManifest.docs.map(async (classDoc) => {
        const classData = classDoc.data() as SchoolClass;
        const coursesInClass = allCoursesForManifest.filter(c => c.classId === classDoc.id);

        const courseFiles = await Promise.all(coursesInClass.map(async (course) => {
            const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
            const units = (await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                const unitData = unitDoc.data() as Unit;
                const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                const topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
                const hasAnyContent = !!unitData.htmlContent || topics.some(t => t.writingContent || t.htmlContent);
                return hasAnyContent ? { id: unitDoc.id, title: unitData.title } : null;
            }))).filter(Boolean);

            return units.length > 0 ? { id: course.id, title: course.title, file: `courses/${course.id}.json` } : null;
        }));

        return { name: classData.name, courses: courseFiles.filter(Boolean) };
    }));
    
    // Add "Genel" courses to every class group for simplicity on client side
    const generalCourses = allCoursesForManifest
        .filter(c => !c.classId)
        .map(c => ({ id: c.id, title: c.title, file: `courses/${c.id}.json`}));
    if (generalCourses.length > 0) {
        manifestCourseGroups.forEach(group => {
            group.courses.push(...generalCourses);
        });
    }

    allDocsToWrite.push({
        path: 'public/curriculum/manifest.json',
        content: JSON.stringify({ courseGroups: manifestCourseGroups }, null, 2)
    });
    
    // 4. Batch write all files to the export collection
    const exportBatch = db.batch();
    const exportCollectionRef = db.collection('__static_export');
    
    // Clear old data first
    const oldFiles = await exportCollectionRef.get();
    oldFiles.forEach(doc => exportBatch.delete(doc.ref));

    allDocsToWrite.forEach(fileData => {
        const docRef = doc(exportCollectionRef);
        exportBatch.set(docRef, fileData);
    });

    await exportBatch.commit();
    
    return { success: true, message: `${allDocsToWrite.length} dosya oluşturma görevi tetiklendi.` };
}
