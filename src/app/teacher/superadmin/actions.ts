

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
    
        const allCourseDocs = coursesSnap.docs;
        const allUnitDocs = unitsSnap.docs;
    
        // Determine relevant courses first
        if (courseId && courseId !== 'all') {
            relevantCourseIds = [courseId];
        } else if (classId && classId !== 'all') {
            relevantCourseIds = allCourseDocs
                .filter(doc => doc.data().classId === classId)
                .map(doc => doc.id);
        } else {
            // No class or course filter, means all courses are relevant
            relevantCourseIds = allCourseDocs.map(doc => doc.id);
        }
    
        // Determine relevant units
        if (unitId && unitId !== 'all') {
            relevantUnitIds = [unitId];
        } else {
             const courseUnitDocs = allUnitDocs.filter(doc => {
                const parentPath = doc.ref.parent.parent?.path;
                return parentPath && relevantCourseIds.includes(parentPath.split('/')[1]);
            });
            relevantUnitIds = courseUnitDocs.map(doc => doc.id);
        }
    
        // Determine relevant topics
        if (topicId && topicId !== 'all') {
            relevantTopicIds = [topicId];
        } else if (relevantUnitIds.length > 0) {
             const topicPromises = relevantUnitIds.map(uId => 
                db.collectionGroup('topics').where('__name__', '>', `courses/${courseId}/units/${uId}/topics/`).where('__name__', '<', `courses/${courseId}/units/${uId}/topics/~`).get()
            );
            const topicSnapsArray = await Promise.all(topicPromises);
            relevantTopicIds = topicSnapsArray.flatMap(snap => snap.docs.map(doc => doc.id));
        } else if (relevantCourseIds.length > 0) {
            const courseUnitDocs = allUnitDocs.filter(doc => {
                const parentPath = doc.ref.parent.parent?.path;
                return parentPath && relevantCourseIds.includes(parentPath.split('/')[1]);
            });
            const topicPromises = courseUnitDocs.flatMap(unitDoc => 
                unitDoc.ref.collection('topics').get()
            );
            const topicSnaps = await Promise.all(topicPromises);
            relevantTopicIds = topicSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
        }
    
        return { relevantCourseIds, relevantUnitIds, relevantTopicIds };
    };

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
        
        delete newItem.id;
        delete newItem.createdAt;
        delete newItem.classId;
        delete newItem.courseId;
        delete newItem.unitId;
        delete newItem.topicId;
        delete newItem.teacherId;
        delete newItem.topic; 
        delete newItem.uid;
        if(newItem.password) delete newItem.password;


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
            let usersQuery = db.collection('users');
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
                .filter(doc => relevantCourseIds.length === 0 || relevantCourseIds.includes(doc.id))
                .map(doc => ({ id: doc.id, ...doc.data() as Course }));

            const curriculumData = await Promise.all(coursesToExport.map(async (course: any) => {
                const className = classesMap.get(course.classId) || 'Genel';
                
                const units = (await Promise.all(unitsSnap.docs
                    .filter(doc => doc.ref.path.startsWith(`courses/${course.id}/`) && (relevantUnitIds.length === 0 || relevantUnitIds.includes(doc.id)))
                    .map(async (doc) => {
                        const unitData = {id: doc.id, ...doc.data() as Unit};
                        const topicsSnapshot = await db.collection(`courses/${course.id}/units/${unitData.id}/topics`).get();
                        const topics = topicsSnapshot.docs
                            .filter(topicDoc => (relevantTopicIds.length === 0 || relevantTopicIds.includes(topicDoc.id)))
                            .map(topicDoc => ({ title: topicDoc.data().title }));
                        
                        return { title: unitData.title, topics };
                    }))).filter(Boolean);
                    
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
             let query = db.collection('assignments') as FirebaseFirestore.Query;
             if (classId && classId !== 'all') {
                 query = query.where('classId', '==', classId);
             }
             const snapshot = await query.get();
             return snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
        }
        case 'scoreEvents': {
            const allUsers = await getAllUsers();
            const userMap = new Map(allUsers.map(u => [u.uid, { displayName: u.displayName, className: u.class?.split(' - ')[0] || '' }]));
            
            let userIdsToFilter: string[] = [];
            if (classId && classId !== 'all') {
                const className = classesMap.get(classId);
                userIdsToFilter = allUsers.filter(u => u.class?.startsWith(className || '###')).map(u => u.uid);
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

            if(unitData.htmlContent) {
                allDocsToWrite.push({
                    path: `public/curriculum/ozetler/unit_${unitId}.json`,
                    content: JSON.stringify({ title: unitData.title, htmlContent: unitData.htmlContent }, null, 2)
                });
            }

            const topicsSnapshot = await db.collection('courses').doc(courseId).collection('units').doc(unitId).collection('topics').get();
            const topics = topicsSnapshot.docs.map(d => serialize({id: d.id, ...d.data()}));
            if(topics.length > 0) {
                 allDocsToWrite.push({
                    path: `public/curriculum/topics/${unitId}.json`,
                    content: JSON.stringify(topics, null, 2)
                });
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
                     allDocsToWrite.push({
                        path: `public/curriculum/yazilacaklar/${topicDoc.id}.json`,
                        content: JSON.stringify(serialize({
                            notes: topicData.writingContent?.notes || [],
                            conceptDefinitions: definitions,
                        }), null, 2)
                    });
                }
                
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


    // 4. Batch write all files to the export collection, with chunking for writes and deletes
    const exportCollectionRef = db.collection('__static_export');
    
    // Chunked delete
    const CHUNK_SIZE_DELETE = 300;
    async function deleteCollection(collectionRef: FirebaseFirestore.CollectionReference, batchSize: number) {
        let query = collectionRef.limit(batchSize);
        let snapshot = await query.get();
        
        while (snapshot.size > 0) {
            const deleteBatch = db.batch();
            snapshot.docs.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });
            await deleteBatch.commit();
            
            if (snapshot.size < batchSize) break; // Last batch
            
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            query = collectionRef.limit(batchSize).startAfter(lastVisible);
            snapshot = await query.get();
        }
    }
    
    await deleteCollection(exportCollectionRef, CHUNK_SIZE_DELETE);


    // Chunked write
    let writeBatch = db.batch();
    let writeCount = 0;
    const CHUNK_SIZE_WRITE = 100; // More conservative chunk size

    for (const fileData of allDocsToWrite) {
        const docRef = db.collection('__static_export').doc();
        writeBatch.set(docRef, fileData);
        writeCount++;

        if (writeCount === CHUNK_SIZE_WRITE) {
            await writeBatch.commit();
            writeBatch = db.batch();
            writeCount = 0;
        }
    }

    // Commit any remaining writes
    if (writeCount > 0) {
        await writeBatch.commit();
    }
    
    return { success: true, message: `${allDocsToWrite.length} dosya oluşturma görevi tetiklendi.` };
}
