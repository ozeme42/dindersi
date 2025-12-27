

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
    
    // This function now returns data with its original IDs preserved for re-importing.
    const fetchCollectionWithFilter = async (collectionName: string) => {
        let query: FirebaseFirestore.Query = db.collection(collectionName);
        
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
            // Handle 'in' query limitations (max 30 values) if necessary, for now it's simple
            for (const cond of conditions) {
                 query = query.where(cond.field, cond.op as any, cond.value);
            }
        }
       
        const snapshot = await query.get();
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
                            const publishedSteps = unitData.steps.filter((s: LessonStep) => s.isPublished ?? true);
                            if (publishedSteps.length > 0) {
                                addFile(`flows/${unitDoc.id}.json`, JSON.stringify(publishedSteps));
                            }
                        }
                    
                    const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').orderBy('title').get();
                    
                    const hasVisibleTopics = topicsSnapshot.docs.some(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                        const defsSnap = db.collection('activityItems').where('topicId', '==', topicDoc.id).where('type', '==', 'definition').limit(1).get();
                        const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || !defsSnap.empty;
                        return (topicData.isPublished ?? true) && (topicData.htmlContent || hasYazilacaklar || (topicData.steps && topicData.steps.length > 0));
                    });

                    const unitHasOzet = !!unitData.htmlContent;
                    const unitHasFlow = (unitData.steps || []).some(s => s.isPublished ?? true);
                    const hasContent = unitHasOzet || unitHasFlow || hasVisibleTopics;

                    return hasContent ? { id: unitDoc.id, title: unitData.title, hasUnitOzet: unitHasOzet, hasFlowContent: unitHasFlow, topics: [] } : null;
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

                        const defsSnap = await db.collection('activityItems').where('topicId', '==', doc.id).where('type', '==', 'definition').get();
                        const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || !defsSnap.empty;

                        if (topicData.htmlContent) {
                            addFile(`ozetler/${doc.id}.html`, topicData.htmlContent);
                        }
                        if (hasYazilacaklar) {
                            const notes = topicData.writingContent?.notes || [];
                            const conceptDefinitions = defsSnap.docs.map(d => ({concept: d.data().content.term, definition: d.data().content.definition }));
                            addFile(`yazilacaklar/${doc.id}.json`, JSON.stringify({ notes, conceptDefinitions }));
                        }
                         // Export topic steps (ders akışı)
                        if (topicData.steps && topicData.steps.length > 0) {
                            const publishedSteps = topicData.steps.filter((s: LessonStep) => s.isPublished ?? true);
                            if (publishedSteps.length > 0) {
                                addFile(`flows/${doc.id}.json`, JSON.stringify(publishedSteps));
                            }
                        }
                        
                        const hasOzetContent = !!topicData.htmlContent;
                        const hasFlowContent = (topicData.steps || []).some(s => s.isPublished ?? true);

                        if (hasOzetContent || hasYazilacaklar || hasFlowContent) {
                            return { id: doc.id, title: topicData.title, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent, hasFlowContent };
                        }
                        return null;
                    });
                    
                    const topics = (await Promise.all(topicPromises)).filter(Boolean);
                    unit.topics = topics;
                }
                course.units = course.units.filter((u: any) => u.topics.length > 0 || u.hasUnitOzet || u.hasFlowContent);
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
