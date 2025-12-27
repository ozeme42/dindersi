

'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question, Assignment, ScoreEvent, LessonStep } from "@/lib/types";

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

export async function deleteBulkUsers(userIds: string[]): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!userIds || userIds.length === 0) {
        return { success: false, error: "Silinecek kullanıcı seçilmedi." };
    }
    
    const auth = getAdminAuth();
    const db = getAdminDb();
    const batch = db.batch();
    
    let deletedCount = 0;
    const errors: any[] = [];

    // Auth deletions must happen one by one.
    const authDeletions = userIds.map(uid => auth.deleteUser(uid).catch(e => ({ uid, error: e })));

    const authResults = await Promise.allSettled(authDeletions);

    authResults.forEach((result, index) => {
        const uid = userIds[index];
        if (result.status === 'fulfilled') {
            // If auth deletion is successful, add Firestore deletion to batch.
            const userRef = db.collection('users').doc(uid);
            batch.delete(userRef);
            deletedCount++;
        } else {
            // Collect errors for users that failed to be deleted from Auth.
            errors.push({ uid: uid, reason: result.reason.message });
            console.error(`Failed to delete user ${uid} from Auth:`, result.reason);
        }
    });

    try {
        // Commit all successful Firestore deletions.
        await batch.commit();
        if (errors.length > 0) {
            return { success: false, error: `${errors.length} kullanıcı silinemedi. Detaylar için konsola bakın.`, deletedCount };
        }
        return { success: true, deletedCount };
    } catch (dbError: any) {
        console.error("Error committing Firestore deletions:", dbError);
        return { success: false, error: "Veritabanı silme işlemi sırasında bir hata oluştu.", deletedCount };
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

const slugify = (text: string) => {
    if (!text) return '';
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
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
        } else {
            relevantUnitIds = relevantCourseIds.flatMap(cId => courseUnitMap[cId] || []);
        }
    
        if (topicId && topicId !== 'all') {
            relevantTopicIds = [topicId];
        } else if (relevantUnitIds.length > 0) {
            const topicIdPromises = relevantCourseIds.flatMap(courseDocId => {
                const courseUnits = courseUnitMap[courseDocId] || [];
                return courseUnits
                    .filter(unitDocId => relevantUnitIds.includes(unitDocId))
                    .map(unitDocId => 
                        db.collection(`courses/${courseDocId}/units/${unitDocId}/topics`).get()
                    );
            });
            const topicSnaps = await Promise.all(topicIdPromises);
            relevantTopicIds = topicSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
        } else if (relevantCourseIds.length > 0) {
            // Case where no unit is selected but course is
            const topicIdPromises = relevantCourseIds.flatMap(courseDocId => {
                const courseUnits = courseUnitMap[courseDocId] || [];
                return courseUnits.map(unitDocId => 
                    db.collection(`courses/${courseDocId}/units/${unitDocId}/topics`).get()
                );
            });
            const topicSnaps = await Promise.all(topicIdPromises);
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

/**
 * Stage 1: Exports manifest.json and HTML content for `ozetler`.
 * This is a relatively light operation.
 */
export async function exportManifestAndContent() {
    const db = getAdminDb();
    const publicPath = path.join(process.cwd(), 'public');
    const curriculumPath = path.join(publicPath, 'curriculum');
    const allDocsToWrite: { path: string, content: string }[] = [];
    const CHUNK_SIZE = 100;

    try {
        await fs.mkdir(curriculumPath, { recursive: true });
        
        const addFile = (filePath: string, content: any) => {
            const finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            allDocsToWrite.push({
                path: path.join(curriculumPath, filePath),
                content: finalContent
            });
        };

        const manifestClassesSnap = await db.collection("classes").orderBy('createdAt', 'asc').get();
        const manifestCoursesSnap = await db.collection("courses").get();
        const allCoursesForManifest = manifestCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

        const getClassGroups = async (isGeneral: boolean) => {
            const sourceClasses = isGeneral 
                ? [{ id: 'general', name: 'Genel', data: () => ({ name: 'Genel', isPublished: true }) }] 
                : manifestClassesSnap.docs;

            return (await Promise.all(sourceClasses.map(async (classDoc) => {
                const classData = classDoc.data() as SchoolClass;
                if (!isGeneral && classData.isPublished === false) return null;
                
                const coursesInClass = allCoursesForManifest.filter(c => (isGeneral ? !c.classId : c.classId === classDoc.id) && (c.isPublished ?? true));
                if (coursesInClass.length === 0) return null;

                const courses = await Promise.all(coursesInClass.map(async (course) => {
                    const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
                    const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                        const unitData = unitDoc.data() as Unit;
                        if (!(unitData.isPublished ?? true)) return null;

                        // Create ozetler file for unit if content exists
                        if (unitData.htmlContent) {
                            addFile(`ozetler/${unitDoc.id}.html`, unitData.htmlContent);
                        }

                        // Export unit steps (ders akışı)
                        if (unitData.steps && unitData.steps.length > 0) {
                            addFile(`flows/${unitDoc.id}.json`, JSON.stringify(unitData.steps.filter((s: LessonStep) => s.isPublished ?? true)));
                        }

                        const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').orderBy('title').get();
                        
                        const hasAnyVisibleContent = !!unitData.htmlContent || (unitData.steps && unitData.steps.length > 0) || topicsSnapshot.docs.some(topicDoc => {
                             const topicData = topicDoc.data() as Topic;
                             const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                             return (topicData.isPublished ?? true) && (topicData.htmlContent || hasYazilacaklar || (topicData.steps && topicData.steps.length > 0));
                        });

                        return hasAnyVisibleContent ? { id: unitDoc.id, title: unitData.title, hasUnitOzet: !!unitData.htmlContent, hasFlowContent: (unitData.steps || []).length > 0, topics: [] } : null;
                    }));

                    const validUnits = units.filter(Boolean);
                    return validUnits.length > 0 ? { id: course.id, title: course.title, units: validUnits } : null;
                }));

                const validCourses = courses.filter(Boolean);
                return validCourses.length > 0 ? { name: classData.name, courses: validCourses } : null;
            }))).filter(Boolean);
        };
        
        const classGroups = await getClassGroups(false);
        const generalGroup = await getClassGroups(true);
        let finalClassGroups = [...classGroups, ...generalGroup] as any[];

        for (let group of finalClassGroups) {
            for (let course of group.courses) {
                for (let unit of course.units) {
                    const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unit.id).collection('topics').orderBy('title').get();
                    
                    const topicPromises = topicsSnapshot.docs.map(async (doc) => {
                        const topicData = doc.data() as Topic;
                        if (!(topicData.isPublished ?? true)) return null;

                        const defsSnap = await db.collection('activityItems').where('topicId', '==', doc.id).where('type', '==', 'definition').limit(1).get();
                        const hasYazilacaklarContent = (topicData.writingContent?.notes?.length || 0) > 0 || !defsSnap.empty;

                        if (topicData.htmlContent) {
                            addFile(`ozetler/${doc.id}.html`, topicData.htmlContent);
                        }
                        if (hasYazilacaklarContent) {
                            const notes = topicData.writingContent?.notes || [];
                            const defs = await db.collection('activityItems').where('topicId', '==', doc.id).where('type', '==', 'definition').get();
                            const conceptDefinitions = defs.docs.map(d => ({concept: d.data().content.term, definition: d.data().content.definition }));
                            addFile(`yazilacaklar/${doc.id}.json`, JSON.stringify({ notes, conceptDefinitions }));
                        }
                        // Export topic steps (ders akışı)
                        if (topicData.steps && topicData.steps.length > 0) {
                            addFile(`flows/${doc.id}.json`, JSON.stringify(topicData.steps.filter((s: LessonStep) => s.isPublished ?? true)));
                        }
                        
                        const hasOzetContent = !!topicData.htmlContent;
                        const hasFlowContent = (topicData.steps || []).length > 0;

                        if (hasOzetContent || hasYazilacaklarContent || hasFlowContent) {
                            return { id: doc.id, title: topicData.title, hasYazilacaklarContent, hasOzetContent, hasFlowContent };
                        }
                        return null;
                    });
                    
                    const topics = (await Promise.all(topicPromises)).filter(Boolean);
                    unit.topics = topics;
                }
                course.units = course.units.filter((u: any) => u.topics.length > 0 || u.hasUnitOzet || (u.steps && u.steps.length > 0));
            }
            group.courses = group.courses.filter((c: any) => c.units.length > 0);
        }
        
        finalClassGroups = finalClassGroups.filter(g => g.courses.length > 0);
        addFile('manifest.json', { classGroups: finalClassGroups });

        // Ensure subdirectories exist
        await fs.mkdir(path.join(curriculumPath, 'ozetler'), { recursive: true });
        await fs.mkdir(path.join(curriculumPath, 'yazilacaklar'), { recursive: true });
        await fs.mkdir(path.join(curriculumPath, 'flows'), { recursive: true }); // DERS AKIŞI KLASÖRÜ

        for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
            const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
        }
        
        return { success: true, message: `Manifesto ve ${allDocsToWrite.length - 1} içerik dosyası başarıyla oluşturuldu.` };

    } catch (e: any) {
        console.error("Error exporting manifest:", e);
        return { success: false, error: "Manifest ve içerik oluşturulurken bir hata oluştu: " + e.message };
    }
}

