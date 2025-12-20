
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

    // Handle 'yazilacaklar' as a special case first
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
    
    const collectionKey = dataType === 'curriculum' ? 'courses' : dataType === 'activity-items' ? 'activityItems' : dataType;
    let query: FirebaseFirestore.Query = collections[collectionKey];
    
    // Apply filters hierarchically
    if (filters.topicId && filters.topicId !== 'all') {
        query = query.where('topicId', '==', filters.topicId);
    } else if (filters.unitId && filters.unitId !== 'all') {
        query = query.where('unitId', '==', filters.unitId);
    } else if (filters.courseId && filters.courseId !== 'all') {
        // If exporting curriculum, just fetch the single course
        if(dataType === 'curriculum') {
             const docSnap = await collections.courses.doc(filters.courseId).get();
             return docSnap.exists() ? [serialize({ id: docSnap.id, ...docSnap.data() })] : [];
        }
        query = query.where('courseId', '==', filters.courseId);
    } else if (filters.classId && filters.classId !== 'all') {
         const coursesInClassQuery = collections.courses.where('classId', '==', filters.classId);
         const coursesInClassSnapshot = await coursesInClassQuery.get();
         const coursesInClassIds = coursesInClassSnapshot.docs.map(d => d.id);
         
         if (coursesInClassIds.length > 0) {
            if (dataType === 'curriculum') {
                const allCoursesSnapshot = await collections.courses.where('id', 'in', coursesInClassIds).get();
                const classCourses = allCoursesSnapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
                // Fetch classes to get className
                const classDoc = await collections.classes.doc(filters.classId).get();
                const className = classDoc.exists() ? classDoc.data()?.name : 'Bilinmeyen Sınıf';
                return classCourses.map(c => ({...c, className}));
            }
            // For other data types that have 'courseId'
            const hasCourseId = ['questions', 'examQuestions', 'activity-items'].includes(dataType);
            if(hasCourseId) {
                query = query.where('courseId', 'in', coursesInClassIds);
            }
            // For users, assignments, scoreEvents, the logic would be more complex and might need separate handling
         } else {
             return [];
         }
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
}


// This function is no longer used by the UI but kept for potential direct use or reference.
export async function exportDataForStaticSite() {
    const db = getAdminDb();

    // 1. Manifest.json (Courses, Units, Topics structure)
    const classesSnapshot = await db.collection("classes").orderBy('createdAt', 'asc').get();
    const coursesSnapshot = await db.collection("courses").get();
    const allCourses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

    const courseGroups = await Promise.all(classesSnapshot.docs.map(async (classDoc) => {
        const classData = classDoc.data() as SchoolClass;
        const coursesInClass = allCourses.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));
        
        const courseFiles = await Promise.all(coursesInClass.map(async (course) => {
            const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
            const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                const unitData = unitDoc.data() as Unit;
                if (!(unitData.isPublished ?? true)) return null;

                const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').orderBy('title').get();
                const topics = topicsSnapshot.docs
                    .map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic))
                    .filter(topic => topic.isPublished ?? true)
                    .map(topic => ({ id: topic.id, title: topic.title, hasOzet: !!topic.htmlContent, hasYazilacaklar: !!topic.writingContent }));

                return {
                    id: unitDoc.id,
                    title: unitData.title,
                    hasUnitOzet: !!unitData.htmlContent,
                    topics,
                };
            }));

            // Write individual course file
            const courseWithUnits = { ...course, units: units.filter(Boolean) };
            await getAdminDb().collection('__static_export').doc(`curriculum_course_${course.id}`).set({
                path: `public/curriculum/courses/${course.id}.json`,
                content: JSON.stringify(courseWithUnits, null, 2)
            });

            return { id: course.id, title: course.title, file: `courses/${course.id}.json` };
        }));

        return { name: classData.name, courses: courseFiles.filter(Boolean) };
    }));
    
    // Add General Courses to each group
    const generalCourses = allCourses.filter(c => !c.classId && (c.isPublished ?? true));
    if (generalCourses.length > 0) {
        courseGroups.forEach(group => {
            generalCourses.forEach(gc => {
                group.courses.push({ id: gc.id, title: gc.title, file: `courses/${gc.id}.json` });
            });
        });
    }

    await getAdminDb().collection('__static_export').doc('curriculum_manifest').set({
        path: 'public/curriculum/manifest.json',
        content: JSON.stringify({ courseGroups }, null, 2)
    });

    // 2. Questions, Activities, Yazilacaklar per topic
    const allTopicsSnapshot = await db.collectionGroup('topics').get();
    for (const topicDoc of allTopicsSnapshot.docs) {
        const topicId = topicDoc.id;
        
        // Questions
        const questionsSnap = await db.collection('questions').where('topicId', '==', topicId).get();
        if (!questionsSnap.empty) {
             await getAdminDb().collection('__static_export').doc(`curriculum_questions_${topicId}`).set({
                path: `public/curriculum/questions/${topicId}.json`,
                content: JSON.stringify(questionsSnap.docs.map(d => ({id: d.id, ...d.data()})), null, 2)
            });
        }
       
        // Activities
        const activitiesSnap = await db.collection('activityItems').where('topicId', '==', topicId).get();
        if (!activitiesSnap.empty) {
             await getAdminDb().collection('__static_export').doc(`curriculum_activities_${topicId}`).set({
                path: `public/curriculum/activities/${topicId}.json`,
                content: JSON.stringify(activitiesSnap.docs.map(d => ({id: d.id, ...d.data()})), null, 2)
            });
        }

        // Yazilacaklar
        const topicData = topicDoc.data() as Topic;
        if(topicData.writingContent) {
             await getAdminDb().collection('__static_export').doc(`curriculum_yazilacaklar_${topicId}`).set({
                path: `public/curriculum/yazilacaklar/${topicId}.json`,
                content: JSON.stringify(topicData.writingContent, null, 2)
            });
        }
    }
    
    return { success: true, message: "Statik site verileri oluşturma görevi tetiklendi." };
}

    

    