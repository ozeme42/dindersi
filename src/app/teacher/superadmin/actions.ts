

'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp, doc, collection, writeBatch, setDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, getDoc } from "firebase-admin/firestore";
import { firestore } from 'firebase-admin';
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
    
    // This function now returns data with its original IDs preserved for re-importing.
    const fetchCollectionWithFilter = async (collectionName: string) => {
        let q: FirebaseFirestore.Query = db.collection(collectionName);
        
        const conditions = [];
        if (topicId && topicId !== 'all') conditions.push({ field: 'topicId', op: '==', value: topicId });
        else if (unitId && unitId !== 'all') conditions.push({ field: 'unitId', op: '==', value: unitId });
        else if (courseId && courseId !== 'all') conditions.push({ field: 'courseId', op: '==', value: courseId });
        else if (classId && classId !== 'all') {
             const coursesSnap = await db.collection('courses').where('classId', '==', classId).get();
             const courseIds = coursesSnap.docs.map(d => d.id);
             if (courseIds.length > 0) {
                 conditions.push({ field: 'courseId', op: 'in', value: courseIds });
             } else {
                 return []; // No courses for this class, so no data
             }
        }
        
        if (conditions.length > 0) {
            for (const cond of conditions) {
                 q = q.where(cond.field, cond.op as any, cond.value);
            }
        }
       
        const snapshot = await q.get();
        return snapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
    };

    let data;
    switch (dataType) {
        case 'users':
        case 'questions':
        case 'examQuestions':
        case 'activity-items':
        case 'assignments':
        case 'scoreEvents':
             data = await fetchCollectionWithFilter(dataType);
             return data;
            
        case 'curriculum':
            return { message: "Curriculum export needs a dedicated, recursive function." };

        case 'yazilacaklar':
            const allTopicsSnap = await db.collectionGroup('topics').get();
            let allTopics = allTopicsSnap.docs.map(d => ({id: d.id, ...d.data()} as Topic));

            if (topicId && topicId !== 'all') {
                allTopics = allTopics.filter(t => t.id === topicId);
            } else if (unitId && unitId !== 'all') {
                allTopics = allTopics.filter(t => t.unitId === unitId);
            } else if (courseId && courseId !== 'all') {
                allTopics = allTopics.filter(t => t.courseId === courseId);
            } else if (classId && classId !== 'all') {
                 const coursesSnap = await db.collection('courses').where('classId', '==', classId).get();
                 const courseIds = new Set(coursesSnap.docs.map(d => d.id));
                 allTopics = allTopics.filter(t => t.courseId && courseIds.has(t.courseId));
            }

            const yazilacaklarData: { [topicId: string]: any } = {};
            for (const topic of allTopics) {
                const definitionsSnap = await db.collection('activityItems').where('topicId', '==', topic.id).where('type', '==', 'definition').get();
                const hasNotes = topic.writingContent?.notes && topic.writingContent.notes.length > 0;
                const hasDefinitions = !definitionsSnap.empty;

                if (hasNotes || hasDefinitions) {
                    yazilacaklarData[topic.id] = {
                        notes: topic.writingContent?.notes || [],
                        conceptDefinitions: definitionsSnap.docs.map(d => ({concept: d.data().content.term, definition: d.data().content.definition }))
                    };
                }
            }
            return yazilacaklarData;
        
        default:
            throw new Error(`Invalid data type: ${dataType}`);
    }
}

/**
 * Exports manifest.json, HTML content for `ozetler`, and JSON content for `flows` and `yazilacaklar`.
 * This is a complete rewrite to be more robust and correct.
 */
