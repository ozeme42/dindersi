

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

    // --- MAPPING DATA ---
    const classesSnap = await db.collection('classes').get();
    const coursesSnap = await db.collection('courses').get();
    const unitsSnap = await db.collectionGroup('units').get();
    const topicsSnap = await db.collectionGroup('topics').get();
    
    const classesMap = new Map(classesSnap.docs.map(doc => [doc.id, doc.data().name]));
    const coursesMap = new Map(coursesSnap.docs.map(doc => [doc.id, doc.data() as Course]));
    const unitsMap = new Map(unitsSnap.docs.map(doc => [doc.id, doc.data() as Unit]));
    const topicsMap = new Map(topicsSnap.docs.map(doc => [doc.id, doc.data() as Topic]));

    const addNamesToItem = (item: any) => {
        const newItem = { ...item };
        const course = coursesMap.get(item.courseId);
        
        if (course) {
            newItem.courseName = course.title;
            const className = classesMap.get(course.classId);
            if(className) {
                newItem.className = className;
            }
        }
        if (newItem.unitId && unitsMap.has(newItem.unitId)) {
            newItem.unitName = unitsMap.get(newItem.unitId)?.title;
        }
        if (newItem.topicId && topicsMap.has(newItem.topicId)) {
            newItem.topicName = topicsMap.get(newItem.topicId)?.title;
        }
        // Delete IDs after adding names
        delete newItem.classId;
        delete newItem.courseId;
        delete newItem.unitId;
        delete newItem.topicId;
        delete newItem.teacherId; // Often not needed for export
        delete newItem.id;
        delete newItem.createdAt;
        delete newItem.topic; // This is often a duplicate of topicName

        return newItem;
    };
    
    // --- HIERARCHICAL ID GATHERING ---
    const getRelevantIds = async () => {
        let relevantCourseIds: string[] = [];
        if (courseId && courseId !== 'all') {
            relevantCourseIds = [courseId];
        } else if (classId && classId !== 'all') {
            const coursesInClassSnap = await db.collection('courses').where('classId', '==', classId).get();
            relevantCourseIds = coursesInClassSnap.docs.map(doc => doc.id);
        } else {
            relevantCourseIds = coursesSnap.docs.map(doc => doc.id);
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
        } else if (relevantUnitIds.length > 0) {
             const allUnitsWithParentCourse = unitsSnap.docs
                .filter(doc => relevantUnitIds.includes(doc.id))
                .map(doc => ({ id: doc.id, courseId: doc.ref.parent.parent!.id }));
                
            const topicPromises = allUnitsWithParentCourse.map(unitInfo => 
                db.collection(`courses/${unitInfo.courseId}/units/${unitInfo.id}/topics`).get()
            );
            relevantTopicIds = (await Promise.all(topicPromises)).flatMap(snap => snap.docs.map(doc => doc.id));
        }
        return { relevantCourseIds, relevantUnitIds, relevantTopicIds };
    };

    const { relevantCourseIds, relevantUnitIds, relevantTopicIds } = await getRelevantIds();

    const fetchCollectionByFilter = async (collectionName: string, field: string, ids: string[]) => {
        if (ids.length === 0 && (topicId || unitId || courseId || classId)) {
            return [];
        }
        
        let allItems: any[] = [];
        
        if (ids.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < ids.length; i += 30) {
                chunks.push(ids.slice(i, i + 30));
            }
            for (const chunk of chunks) {
                const snapshot = await db.collection(collectionName).where(field, 'in', chunk).get();
                const items = snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
                allItems.push(...items);
            }
        } else {
            const snapshot = await db.collection(collectionName).get();
            allItems = snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
        }
        return allItems;
    };


    switch (dataType) {
        case 'users':
            return (await getAllUsers()).map(user => {
                delete (user as any).uid; 
                return user;
            });
            
        case 'curriculum': {
            const coursesToExport = coursesSnap.docs
                .filter(doc => relevantCourseIds.length === 0 || relevantCourseIds.includes(doc.id))
                .map(doc => serialize({ id: doc.id, ...doc.data() }));

            const curriculumData = await Promise.all(coursesToExport.map(async (course: any) => {
                const className = classesMap.get(course.classId) || 'Genel';
                
                const unitsSnap = await db.collection(`courses/${course.id}/units`).get();
                const units = await Promise.all(unitsSnap.docs
                    .filter(doc => relevantUnitIds.length === 0 || relevantUnitIds.includes(doc.id))
                    .map(async unitDoc => {
                    const topicsSnap = await db.collection(`courses/${course.id}/units/${unitDoc.id}/topics`).get();
                    const topics = topicsSnap.docs
                        .filter(doc => relevantTopicIds.length === 0 || relevantTopicIds.includes(doc.id))
                        .map(topicDoc => {
                             return { title: topicDoc.data().title };
                        });
                    
                    return { title: unitDoc.data().title, topics };
                }));
                
                return { title: course.title, className, units };
            }));
            return curriculumData;
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
            const allUsers = await getAllUsers();
            const userMap = new Map(allUsers.map(u => [u.uid, u.displayName]));
            
            // ScoreEvents don't have topic/unit/course ids, so we filter by user's class if possible
            let userIdsToFilter: string[] = [];
            if (classId && classId !== 'all') {
                const studentsInClass = allUsers.filter(u => u.class && classesMap.get(u.classId) === classesMap.get(classId));
                userIdsToFilter = studentsInClass.map(u => u.uid);
            }

            const eventsData = await fetchCollectionByFilter('scoreEvents', 'userId', userIdsToFilter); 
            return eventsData.map((event: any) => ({
                userName: userMap.get(event.userId) || 'Bilinmeyen Kullanıcı',
                ...event,
            }));
        case 'yazilacaklar': {
            const yazilacaklarData: any[] = [];
            for (const topicDoc of topicsSnap.docs) {
                if (relevantTopicIds.length > 0 && !relevantTopicIds.includes(topicDoc.id)) continue;
                const topicData = topicDoc.data() as Topic;
                if (topicData.writingContent && (topicData.writingContent.notes?.length || topicData.writingContent.conceptDefinitions?.length)) {
                     const pathSegments = topicDoc.ref.path.split('/');
                     if (pathSegments.length >= 4) {
                       const cId = pathSegments[1];
                       const uId = pathSegments[3];
                       const courseTitle = coursesMap.get(cId)?.title || 'Bilinmeyen Ders';
                       const unitTitle = unitsMap.get(uId)?.title || 'Bilinmeyen Ünite';
                       yazilacaklarData.push({ courseTitle, unitTitle, topicTitle: topicData.title, writingContent: topicData.writingContent });
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
    const collectionsToExport = ['classes', 'courses', 'questions', 'examQuestions', 'activityItems'];
    for (const collectionName of collectionsToExport) {
        const snapshot = await db.collection(collectionName).get();
        const data = snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
        allDocsToWrite.push({
            path: `public/curriculum/${collectionName}.json`,
            content: JSON.stringify(data, null, 2)
        });
         // Also create individual topic files for questions & activities
        if (['questions', 'activityItems', 'examQuestions'].includes(collectionName)) {
            const byTopic: { [key: string]: any[] } = {};
            data.forEach((item: any) => {
                if (item.topicId) {
                    if (!byTopic[item.topicId]) byTopic[item.topicId] = [];
                    byTopic[item.topicId].push(item);
                }
            });
            for (const topicId in byTopic) {
                allDocsToWrite.push({
                    path: `public/curriculum/${collectionName}/${topicId}.json`,
                    content: JSON.stringify(byTopic[topicId], null, 2)
                });
            }
        }
    }

    // 2. Export subcollections and specific content files
    const coursesSnapshot = await db.collection("courses").get();
    for (const courseDoc of coursesSnapshot.docs) {
        const courseId = courseDoc.id;
        const unitsSnapshot = await db.collection('courses').doc(courseId).collection('units').get();
        
        // Export units for a course
        const unitDataForCourse = unitsSnapshot.docs.map(doc => serialize({id: doc.id, ...doc.data() as Unit}));
        if (unitDataForCourse.length > 0) {
            allDocsToWrite.push({
                path: `public/curriculum/units/${courseId}.json`,
                content: JSON.stringify(unitDataForCourse, null, 2)
            });
        }
        
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
                const defsForTopicSnap = await db.collection('activityItems').where('topicId', '==', topicDoc.id).where('type', '==', 'definition').get();
                const definitions = defsForTopicSnap.docs.map(d => ({ concept: d.data().content.term, definition: d.data().content.definition }));

                const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || definitions.length > 0;

                if (hasYazilacaklar) {
                     allDocsToWrite.push({
                        path: `public/curriculum/yazilacaklar/${topicDoc.id}.json`,
                        content: JSON.stringify(serialize({
                            notes: topicData.writingContent?.notes || [],
                            conceptDefinitions: definitions,
                        }), null, 2)
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
    const manifestSnapshot = await db.collection("classes").orderBy('createdAt', 'asc').get();
    const allCoursesForManifest = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

    const manifestCourseGroups = await Promise.all(manifestSnapshot.docs.map(async (classDoc) => {
        const classData = classDoc.data() as SchoolClass;
        const coursesInClass = allCoursesForManifest.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));

        const courseFiles = (await Promise.all(coursesInClass.map(async (course) => {
            const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
            const units = (await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                const unitData = unitDoc.data() as Unit;
                if (!(unitData.isPublished ?? true)) return null;

                const hasUnitOzet = !!unitData.htmlContent;
                
                const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                const hasTopicContent = topicsSnapshot.docs.some(topicDoc => {
                    const topicData = topicDoc.data() as Topic;
                    return (topicData.isPublished ?? true) && (!!topicData.htmlContent || !!topicData.writingContent);
                });
                
                return (hasUnitOzet || hasTopicContent) ? { id: unitDoc.id, title: unitData.title } : null;
            }))).filter(Boolean);

            return units.length > 0 ? { id: course.id, title: course.title, file: `units/${course.id}.json` } : null;
        }))).filter(Boolean);

        return { name: classData.name, courses: courseFiles };
    }));

    // Add "Genel" courses to every class group
    const generalCourses = allCoursesForManifest.filter(c => !c.classId && (c.isPublished ?? true)).map(c => ({ id: c.id, title: c.title, file: `units/${c.id}.json`}));
    if (generalCourses.length > 0) {
        manifestCourseGroups.forEach(group => {
            group.courses.push(...generalCourses as any);
        });
    }

    allDocsToWrite.push({
        path: 'public/curriculum/manifest.json',
        content: JSON.stringify({ classGroups: manifestCourseGroups }, null, 2)
    });


    // 4. Batch write all files to the export collection
    const exportBatch = db.batch();
    const exportCollectionRef = db.collection('__static_export');
    
    // Clear old data first
    const oldFiles = await exportCollectionRef.get();
    oldFiles.forEach(doc => exportBatch.delete(doc.ref));

    allDocsToWrite.forEach(fileData => {
        const docRef = db.collection('__static_export').doc();
        exportBatch.set(docRef, fileData);
    });

    await exportBatch.commit();
    
    return { success: true, message: `${allDocsToWrite.length} dosya oluşturma görevi tetiklendi.` };
}
