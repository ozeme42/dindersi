

'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth } from "firebase-admin/auth";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question, Assignment, ScoreEvent } from "@/lib/types";

// Node.js file system and path modules
import fs from 'fs/promises';
import path from 'path';

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
    const [classesSnap, coursesSnap, unitsSnap, topicsSnap] = await Promise.all([
        db.collection('classes').get(),
        db.collection('courses').get(),
        db.collectionGroup('units').get(),
        db.collectionGroup('topics').get()
    ]);

    const classesMap = new Map(classesSnap.docs.map(doc => [doc.id, doc.data().name]));
    const coursesMap = new Map(coursesSnap.docs.map(doc => [doc.id, doc.data() as Course]));
    const unitsMap = new Map(unitsSnap.docs.map(doc => [doc.id, doc.data() as Unit]));
    const topicsMap = new Map(topicsSnap.docs.map(doc => [doc.id, doc.data() as Topic]));
    
    const getRelevantIds = async () => {
        let relevantCourseIds: string[] = [];
        let relevantUnitIds: string[] = [];
        let relevantTopicIds: string[] = [];

        // 1. Determine relevant courses
        if (courseId && courseId !== 'all') {
            relevantCourseIds = [courseId];
        } else if (classId && classId !== 'all') {
            relevantCourseIds = coursesSnap.docs
                .filter(doc => doc.data().classId === classId)
                .map(doc => doc.id);
        } else {
            relevantCourseIds = coursesSnap.docs.map(doc => doc.id);
        }

        // 2. Determine relevant units based on courses
        if (unitId && unitId !== 'all') {
            relevantUnitIds = [unitId];
        } else {
            const unitPromises = relevantCourseIds.map(cId => 
                db.collection(`courses/${cId}/units`).get()
            );
            const unitSnaps = await Promise.all(unitPromises);
            relevantUnitIds = unitSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
        }

        // 3. Determine relevant topics based on units
        if (topicId && topicId !== 'all') {
            relevantTopicIds = [topicId];
        } else {
             const topicPromises = unitsSnap.docs
                .filter(unitDoc => relevantUnitIds.includes(unitDoc.id))
                .map(unitDoc => db.collection(unitDoc.ref.path + '/topics').get());

            const topicSnaps = await Promise.all(topicPromises);
            relevantTopicIds = topicSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
        }
        
        return { relevantCourseIds, relevantUnitIds, relevantTopicIds };
    };

    const addNamesToItem = (item: any) => {
        const newItem: any = { ...item };
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
        
        // Remove technical/unnecessary fields
        const fieldsToRemove = ['id', 'createdAt', 'classId', 'courseId', 'unitId', 'topicId', 'teacherId', 'topic', 'uid', 'password'];
        fieldsToRemove.forEach(field => delete newItem[field]);


        return newItem;
    };
    
    if (dataType === 'yazilacaklar') {
        const { relevantTopicIds } = await getRelevantIds();
        const yazilacaklarData: any[] = [];
        const topicsToProcess = topicsSnap.docs.filter(doc => relevantTopicIds.length === 0 || relevantTopicIds.includes(doc.id));
        
        for (const topicDoc of topicsToProcess) {
            const topicData = topicDoc.data() as Topic;
            const pathSegments = topicDoc.ref.path.split('/');
            const cId = pathSegments[1];
            const uId = pathSegments[3];
            const course = coursesMap.get(cId);

            const defsSnap = await db.collection('activityItems')
                .where('topicId', '==', topicDoc.id)
                .where('type', '==', 'definition')
                .get();

            const conceptDefinitions = defsSnap.docs.map(d => ({
                concept: d.data().content.term,
                definition: d.data().content.definition
            }));

            const notes = topicData.writingContent?.notes || [];

            if (notes.length > 0 || conceptDefinitions.length > 0) {
                 yazilacaklarData.push({
                   className: classesMap.get(course?.classId || '') || 'Genel',
                   courseName: course?.title || 'Bilinmeyen Ders',
                   unitName: unitsMap.get(uId)?.title || 'Bilinmeyen Ünite',
                   topicName: topicData.title,
                   writingContent: {
                       notes,
                       conceptDefinitions
                   }
               });
            }
        }
        return serialize(yazilacaklarData);
    }
    
    const { relevantCourseIds, relevantUnitIds, relevantTopicIds } = await getRelevantIds();
    
    const fetchCollectionByFilter = async (collectionName: string, field: string, ids: string[]) => {
        if (ids.length === 0 && (topicId || unitId || courseId || classId)) {
            return [];
        }
        
        let allItems: any[] = [];
        let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(collectionName);
        
        if (ids.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < ids.length; i += 30) {
                chunks.push(ids.slice(i, i + 30));
            }
            for (const chunk of chunks) {
                const snapshot = await query.where(field, 'in', chunk).get();
                const items = snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
                allItems.push(...items);
            }
        } else {
            const snapshot = await query.get();
            allItems = snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
        }
        return allItems;
    };

    switch (dataType) {
        case 'users':
            let usersQuery: FirebaseFirestore.Query = db.collection('users');
            if (classId && classId !== 'all') {
                const className = classesMap.get(classId);
                usersQuery = usersQuery.where('class', '>=', className).where('class', '<', className + '\uf8ff');
            }
            const usersSnapshot = await usersQuery.get();
            return usersSnapshot.docs.map(userDoc => {
                const user = addNamesToItem(serialize({ uid: userDoc.id, ...userDoc.data() }));
                return user;
            });
            
       case 'curriculum': {
            const coursesToExport = coursesSnap.docs
                .filter(doc => relevantCourseIds.length === 0 || relevantCourseIds.includes(doc.id));
        
            const curriculumData = await Promise.all(coursesToExport.map(async (courseDoc) => {
                const course = courseDoc.data() as Course;
                const className = classesMap.get(course.classId || '') || 'Genel';
                
                const unitsInCourse = unitsSnap.docs
                    .filter(doc => doc.ref.path.startsWith(`courses/${courseDoc.id}/`) && (relevantUnitIds.length === 0 || relevantUnitIds.includes(doc.id)));

                const units = unitsInCourse.map(unitDoc => {
                    const unitData = unitDoc.data() as Unit;
                    const topicsInUnit = topicsSnap.docs
                        .filter(topicDoc => topicDoc.ref.path.startsWith(`courses/${courseDoc.id}/units/${unitDoc.id}/`) && (relevantTopicIds.length === 0 || relevantTopicIds.includes(topicDoc.id)));
                    
                    const topics = topicsInUnit.map(topicDoc => ({ title: topicDoc.data().title }));
                    
                    return { title: unitData.title, topics };
                });
                    
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
        case 'assignments': {
             let query: FirebaseFirestore.Query = db.collection('assignments');
             if (classId && classId !== 'all') {
                 query = query.where('classId', '==', classId);
             }
             const snapshot = await query.get();
             return snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
        }
        case 'scoreEvents': {
            const allUsersSnapshot = await db.collection('users').get();
            const userMap = new Map(allUsersSnapshot.docs.map(u => [u.id, { displayName: u.data().displayName, className: u.data().class?.split(' - ')[0] || '' }]));
            
            let userIdsToFilter: string[] = [];
            if (classId && classId !== 'all') {
                const className = classesMap.get(classId);
                userIdsToFilter = allUsersSnapshot.docs
                    .filter(doc => doc.data().class?.startsWith(className || '###'))
                    .map(doc => doc.id);
            }

            const eventsData = await fetchCollectionByFilter('scoreEvents', 'userId', userIdsToFilter); 
            return eventsData.map((event: any) => ({
                userName: userMap.get(event.userId)?.displayName || 'Bilinmeyen Kullanıcı',
                ...event,
            }));
        }
        
        default:
            throw new Error(`Invalid data type: ${dataType}`);
    }
}


export async function exportDataForStaticSite(filters: { classId?: string | null; courseId?: string | null; unitId?: string | null; topicId?: string | null; }) {
    const db = getAdminDb();
    const allDocsToWrite: { path: string, content: string }[] = [];
    const { classId, courseId, unitId, topicId } = filters;

    const exportPath = path.join(process.cwd(), 'public', 'curriculum');
    
    try {
        await fs.rm(exportPath, { recursive: true, force: true });
        await fs.mkdir(exportPath, { recursive: true });
        
        // Helper to ensure directory exists
        const ensureDir = async (filePath: string) => {
            const dirname = path.dirname(filePath);
            await fs.mkdir(dirname, { recursive: true });
        };
        
        // Helper to write a file
        const writeFile = async (filePath: string, content: string) => {
            await ensureDir(filePath);
            await fs.writeFile(filePath, content);
        };

        // Fetch relevant courses, units, and topics based on filters
        let coursesToProcess: FirebaseFirestore.QueryDocumentSnapshot[];
        if (courseId && courseId !== 'all') {
            const doc = await db.collection('courses').doc(courseId).get();
            coursesToProcess = doc.exists ? [doc] : [];
        } else if (classId && classId !== 'all') {
            const snapshot = await db.collection('courses').where('classId', '==', classId).get();
            coursesToProcess = snapshot.docs;
        } else {
            const snapshot = await db.collection('courses').get();
            coursesToProcess = snapshot.docs;
        }

        // 1. Export flat collections - filtered by courses
        const courseIds = coursesToProcess.map(doc => doc.id);
        const collectionsToExport = ['questions', 'examQuestions', 'activityItems'];
        
        for (const collectionName of collectionsToExport) {
            if (courseIds.length > 0) {
                 const chunks: string[][] = [];
                 for (let i = 0; i < courseIds.length; i += 30) {
                     chunks.push(courseIds.slice(i, i + 30));
                 }
                 for (const chunk of chunks) {
                     const snapshot = await db.collection(collectionName).where('courseId', 'in', chunk).get();
                     const data = snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));

                      const byTopic: { [key: string]: any[] } = {};
                      data.forEach((item: any) => {
                          if (item.topicId) {
                              if (!byTopic[item.topicId]) byTopic[item.topicId] = [];
                              byTopic[item.topicId].push(item);
                          }
                      });
                      for (const tId in byTopic) {
                           await writeFile(
                               path.join(exportPath, collectionName, `${tId}.json`),
                               JSON.stringify(byTopic[tId], null, 2)
                           );
                      }
                 }
            }
        }
        
         await writeFile(
            path.join(exportPath, 'courses.json'),
            JSON.stringify(coursesToProcess.map(doc => serialize({id: doc.id, ...doc.data()})), null, 2)
        );

        const classesSnapshot = await db.collection('classes').get();
        await writeFile(
            path.join(exportPath, 'classes.json'),
            JSON.stringify(classesSnapshot.docs.map(doc => serialize({id: doc.id, ...doc.data()})), null, 2)
        );

        // 2. Export subcollections and specific content files
        for (const courseDoc of coursesToProcess) {
            let unitsQuery = db.collection('courses').doc(courseDoc.id).collection('units');
            if (unitId && unitId !== 'all') {
                unitsQuery = unitsQuery.where('__name__', '==', unitId);
            }
            const unitsSnapshot = await unitsQuery.get();
            
            const unitDataForCourse = unitsSnapshot.docs.map(doc => serialize({id: doc.id, ...doc.data() as Unit}));
            if (unitDataForCourse.length > 0) {
                await writeFile(
                    path.join(exportPath, 'units', `${courseDoc.id}.json`),
                    JSON.stringify(unitDataForCourse, null, 2)
                );
            }
            
            for (const unitDoc of unitsSnapshot.docs) {
                const unitData = unitDoc.data() as Unit;

                if(unitData.htmlContent) {
                    await writeFile(
                        path.join(exportPath, 'ozetler', `unit_${unitDoc.id}.json`),
                        JSON.stringify({ title: unitData.title, htmlContent: unitData.htmlContent }, null, 2)
                    );
                }
                
                let topicsQuery = db.collection('courses').doc(courseDoc.id).collection('units').doc(unitDoc.id).collection('topics');
                if (topicId && topicId !== 'all') {
                    topicsQuery = topicsQuery.where('__name__', '==', topicId);
                }
                const topicsSnapshot = await topicsQuery.get();

                const topics = topicsSnapshot.docs.map(d => serialize({id: d.id, ...d.data()}));
                if(topics.length > 0) {
                    await writeFile(
                        path.join(exportPath, 'topics', `${unitDoc.id}.json`),
                        JSON.stringify(topics, null, 2)
                    );
                }

                for (const topicDoc of topicsSnapshot.docs) {
                    const topicData = topicDoc.data() as Topic;
                    
                    const defsSnap = await db.collection('activityItems')
                        .where('topicId', '==', topicDoc.id)
                        .where('type', '==', 'definition')
                        .get();
                    const definitions = defsSnap.docs.map(d => ({ concept: d.data().content.term, definition: d.data().content.definition }));
                    const notes = topicData.writingContent?.notes || [];
                    const hasYazilacaklar = notes.length > 0 || definitions.length > 0;

                    if (hasYazilacaklar) {
                        await writeFile(
                            path.join(exportPath, 'yazilacaklar', `${topicDoc.id}.json`),
                            JSON.stringify(serialize({
                                notes: topicData.writingContent?.notes || [],
                                conceptDefinitions: definitions,
                            }), null, 2)
                        );
                    }
                    
                    if(topicData.htmlContent) {
                        await writeFile(
                            path.join(exportPath, 'ozetler', `${topicDoc.id}.json`),
                            JSON.stringify({ title: topicData.title, htmlContent: topicData.htmlContent }, null, 2)
                        );
                    }
                }
            }
        }
        
        // 3. Create a manifest file - this should always fetch all data to build the complete manifest
        const manifestClassesSnap = await db.collection("classes").orderBy('createdAt', 'asc').get();
        const manifestCoursesSnap = await db.collection("courses").get();
        const allCoursesForManifest = manifestCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

        const manifestCourseGroups = await Promise.all(manifestClassesSnap.docs.map(async (classDoc) => {
            const classData = classDoc.data() as SchoolClass;
            const coursesInClass = allCoursesForManifest.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));

            const courseFiles = (await Promise.all(coursesInClass.map(async (course) => {
                const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
                
                const units = (await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                    const unitData = unitDoc.data() as Unit;
                    if (!(unitData.isPublished ?? true)) return null;

                    const hasUnitOzet = !!unitData.htmlContent;
                    
                    const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                    
                    let hasTopicContent = false;
                    for (const topicDoc of topicsSnapshot.docs) {
                        const topicData = topicDoc.data() as Topic;
                        if (!(topicData.isPublished ?? true)) continue;
                        
                        const hasOzet = !!topicData.htmlContent;
                        const yazilacaklarSnap = await db.collection('activityItems').where('topicId', '==', topicDoc.id).limit(1).get();
                        const hasYazilacaklar = !yazilacaklarSnap.empty || (topicData.writingContent?.notes?.length || 0) > 0;

                        if(hasOzet || hasYazilacaklar) {
                            hasTopicContent = true;
                            break;
                        }
                    }
                    
                    return (hasUnitOzet || hasTopicContent) ? { id: unitDoc.id, title: unitData.title } : null;
                }))).filter(Boolean);

                return units.length > 0 ? { id: course.id, title: course.title, file: `units/${course.id}.json` } : null;
            }))).filter(Boolean);

            return { name: classData.name, courses: courseFiles };
        }));
        
        const generalCourses = allCoursesForManifest.filter(c => !c.classId && (c.isPublished ?? true));
        if (generalCourses.length > 0) {
            const generalCourseFiles = await Promise.all(generalCourses.map(async (course) => {
                const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').get();
                if (unitsSnapshot.empty) return null;
                return { id: course.id, title: course.title, file: `units/${course.id}.json` };
            }));

            const validGeneralCourses = generalCourseFiles.filter(Boolean);
            if (validGeneralCourses.length > 0) {
                 const generalGroup = manifestCourseGroups.find(g => g.name === "Genel");
                if (generalGroup) {
                    generalGroup.courses.push(...validGeneralCourses as any);
                } else if (manifestCourseGroups.length > 0) { // Add to the first available group if 'Genel' doesn't exist.
                    manifestCourseGroups[0].courses.push(...validGeneralCourses as any);
                }
            }
        }

        await writeFile(
            path.join(exportPath, 'manifest.json'),
            JSON.stringify({ classGroups: manifestCourseGroups }, null, 2)
        );

        return { success: true, message: `${coursesToProcess.length} ders işlendi. Statik dosyalar oluşturuldu.` };

    } catch (e: any) {
        console.error("Error exporting static site data:", e);
        return { success: false, error: "Statik site verileri oluşturulurken bir hata oluştu: " + e.message };
    }
}
```,
    "typescript": {
    "ignoreBuildErrors": true,
  }
}
```