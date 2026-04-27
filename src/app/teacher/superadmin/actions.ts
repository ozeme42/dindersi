'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp as AdminTimestamp, FieldValue } from "firebase-admin/firestore"; 
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, Timestamp as ClientTimestamp, serverTimestamp } from 'firebase/firestore'; 
import { unstable_noStore as noStore } from 'next/cache';
import type { UserProfile, SchoolClass, Course, Unit, Topic, LessonStep, School, Announcement } from "@/lib/types";

import fs from 'fs/promises';
import path from 'path';

const serialize = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(serialize);
  if (data && typeof data === 'object' && typeof data.toDate === 'function') return data.toDate().toISOString();
  if (data && typeof data === 'object' && '_seconds' in data) return new Date(data._seconds * 1000).toISOString();
  if (data instanceof Date) return data.toISOString();
  if (typeof data === 'object') {
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

// ==========================================
// KULLANICI VE OKUL YÖNETİMİ
// ==========================================

export async function deleteUserFromFirestore(userId: string) {
    const db = getAdminDb();
    const auth = getAdminAuth();
    try {
        await db.collection('users').doc(userId).delete();
        try {
            await auth.deleteUser(userId);
        } catch (authError) {
            console.warn("User deleted from Firestore but not from Auth:", authError);
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteBulkUsers(userIds: string[]) {
    const db = getAdminDb();
    const auth = getAdminAuth();
    const batch = db.batch();
    try {
        for (const uid of userIds) {
            batch.delete(db.collection('users').doc(uid));
            try {
                await auth.deleteUser(uid);
            } catch (e) {}
        }
        await batch.commit();
        return { success: true, deletedCount: userIds.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveSchool(school: Partial<School>) {
    const db = getAdminDb();
    try {
        if (school.id) {
            await db.collection('schools').doc(school.id).update({ name: school.name });
        } else {
            await db.collection('schools').add({ name: school.name, createdAt: FieldValue.serverTimestamp() });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSchool(schoolId: string) {
    const db = getAdminDb();
    try {
        await db.collection('schools').doc(schoolId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateStudentSchool(userIds: string[], schoolId: string, schoolName: string) {
    const db = getAdminDb();
    const batch = db.batch();
    try {
        userIds.forEach(uid => {
            batch.update(db.collection('users').doc(uid), { schoolId, schoolName });
        });
        await batch.commit();
        return { success: true, count: userIds.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// VERİ DIŞA AKTARMA (JSON EXPORT)
// ==========================================

export async function exportAllData(type: string, filters: any) {
    const db = getAdminDb();
    let collectionName = '';
    switch (type) {
        case 'users': collectionName = 'users'; break;
        case 'curriculum': collectionName = 'courses'; break;
        case 'questions': collectionName = 'questions'; break;
        case 'examQuestions': collectionName = 'examQuestions'; break;
        case 'activity-items': collectionName = 'activityItems'; break;
        case 'scoreEvents': collectionName = 'scoreEvents'; break;
        default: collectionName = type;
    }

    try {
        let q: FirebaseFirestore.Query = db.collection(collectionName);
        
        // Basit filtreleme (Gerekirse genişletilebilir)
        if (filters.classId && filters.classId !== 'all' && type === 'users') {
             // User tablosunda classId yok, className üzerinden veya manuel filtreleme gerekir
        }

        const snap = await q.get();
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return serialize(data);
    } catch (error) {
        console.error("Export error:", error);
        throw error;
    }
}

// ==========================================
// STATİK SİTE EXPORT FONKSİYONU
// ==========================================

export async function exportStaticAdvanced(
  filters: { classId: string, courseId: string, unitId: string, topicId: string },
  types: string[] 
) {
  const adminDb = getAdminDb();
  const publicPath = path.join(process.cwd(), 'public');
  const curriculumPath = path.join(publicPath, 'curriculum');
  
  const dirs = ['ozetler', 'yazilacaklar', 'flows', 'questions', 'activityItems'];
  
  try {
      await fs.mkdir(curriculumPath, { recursive: true });
      for (const d of dirs) {
        await fs.mkdir(path.join(curriculumPath, d), { recursive: true });
      }
  } catch (e) {
      console.error("Klasör oluşturma hatası:", e);
  }

  const allDocsToWrite: { path: string, content: string }[] = [];

  try {
    const [classesSnap, coursesSnap, unitsSnap, topicsSnap] = await Promise.all([
      adminDb.collection('classes').orderBy('createdAt', 'asc').get(),
      adminDb.collection('courses').get(),
      adminDb.collectionGroup('units').get(),
      adminDb.collectionGroup('topics').get()
    ]);

    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const units = unitsSnap.docs.map(d => ({ id: d.id, parentCourseId: d.ref.parent.parent!.id, ...d.data() } as Unit & { parentCourseId: string }));
    const topics = topicsSnap.docs.map(d => ({ id: d.id, parentUnitId: d.ref.parent.parent!.id, ...d.data() } as Topic & { parentUnitId: string }));

    const filteredCourses = courses.filter(c => 
      (filters.classId === 'all' || c.classId === filters.classId) &&
      (filters.courseId === 'all' || c.id === filters.courseId)
    );
    const filteredCourseIds = new Set(filteredCourses.map(c => c.id));

    const filteredUnits = units.filter(u => 
      filteredCourseIds.has(u.parentCourseId) &&
      (filters.unitId === 'all' || u.id === filters.unitId)
    );
    const filteredUnitIds = new Set(filteredUnits.map(u => u.id));

    const filteredTopics = topics.filter(t => 
      filteredUnitIds.has(t.parentUnitId) &&
      (filters.topicId === 'all' || t.id === filters.topicId)
    );
    
    const targetTopicIds = new Set(filteredTopics.map(t => t.id));

    const addFile = (folder: string, filename: string, content: any) => {
      const finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      allDocsToWrite.push({
        path: path.join(curriculumPath, folder, filename),
        content: finalContent
      });
    };

    if (types.includes('manifest')) {
       const manifestStructure = [
           ...classes.map(cls => {
               const clsCourses = courses.filter(c => c.classId === cls.id && (c.isPublished ?? true));
               if(clsCourses.length === 0) return null;
               const processedCourses = processCoursesForManifest(clsCourses, units, topics);
               return processedCourses.length > 0 ? { name: cls.name, courses: processedCourses } : null;
           }),
           (() => {
               const genCourses = courses.filter(c => !c.classId && (c.isPublished ?? true));
               const processed = processCoursesForManifest(genCourses, units, topics);
               return processed.length > 0 ? { name: 'Genel', courses: processed } : null;
           })()
       ].filter(Boolean);

       addFile('', 'manifest.json', { classGroups: manifestStructure });
    }

    if (types.includes('ozet')) {
      for (const unit of filteredUnits) {
        if (unit.htmlContent) addFile('ozetler', `${unit.id}.html`, unit.htmlContent);
      }
      for (const topic of filteredTopics) {
        if (topic.htmlContent) addFile('ozetler', `${topic.id}.html`, topic.htmlContent);
      }
    }

    if (types.includes('flow')) {
      for (const unit of filteredUnits) {
        const published = (unit.steps || []).filter((s:any) => s.isPublished !== false);
        if(published.length) addFile('flows', `${unit.id}.json`, published);
      }
      for (const topic of filteredTopics) {
        const published = (topic.steps || []).filter((s:any) => s.isPublished !== false);
        if(published.length) addFile('flows', `${topic.id}.json`, published);
      }
    }

    if (types.includes('notes')) {
      const topicIdsArray = Array.from(targetTopicIds);
      if (topicIdsArray.length > 0) {
        for (let i = 0; i < topicIdsArray.length; i += 30) {
           const chunk = topicIdsArray.slice(i, i + 30);
           const defsSnap = await adminDb.collection('activityItems')
             .where('topicId', 'in', chunk)
             .where('type', '==', 'definition')
             .get();
           
           const defsByTopic: Record<string, any[]> = {};
           defsSnap.docs.forEach(d => {
             const data = d.data();
             if(!defsByTopic[data.topicId]) defsByTopic[data.topicId] = [];
             defsByTopic[data.topicId].push({ concept: data.content.term, definition: data.content.definition });
           });

           for (const tId of chunk) {
             const topic = topics.find(t => t.id === tId);
             const notes = topic?.writingContent?.notes || [];
             const defs = defsByTopic[tId] || [];
             if (notes.length > 0 || defs.length > 0) {
               addFile('yazilacaklar', `${tId}.json`, { notes, conceptDefinitions: defs });
             }
           }
        }
      }
    }

    const exportCollection = async (colName: string, folder: string, typeKey: string) => {
        if (!types.includes(typeKey)) return;
        const topicIdsArray = Array.from(targetTopicIds);
        if (topicIdsArray.length === 0) return;

        for (let i = 0; i < topicIdsArray.length; i += 30) {
           const chunk = topicIdsArray.slice(i, i + 30);
           const snap = await adminDb.collection(colName).where('topicId', 'in', chunk).get();
           
           const itemsByTopic: Record<string, any[]> = {};
           snap.docs.forEach(d => {
              const data = d.data();
              if(!itemsByTopic[data.topicId]) itemsByTopic[data.topicId] = [];
              itemsByTopic[data.topicId].push(serialize({ id: d.id, ...data }));
           });

           for (const tId of chunk) {
             if (itemsByTopic[tId]) {
                addFile(folder, `${tId}.json`, itemsByTopic[tId]);
             }
           }
        }
    };

    await exportCollection('questions', 'questions', 'questions');
    await exportCollection('activityItems', 'activityItems', 'activities');

    const CHUNK_SIZE = 50;
    for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
        const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
    }

    return { 
      success: true, 
      message: `İşlem tamamlandı. ${allDocsToWrite.length} dosya oluşturuldu.` 
    };

  } catch (error: any) {
    console.error("Export error:", error);
    return { success: false, error: "Dışa aktarma hatası: " + error.message };
  }
}

function processCoursesForManifest(courseList: any[], units: any[], topics: any[]) {
    return courseList.map(course => {
        const courseUnits = units.filter(u => u.parentCourseId === course.id && (u.isPublished ?? true));
        if(courseUnits.length === 0) return null;

        const processedUnits = courseUnits.map(unit => {
            const unitTopics = topics.filter(t => t.parentUnitId === unit.id && (t.isPublished ?? true));
            const hasContent = unit.htmlContent || (unit.steps?.length) || unitTopics.length > 0;
            if(!hasContent) return null;

            return {
                id: unit.id,
                title: unit.title,
                hasUnitOzet: !!unit.htmlContent,
                hasFlowContent: (unit.steps || []).some((s:any) => s.isPublished),
                topics: unitTopics.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    hasOzetContent: !!t.htmlContent,
                    hasFlowContent: (t.steps || []).some((s:any) => s.isPublished),
                    hasYazilacaklarContent: (t.writingContent?.notes?.length || 0) > 0 
                }))
            };
        }).filter(Boolean);

        return processedUnits.length > 0 ? { id: course.id, title: course.title, units: processedUnits } : null;
    }).filter(Boolean);
}