export async function exportManifestAndContent() {
    const db = getAdminDb();
    const publicPath = path.join(process.cwd(), 'public');
    const curriculumPath = path.join(publicPath, 'curriculum');
    const allDocsToWrite: { path: string, content: string }[] = [];
    const CHUNK_SIZE = 100;

    try {
        // Ensure subdirectories exist
        await fs.mkdir(path.join(curriculumPath, 'ozetler'), { recursive: true });
        await fs.mkdir(path.join(curriculumPath, 'yazilacaklar'), { recursive: true });
        await fs.mkdir(path.join(curriculumPath, 'flows'), { recursive: true });
        await fs.mkdir(path.join(curriculumPath, 'activity-items'), { recursive: true });


        const addFile = (filePath: string, content: any) => {
            const finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            allDocsToWrite.push({
                path: path.join(curriculumPath, filePath),
                content: finalContent
            });
        };
        
        // Fetch all data in parallel to be efficient
        const [classesSnap, coursesSnap, unitsSnap, topicsSnap, activityItemsSnap] = await Promise.all([
            db.collection("classes").orderBy('name', 'asc').get(),
            db.collection("courses").orderBy('title', 'asc').get(),
            db.collectionGroup("units").get(),
            db.collectionGroup("topics").get(),
            db.collection('activityItems').get(),
        ]);
        
        // Map data for easy lookup
        const allActivities = activityItemsSnap.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
        const activitiesByTopic = new Map<string, any[]>();
        allActivities.forEach(item => {
            if (item.topicId) {
                if (!activitiesByTopic.has(item.topicId)) activitiesByTopic.set(item.topicId, []);
                activitiesByTopic.get(item.topicId)!.push(item);
            }
        });

        const allTopicsRaw = topicsSnap.docs.map(doc => {
             const parentRef = doc.ref.parent.parent;
             return {
                 parent: { courseId: parentRef?.parent?.id, unitId: parentRef?.id },
                 data: serialize({ id: doc.id, ...doc.data() })
            };
        });
        const topicsByUnit = new Map<string, any[]>();
        allTopicsRaw.forEach(topic => {
            if (topic.parent.unitId) {
                if (!topicsByUnit.has(topic.parent.unitId)) topicsByUnit.set(topic.parent.unitId, []);
                topicsByUnit.get(topic.parent.unitId)!.push(topic.data);
            }
        });

        const allUnitsRaw = unitsSnap.docs.map(doc => {
            const parentRef = doc.ref.parent.parent;
            return {
                parent: { courseId: parentRef?.id },
                data: serialize({ id: doc.id, ...doc.data() })
            };
        });
        const unitsByCourse = new Map<string, any[]>();
        allUnitsRaw.forEach(unit => {
            if (unit.parent.courseId) {
                if (!unitsByCourse.has(unit.parent.courseId)) unitsByCourse.set(unit.parent.courseId, []);
                unitsByCourse.get(unit.parent.courseId)!.push(unit.data);
            }
        });

        const allCourses = coursesSnap.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
        
        // Process and build the final manifest structure
        const classGroups = [];
        
        // Get courses by class
        for (const classDoc of classesSnap.docs) {
            const classData = serialize(classDoc.data()) as SchoolClass;
            if (classData.isPublished === false) continue;
            
            const coursesForClass = allCourses.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));
            
            const processedCourses = [];
            for (const course of coursesForClass) {
                const unitsForCourse = (unitsByCourse.get(course.id) || []).filter(u => u.isPublished ?? true);
                
                const processedUnits = [];
                for (const unit of unitsForCourse) {
                    const topicsForUnit = (topicsByUnit.get(unit.id) || []).filter(t => t.isPublished ?? true);
                    
                    const processedTopics = topicsForUnit.map(topic => {
                        const hasFlow = (topic.steps || []).filter((s: LessonStep) => s.isPublished ?? true).length > 0;
                        const hasOzet = !!topic.htmlContent;
                        const topicActivities = activitiesByTopic.get(topic.id) || [];
                        const hasYazilacaklar = topicActivities.some((a: ActivityItem) => a.type === 'definition') || (topic.writingContent?.notes?.length || 0) > 0;

                        if (hasFlow) addFile(`flows/${topic.id}.json`, (topic.steps || []).filter((s: LessonStep) => s.isPublished ?? true));
                        if (hasOzet) addFile(`ozetler/${topic.id}.html`, topic.htmlContent);
                        if (hasYazilacaklar) addFile(`yazilacaklar/${topic.id}.json`, {
                            notes: topic.writingContent?.notes || [],
                            conceptDefinitions: topicActivities.filter((a: ActivityItem) => a.type === 'definition').map((a: ActivityItem) => ({ concept: a.content.term, definition: a.content.definition }))
                        });

                        return { id: topic.id, title: topic.title, hasOzetContent: hasOzet, hasYazilacaklarContent: hasYazilacaklar, hasFlowContent: hasFlow };
                    }).filter(t => t.hasOzetContent || t.hasYazilacaklarContent || t.hasFlowContent);

                    const hasUnitFlow = (unit.steps || []).filter((s: LessonStep) => s.isPublished ?? true).length > 0;
                    if(hasUnitFlow) addFile(`flows/${unit.id}.json`, (unit.steps || []).filter((s: LessonStep) => s.isPublished ?? true));
                    if(unit.htmlContent) addFile(`ozetler/${unit.id}.html`, unit.htmlContent);

                    if (processedTopics.length > 0 || hasUnitFlow || unit.htmlContent) {
                        processedUnits.push({ id: unit.id, title: unit.title, hasUnitOzet: !!unit.htmlContent, hasFlowContent: hasUnitFlow, topics: processedTopics });
                    }
                }
                if(processedUnits.length > 0) processedCourses.push({ id: course.id, title: course.title, units: processedUnits });
            }
            if(processedCourses.length > 0) classGroups.push({ name: classData.name, courses: processedCourses });
        }
        
        // Get "General" courses (no classId)
        const generalCourses = allCourses.filter(c => !c.classId && (c.isPublished ?? true));
        const processedGeneralCourses = [];
        for (const course of generalCourses) {
            const unitsForCourse = (unitsByCourse.get(course.id) || []).filter(u => u.isPublished ?? true);
            const processedUnits = [];
            for (const unit of unitsForCourse) {
                 const topicsForUnit = (topicsByUnit.get(unit.id) || []).filter(t => t.isPublished ?? true);
                 const hasUnitFlow = (unit.steps || []).filter((s: LessonStep) => s.isPublished ?? true).length > 0;
                 if(hasUnitFlow) addFile(`flows/${unit.id}.json`, (unit.steps || []).filter((s: LessonStep) => s.isPublished ?? true));
                 if(unit.htmlContent) addFile(`ozetler/${unit.id}.html`, unit.htmlContent);

                const processedTopics = topicsForUnit.map(topic => {
                    const hasFlow = (topic.steps || []).filter((s: LessonStep) => s.isPublished ?? true).length > 0;
                    const hasOzet = !!topic.htmlContent;
                    const topicActivities = activitiesByTopic.get(topic.id) || [];
                    const hasYazilacaklar = topicActivities.some((a: ActivityItem) => a.type === 'definition') || (topic.writingContent?.notes?.length || 0) > 0;

                    if (hasFlow) addFile(`flows/${topic.id}.json`, (topic.steps || []).filter((s: LessonStep) => s.isPublished ?? true));
                    if (hasOzet) addFile(`ozetler/${topic.id}.html`, topic.htmlContent);
                    if (hasYazilacaklar) addFile(`yazilacaklar/${topic.id}.json`, {
                        notes: topic.writingContent?.notes || [],
                        conceptDefinitions: topicActivities.filter((a: ActivityItem) => a.type === 'definition').map((a: ActivityItem) => ({ concept: a.content.term, definition: a.content.definition }))
                    });
                    
                    return { id: topic.id, title: topic.title, hasOzetContent: hasOzet, hasYazilacaklarContent: hasYazilacaklar, hasFlowContent: hasFlow };
                }).filter(t => t.hasOzetContent || t.hasYazilacaklarContent || t.hasFlowContent);
                
                if (processedTopics.length > 0 || hasUnitFlow || unit.htmlContent) {
                    processedUnits.push({ id: unit.id, title: unit.title, hasUnitOzet: !!unit.htmlContent, hasFlowContent: hasUnitFlow, topics: processedTopics });
                }
            }
             if(processedUnits.length > 0) processedGeneralCourses.push({ id: course.id, title: course.title, units: processedUnits });
        }
        if (processedGeneralCourses.length > 0) {
            classGroups.unshift({ name: 'Genel', courses: processedGeneralCourses });
        }
        
        // Add the main manifest file
        addFile('manifest.json', { classGroups });

        // Write all collected files to disk in chunks
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
 * It now creates aggregated files for courses and units.
 */
