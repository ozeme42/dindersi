

'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
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
        const auth = getAuth();
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
        const auth = getAuth();
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

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Boşlukları - ile değiştir
        .replace(/[^a-z0-9-çğıöşü]/g, '') // Keep Turkish characters
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/--+/g, '-')         // Birden fazla -'yi tek - yap
        .replace(/^-+/, '')           // Başlangıçtaki -'leri kaldır
        .replace(/-+$/, '');          // Sondaki -'leri kaldır
};

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

        if (courseId && courseId !== 'all') {
            relevantCourseIds = [courseId];
        } else if (classId && classId !== 'all') {
            relevantCourseIds = coursesSnap.docs
                .filter(doc => doc.data().classId === classId)
                .map(doc => doc.id);
        } else {
            relevantCourseIds = coursesSnap.docs.map(doc => doc.id);
        }

        const courseUnitMap: { [courseId: string]: string[] } = {};
        for (const courseDocId of relevantCourseIds) {
            const courseUnits = unitsSnap.docs
                .filter(unitDoc => unitDoc.ref.path.startsWith(`courses/${courseDocId}/`))
                .map(unitDoc => unitDoc.id);
            courseUnitMap[courseDocId] = courseUnits;
        }

        if (unitId && unitId !== 'all') {
            relevantUnitIds = [unitId];
        } else if (relevantCourseIds.length > 0) {
            relevantUnitIds = relevantCourseIds.flatMap(cId => courseUnitMap[cId] || []);
        }

        if (topicId && topicId !== 'all') {
            relevantTopicIds = [topicId];
        } else if (relevantUnitIds.length > 0) {
             const topicPromises = (await Promise.all(
                relevantCourseIds.map(async (courseDocId) => {
                    const courseUnits = courseUnitMap[courseDocId] || [];
                    return (await Promise.all(
                        courseUnits
                            .filter(unitDocId => relevantUnitIds.includes(unitDocId))
                            .map(unitDocId => db.collection(`courses/${courseDocId}/units/${unitDocId}/topics`).get())
                    )).flatMap(snap => snap.docs.map(doc => doc.id));
                })
            )).flat();
            relevantTopicIds = topicPromises;
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
    
    const { relevantTopicIds } = await getRelevantIds();
    
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
            const { relevantCourseIds } = await getRelevantIds();
            const coursesToExport = coursesSnap.docs
                .filter(doc => relevantCourseIds.length === 0 || relevantCourseIds.includes(doc.id));
        
            const curriculumData = await Promise.all(coursesToExport.map(async (courseDoc) => {
                const course = courseDoc.data() as Course;
                const className = classesMap.get(course.classId || '') || 'Genel';
                
                const unitsInCourse = unitsSnap.docs
                    .filter(doc => doc.ref.path.startsWith(`courses/${courseDoc.id}/`));

                const units = await Promise.all(unitsInCourse.map(async (unitDoc) => {
                    const unitData = unitDoc.data() as Unit;
                    
                    const topicsInUnit = topicsSnap.docs
                        .filter(topicDoc => topicDoc.ref.path.startsWith(`courses/${courseDoc.id}/units/${unitDoc.id}/`));
                    
                    const topics = topicsInUnit.map(topicDoc => ({ title: topicDoc.data().title }));
                    
                    if (topics.length > 0) {
                        return { title: unitData.title, topics };
                    }
                    return null;
                }));
                    
                return { title: course.title, className, units: units.filter(Boolean) };
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
    const { classId, courseId, unitId, topicId } = filters;
    const allDocsToWrite: { path: string, content: string }[] = [];
    const exportPath = path.join(process.cwd(), 'public', 'curriculum');

    try {
        const addFileToWrite = (filePath: string, content: any) => {
            allDocsToWrite.push({
                path: path.join(exportPath, filePath),
                content: JSON.stringify(content)
            });
        };

        // If no filters are applied, clear everything first.
        if (!classId && !courseId && !unitId && !topicId) {
             try {
                await fs.rm(exportPath, { recursive: true, force: true });
             } catch (e: any) {
                if (e.code !== 'ENOENT') throw e; // Ignore if directory doesn't exist
             }
        }
        await fs.mkdir(exportPath, { recursive: true });

        // Fetch relevant courses
        let coursesToProcess: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
        if (courseId && courseId !== 'all') {
            const doc = await db.collection('courses').doc(courseId).get();
            coursesToProcess = { docs: doc.exists ? [doc] : [], empty: !doc.exists } as any;
        } else if (classId && classId !== 'all') {
            coursesToProcess = await db.collection('courses').where('classId', '==', classId).get();
        } else {
            coursesToProcess = await db.collection('courses').get();
        }
        const courseIds = coursesToProcess.docs.map(doc => doc.id);
        
        const collectionsToExport = ['questions', 'examQuestions', 'activityItems'];
        for (const collectionName of collectionsToExport) {
            await fs.mkdir(path.join(exportPath, collectionName), { recursive: true });
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
                           addFileToWrite(
                               `${collectionName}/${tId}.json`,
                               byTopic[tId]
                           );
                      }
                 }
            }
        }
        
        await fs.mkdir(path.join(exportPath, 'ozetler'), { recursive: true });
        await fs.mkdir(path.join(exportPath, 'yazilacaklar'), { recursive: true });
        
        for (const courseDoc of coursesToProcess.docs) {
            let unitsQuery: FirebaseFirestore.Query = db.collection('courses').doc(courseDoc.id).collection('units');
            if (unitId && unitId !== 'all') {
                unitsQuery = unitsQuery.where('__name__', '==', unitId);
            }
            const unitsSnapshot = await unitsQuery.get();
            
            for (const unitDoc of unitsSnapshot.docs) {
                const unitData = unitDoc.data() as Unit;
                if(unitData.htmlContent) addFileToWrite(`ozetler/unit_${unitDoc.id}.json`, { title: unitData.title, htmlContent: unitData.htmlContent });
                
                let topicsQuery: FirebaseFirestore.Query = db.collection('courses').doc(courseDoc.id).collection('units').doc(unitDoc.id).collection('topics');
                if (topicId && topicId !== 'all') {
                    topicsQuery = topicsQuery.where('__name__', '==', topicId);
                }
                const topicsSnapshot = await topicsQuery.get();

                for (const topicDoc of topicsSnapshot.docs) {
                    const topicData = topicDoc.data() as Topic;
                    
                    const defsSnap = await db.collection('activityItems').where('topicId', '==', topicDoc.id).where('type', '==', 'definition').get();
                    const definitions = defsSnap.docs.map(d => ({ concept: d.data().content.term, definition: d.data().content.definition }));
                    const notes = topicData.writingContent?.notes || [];
                    const hasYazilacaklar = notes.length > 0 || definitions.length > 0;

                    if (hasYazilacaklar) addFileToWrite(`yazilacaklar/${topicDoc.id}.json`, serialize({ notes: topicData.writingContent?.notes || [], conceptDefinitions: definitions }));
                    if(topicData.htmlContent) addFileToWrite(`ozetler/${topicDoc.id}.json`, { title: topicData.title, htmlContent: topicData.htmlContent });
                }
            }
        }
        
        if (!classId && !courseId && !unitId && !topicId) {
            // ... (manifest generation logic from previous step, remains the same)
            const manifestClassesSnap = await db.collection("classes").orderBy('createdAt', 'asc').get();
            const manifestCoursesSnap = await db.collection("courses").get();
            const allCoursesForManifest = manifestCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

            let classGroups = await Promise.all(manifestClassesSnap.docs.map(async (classDoc) => {
                const classData = classDoc.data() as SchoolClass;
                const coursesInClass = allCoursesForManifest.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));

                const courses = await Promise.all(coursesInClass.map(async (course) => {
                    const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').get();
                    const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                        const unitData = unitDoc.data() as Unit;
                        if (!(unitData.isPublished ?? true)) return null;
                        
                        const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                        const hasContent = !!unitData.htmlContent || topicsSnapshot.docs.some(topicDoc => {
                            const topicData = topicDoc.data() as Topic;
                            return (topicData.isPublished ?? true) && (topicData.htmlContent || (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0);
                        });

                        return hasContent ? { id: unitDoc.id, title: unitData.title, hasUnitOzet: !!unitData.htmlContent, topics: [] } : null;
                    }));

                    const validUnits = units.filter(Boolean);
                    return validUnits.length > 0 ? { id: course.id, title: course.title, units: validUnits } : null;
                }));

                return { name: classData.name, courses: courses.filter(Boolean) };
            }));

            const generalCoursesData = allCoursesForManifest.filter(c => !c.classId && (c.isPublished ?? true));
            if (generalCoursesData.length > 0) {
                 const courses = await Promise.all(generalCoursesData.map(async (course) => {
                    const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').get();
                     const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                        const unitData = unitDoc.data() as Unit;
                        if (!(unitData.isPublished ?? true)) return null;
                        
                        const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                        const hasContent = !!unitData.htmlContent || topicsSnapshot.docs.some(topicDoc => {
                            const topicData = topicDoc.data() as Topic;
                            return (topicData.isPublished ?? true) && (topicData.htmlContent || (topicData.writingContent?.notes?.length || 0) > 0);
                        });

                        return hasContent ? { id: unitDoc.id, title: unitData.title, hasUnitOzet: !!unitData.htmlContent, topics: [] } : null;
                    }));
                     const validUnits = units.filter(Boolean);
                    return validUnits.length > 0 ? { id: course.id, title: course.title, units: validUnits } : null;
                 }));
                 classGroups.push({ name: "Genel", courses: courses.filter(Boolean) as any });
            }

            for (let group of classGroups) {
                for (let course of group.courses) {
                    for (let unit of (course as any).units) {
                        const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unit.id).collection('topics').orderBy('title').get();
                        unit.topics = topicsSnapshot.docs.map(doc => {
                             const topicData = doc.data() as Topic;
                             if (!(topicData.isPublished ?? true)) return null;
                              const defsSnapPromise = db.collection('activityItems').where('topicId', '==', doc.id).where('type', '==', 'definition').get();
                              const checkDefs = async () => {
                                const defs = await defsSnapPromise;
                                return defs.size > 0;
                              }
                             return {
                                 id: doc.id,
                                 title: topicData.title,
                                 hasYazilacaklarContent: (topicData.writingContent?.notes?.length || 0) > 0 || checkDefs(),
                                 hasOzetContent: !!topicData.htmlContent
                             };
                        }).filter((t: any) => t && (t.hasOzetContent || t.hasYazilacaklarContent));
                    }
                     (course as any).units = (course as any).units.filter((u: any) => u.topics.length > 0 || u.hasUnitOzet);
                }
                group.courses = group.courses.filter((c: any) => c.units.length > 0);
            }
            classGroups = classGroups.filter(g => g.courses.length > 0);

            addFileToWrite('manifest.json', { classGroups });
        }
        
        // Write all collected data to files
        await Promise.all(allDocsToWrite.map(file => fs.writeFile(file.path, file.content)));
        
        return { success: true, message: `${allDocsToWrite.length} dosya başarıyla oluşturuldu.` };

    } catch (e: any) {
        console.error("Error exporting static site data:", e);
        return { success: false, error: "Statik site verileri oluşturulurken bir hata oluştu: " + e.message };
    }
}
