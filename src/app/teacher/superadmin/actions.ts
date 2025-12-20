

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

    // 1. Get filtered IDs based on selections
    const { classId, courseId, unitId, topicId } = filters;
    let relevantCourseIds: string[] = [];
    let relevantUnitIds: string[] = [];
    let relevantTopicIds: string[] = [];

    // Get all courses to build hierarchy
    const allCoursesSnap = await db.collection('courses').get();
    const allCourses = allCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

    if (courseId && courseId !== 'all') {
        relevantCourseIds.push(courseId);
    } else if (classId && classId !== 'all') {
        relevantCourseIds = allCourses.filter(c => c.classId === classId).map(c => c.id);
    } else {
        relevantCourseIds = allCourses.map(c => c.id);
    }

    if (unitId && unitId !== 'all') {
        relevantUnitIds.push(unitId);
    } else if (relevantCourseIds.length > 0) {
        const unitPromises = relevantCourseIds.map(cId => db.collection(`courses/${cId}/units`).get());
        const unitSnaps = await Promise.all(unitPromises);
        relevantUnitIds = unitSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
    }

    if (topicId && topicId !== 'all') {
        relevantTopicIds.push(topicId);
    } else if (relevantUnitIds.length > 0) {
         const topicPromises: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
         relevantCourseIds.forEach(cId => {
             relevantUnitIds.forEach(uId => {
                 // Check if unit belongs to course before querying
                 if (allCourses.find(c => c.id === cId)?.units?.find((u: any) => u.id === uId)) {
                     topicPromises.push(db.collection(`courses/${cId}/units/${uId}/topics`).get());
                 }
             });
         });
         const topicSnaps = await Promise.all(topicPromises);
         relevantTopicIds = topicSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
    }
    
    // --- SPECIAL HANDLERS ---
    if (dataType === 'yazilacaklar') {
         const topicsQuery = relevantTopicIds.length > 0 
            ? db.collectionGroup('topics').where('__name__', 'in', relevantTopicIds.map(id => `courses/${filters.courseId}/units/${filters.unitId}/topics/${id}`))
            : db.collectionGroup('topics');
        const topicsSnapshot = await topicsQuery.where("writingContent", "!=", null).get();

        const yazilacaklarData = [];
        for (const topicDoc of topicsSnapshot.docs) {
           const topicData = topicDoc.data() as Topic;
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
        return serialize(yazilacaklarData);
    }
    
    if (dataType === 'curriculum') {
        const classesSnap = await db.collection('classes').get();
        const classes = classesSnap.docs.map(d => ({id: d.id, ...d.data()}));
        const coursesToExport = allCourses.filter(c => relevantCourseIds.includes(c.id));

        const curriculumData = await Promise.all(coursesToExport.map(async course => {
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
    
    // --- GENERAL DATA FETCHING ---
    const collectionMap = {
        users: db.collection("users"),
        questions: db.collection("questions"),
        examQuestions: db.collection("examQuestions"),
        assignments: db.collection("assignments"),
        scoreEvents: db.collection("scoreEvents"),
        'activity-items': db.collection("activityItems"),
    };
    
    const collectionKey = dataType as keyof typeof collectionMap;
    if (!collectionMap[collectionKey]) {
        throw new Error(`Invalid data type: ${dataType}`);
    }

    let query: FirebaseFirestore.Query = collectionMap[collectionKey];

    if (relevantTopicIds.length > 0 && ['questions', 'activity-items'].includes(collectionKey)) {
        query = query.where('topicId', 'in', relevantTopicIds);
    } else if (relevantUnitIds.length > 0 && ['questions', 'activity-items'].includes(collectionKey)) {
        query = query.where('unitId', 'in', relevantUnitIds);
    } else if (relevantCourseIds.length > 0 && ['questions', 'activity-items', 'examQuestions'].includes(collectionKey)) {
        query = query.where('courseId', 'in', relevantCourseIds);
    } else if (classId && classId !== 'all' && ['assignments'].includes(collectionKey)) {
        query = query.where('classId', '==', classId);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
}


export async function exportDataForStaticSite() {
    const db = getAdminDb();

    const collectionsToExport = ['classes', 'courses', 'questions', 'activityItems'];
    for (const collectionName of collectionsToExport) {
        const snapshot = await db.collection(collectionName).get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         await db.collection('__static_export').doc(`curriculum_${collectionName}`).set({
            path: `public/curriculum/${collectionName}.json`,
            content: JSON.stringify(data.map(serialize), null, 2)
        });
    }

    const coursesSnapshot = await db.collection("courses").get();
    for (const courseDoc of coursesSnapshot.docs) {
        const courseId = courseDoc.id;
        const unitsSnapshot = await db.collection('courses').doc(courseId).collection('units').get();
        for (const unitDoc of unitsSnapshot.docs) {
            const unitId = unitDoc.id;
            const topicsSnapshot = await db.collection('courses').doc(courseId).collection('units').doc(unitId).collection('topics').get();
            const topics = topicsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
            
            if(!topicsSnapshot.empty) {
                await db.collection('__static_export').doc(`curriculum_topics_${unitId}`).set({
                    path: `public/curriculum/topics/${unitId}.json`,
                    content: JSON.stringify(serialize(topics), null, 2)
                });
            }
        }
    }
    
    // Create Yazilacaklar & Ozetler from Topics
    const allTopicsSnapshot = await db.collectionGroup('topics').get();
    for (const topicDoc of allTopicsSnapshot.docs) {
        const topicData = topicDoc.data() as Topic;
        // Yazilacaklar
        if(topicData.writingContent && (topicData.writingContent.notes?.length || topicData.writingContent.conceptDefinitions?.length)) {
             await db.collection('__static_export').doc(`curriculum_yazilacaklar_${topicDoc.id}`).set({
                path: `public/curriculum/yazilacaklar/${topicDoc.id}.json`,
                content: JSON.stringify(serialize(topicData.writingContent), null, 2)
            });
        }
        // Ozetler
        if(topicData.htmlContent) {
             await db.collection('__static_export').doc(`curriculum_ozetler_${topicDoc.id}`).set({
                path: `public/curriculum/ozetler/${topicDoc.id}.json`,
                content: JSON.stringify({ htmlContent: topicData.htmlContent }, null, 2)
            });
        }
    }
     // Ozetler for Units
    const allUnitsSnapshot = await db.collectionGroup('units').get();
    for (const unitDoc of allUnitsSnapshot.docs) {
        const unitData = unitDoc.data() as Unit;
        if(unitData.htmlContent) {
             await db.collection('__static_export').doc(`curriculum_ozetler_unit_${unitDoc.id}`).set({
                path: `public/curriculum/ozetler/unit_${unitDoc.id}.json`,
                content: JSON.stringify({ htmlContent: unitData.htmlContent }, null, 2)
            });
        }
    }


    // Create a manifest file
    const classesSnapshotForManifest = await db.collection("classes").orderBy('createdAt', 'asc').get();
    const coursesSnapshotForManifest = await db.collection("courses").get();
    const allCoursesForManifest = coursesSnapshotForManifest.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

    const manifestCourseGroups = await Promise.all(classesSnapshotForManifest.docs.map(async (classDoc) => {
        const classData = classDoc.data() as SchoolClass;
        const coursesInClass = allCoursesForManifest.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));
        
        const courseFiles = await Promise.all(coursesInClass.map(async (course) => {
            const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
            const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                const unitData = unitDoc.data() as Unit;
                if (!(unitData.isPublished ?? true)) return null;

                const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').orderBy('title').get();
                const topics = topicsSnapshot.docs
                    .map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic))
                    .filter(topic => topic.isPublished ?? true);

                return {
                    id: unitDoc.id,
                    title: unitData.title,
                    hasUnitOzet: !!unitData.htmlContent,
                    topics: topics.map(t => ({
                         id: t.id, 
                         title: t.title,
                         hasYazilacaklarContent: !!(t.writingContent?.notes?.length || t.writingContent?.conceptDefinitions?.length),
                         hasOzetContent: !!t.htmlContent,
                    })),
                };
            }));

            return { id: course.id, title: course.title, units: units.filter(Boolean) };
        }));

        return { name: classData.name, courses: courseFiles.filter(Boolean) };
    }));

    await getAdminDb().collection('__static_export').doc('curriculum_manifest').set({
        path: 'public/curriculum/manifest_v2.json',
        content: JSON.stringify({ courseGroups: manifestCourseGroups }, null, 2)
    });


    return { success: true, message: "Statik site verileri oluşturma görevi tetiklendi." };
}