export async function exportActivityData() {
    const db = getAdminDb();
    const curriculumPath = path.join(process.cwd(), 'public', 'curriculum');
    const exportPath = path.join(curriculumPath, 'activity-items');
    const allDocsToWrite: { path: string, content: string }[] = [];
    const CHUNK_SIZE = 100;

    try {
        await fs.mkdir(exportPath, { recursive: true });

        const activitiesSnapshot = await db.collection('activityItems').get();
        const allActivities = activitiesSnapshot.docs.map(doc => serialize({ id: doc.id, ...doc.data() }));

        const activitiesByTopic: { [key: string]: any[] } = {};
        const activitiesByUnit: { [key: string]: any[] } = {};
        const activitiesByCourse: { [key: string]: any[] } = {};
        
        allActivities.forEach(item => {
            if (item.topicId) {
                if (!activitiesByTopic[item.topicId]) activitiesByTopic[item.topicId] = [];
                activitiesByTopic[item.topicId].push(item);
            }
            if (item.unitId) {
                if (!activitiesByUnit[item.unitId]) activitiesByUnit[item.unitId] = [];
                activitiesByUnit[item.unitId].push(item);
            }
            if (item.courseId) {
                if (!activitiesByCourse[item.courseId]) activitiesByCourse[item.courseId] = [];
                activitiesByCourse[item.courseId].push(item);
            }
        });

        // Write per-topic files
        for (const topicId in activitiesByTopic) {
            allDocsToWrite.push({
                path: path.join(exportPath, `${topicId}.json`),
                content: JSON.stringify(activitiesByTopic[topicId])
            });
        }
        
        // Write per-unit files
        for (const unitId in activitiesByUnit) {
            allDocsToWrite.push({
                path: path.join(exportPath, `${unitId}.json`),
                content: JSON.stringify(activitiesByUnit[unitId])
            });
        }
        
        // Write per-course files
        for (const courseId in activitiesByCourse) {
            allDocsToWrite.push({
                path: path.join(exportPath, `${courseId}.json`),
                content: JSON.stringify(activitiesByCourse[courseId])
            });
        }
        
        // Write all files in chunks
        for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
            const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
        }
        
        return { success: true, message: `${allDocsToWrite.length} dosya (konu, ünite, ders) için oyun verisi başarıyla oluşturuldu.` };
    } catch (e: any) {
        console.error("Error exporting activity data:", e);
        return { success: false, error: "Oyun verileri oluşturulurken bir hata oluştu: " + e.message };
    }
}