/**
 * Stage 2: Exports activityItems for games. This can be a heavy operation.
 */
export async function exportActivityData() {
    const db = getAdminDb();
    const curriculumPath = path.join(process.cwd(), 'public', 'curriculum');
    const exportPath = path.join(curriculumPath, 'activities');
    const allDocsToWrite: { path: string, content: string }[] = [];
    const CHUNK_SIZE = 100;

    try {
        await fs.mkdir(exportPath, { recursive: true });

        const activitiesSnapshot = await db.collection('activityItems').get();
        const activitiesByTopic: { [key: string]: any[] } = {};
        activitiesSnapshot.docs.forEach((doc) => {
            const item = serialize({ id: doc.id, ...doc.data() });
            if (item.topicId) {
                if (!activitiesByTopic[item.topicId]) activitiesByTopic[item.topicId] = [];
                activitiesByTopic[item.topicId].push(item);
            }
        });
        
        for (const topicId in activitiesByTopic) {
            allDocsToWrite.push({
                path: path.join(exportPath, `${topicId}.json`),
                content: JSON.stringify(activitiesByTopic[topicId])
            });
        }
        
        for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
            const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
        }
        
        return { success: true, message: `${allDocsToWrite.length} konu için oyun verisi başarıyla oluşturuldu.` };
    } catch (e: any) {
        console.error("Error exporting activity data:", e);
        return { success: false, error: "Oyun verileri oluşturulurken bir hata oluştu: " + e.message };
    }
}
