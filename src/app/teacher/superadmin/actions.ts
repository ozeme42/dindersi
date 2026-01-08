
'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, Course, Unit, Topic, LessonStep, School } from "@/lib/types";

// Dosya sistemi modülleri (Node.js)
import fs from 'fs/promises';
import path from 'path';

// --- YARDIMCI FONKSİYONLAR ---

const serialize = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(serialize);
  if (data instanceof Timestamp) return data.toDate().toISOString();
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

// --- KULLANICI YÖNETİMİ ---

export async function deleteUserFromFirestore(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    try {
        const auth = getAdminAuth();
        await auth.deleteUser(userId);
        const db = getAdminDb();
        await db.collection('users').doc(userId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Silme hatası: ' + error.message };
    }
}

export async function deleteBulkUsers(userIds: string[]): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!userIds || userIds.length === 0) return { success: false, error: "Kullanıcı seçilmedi." };
    
    const auth = getAdminAuth();
    const db = getAdminDb();
    const batch = db.batch();
    let deletedCount = 0;

    const authDeletions = userIds.map(uid => auth.deleteUser(uid).catch(e => ({ uid, error: e })));
    const authResults = await Promise.allSettled(authDeletions);

    authResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const uid = userIds[index];
            batch.delete(db.collection('users').doc(uid));
            deletedCount++;
        }
    });

    try {
        await batch.commit();
        return { success: true, deletedCount };
    } catch (dbError: any) {
        return { success: false, error: "Veritabanı hatası.", deletedCount };
    }
}


export async function saveUser(data: any) {
    // Mevcut saveUser fonksiyonunuzu buraya ekleyin veya import edin
    // (Önceki kodlarınızda bu import ediliyordu, burada placeholder olarak bırakıyorum)
    return { success: true }; 
}

// --- OKUL YÖNETİMİ ---

export async function saveSchool(data: { id?: string; name: string }) {
    if (!data.name || data.name.trim() === '') return { success: false, error: "Okul adı boş olamaz." };
    const db = getAdminDb();
    try {
        if (data.id) {
            await db.collection('schools').doc(data.id).update({ name: data.name.trim() });
        } else {
            await db.collection('schools').add({ name: data.name.trim(), createdAt: new Date().toISOString() });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSchool(schoolId: string) {
    if (!schoolId) return { success: false, error: "ID gerekli." };
    const db = getAdminDb();
    try {
        await db.collection('schools').doc(schoolId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateStudentSchool(userIds: string[], schoolId: string, schoolName: string) {
    if (!userIds.length || !schoolId) return { success: false, error: "Eksik bilgi." };
    const db = getAdminDb();
    const batch = db.batch();
    try {
        userIds.forEach(userId => {
            batch.update(db.collection('users').doc(userId), { 
                schoolId, schoolName, updatedAt: new Date().toISOString() 
            });
        });
        await batch.commit();
        return { success: true, count: userIds.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// --- VERİ EXPORT (JSON İNDİRME) ---

export async function exportAllData(dataType: string, filters: any) {
    // Bu fonksiyon JSON indirme (browser) içindir.
    // Mevcut exportAllData kodunuzu buraya aynen koruyarak yapıştırın.
    // Kod kalabalığı olmaması için özet geçiyorum, eski halini koruyun.
    return []; 
}

// --- GELİŞMİŞ STATİK SİTE EXPORT FONKSİYONU ---

export async function exportStaticAdvanced(
  filters: { classId: string, courseId: string, unitId: string, topicId: string },
  types: string[] // ['manifest', 'ozet', 'questions', 'activities', 'flow', 'notes']
) {
  const db = getAdminDb();
  const publicPath = path.join(process.cwd(), 'public');
  const curriculumPath = path.join(publicPath, 'curriculum');
  
  // Klasörlerin varlığından emin ol
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
    // 1. ADIM: TÜM HİYERARŞİYİ ÇEK 
    // Filtreleme yapılsa bile Manifest oluşturulurken tüm yapıya ihtiyaç duyarız.
    // Ayrıca ID çözümlemeleri için de gereklidir.
    const [classesSnap, coursesSnap, unitsSnap, topicsSnap] = await Promise.all([
      db.collection('classes').orderBy('createdAt', 'asc').get(),
      db.collection('courses').get(),
      db.collectionGroup('units').get(),
      db.collectionGroup('topics').get()
    ]);

    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const units = unitsSnap.docs.map(d => ({ id: d.id, parentCourseId: d.ref.parent.parent!.id, ...d.data() } as Unit & { parentCourseId: string }));
    const topics = topicsSnap.docs.map(d => ({ id: d.id, parentUnitId: d.ref.parent.parent!.id, ...d.data() } as Topic & { parentUnitId: string }));

    // 2. ADIM: FİLTRELEME VE HEDEF BELİRLEME
    // Dosyaların güncelleneceği hedef ID'leri belirle.
    let targetTopicIds = new Set<string>();
    let targetUnitIds = new Set<string>();

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
    
    // Setleri doldur
    filteredTopics.forEach(t => targetTopicIds.add(t.id));
    filteredUnits.forEach(u => targetUnitIds.add(u.id));

    // Yardımcı ekleme fonksiyonu
    const addFile = (folder: string, filename: string, content: any) => {
      const finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      allDocsToWrite.push({
        path: path.join(curriculumPath, folder, filename),
        content: finalContent
      });
    };

    // 3. ADIM: MANIFEST OLUŞTURMA
    // Manifest seçiliyse, veritabanının SON ve TAM halini yazarız. Filtreli manifest, site navigasyonunu bozar.
    if (types.includes('manifest')) {
       const manifestStructure = [
           ...classes.map(cls => {
                const clsCourses = courses.filter(c => c.classId === cls.id && (c.isPublished ?? true));
                if(clsCourses.length === 0) return null;
                const processedCourses = processCoursesForManifest(clsCourses, units, topics);
                return processedCourses.length > 0 ? { name: cls.name, courses: processedCourses } : null;
           }),
           // Genel dersler (Sınıfsız)
           (() => {
               const genCourses = courses.filter(c => !c.classId && (c.isPublished ?? true));
               const processed = processCoursesForManifest(genCourses, units, topics);
               return processed.length > 0 ? { name: 'Genel', courses: processed } : null;
           })()
       ].filter(Boolean);

       addFile('', 'manifest.json', { classGroups: manifestStructure });
    }

    // 4. ADIM: İÇERİK DOSYALARINI YAZ (Sadece Filtrelenenler)
    
    // A) ÖZETLER (HTML)
    if (types.includes('ozet')) {
      for (const unit of filteredUnits) {
        if (unit.htmlContent) addFile('ozetler', `${unit.id}.html`, unit.htmlContent);
      }
      for (const topic of filteredTopics) {
        if (topic.htmlContent) addFile('ozetler', `${topic.id}.html`, topic.htmlContent);
      }
    }

    // B) DERS AKIŞLARI (FLOW)
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

    // C) NOTLAR / YAZILACAKLAR
    if (types.includes('notes')) {
      const topicIdsArray = Array.from(targetTopicIds);
      if (topicIdsArray.length > 0) {
        // Chunk ile sorgula (Firestore limiti: 30)
        for (let i = 0; i < topicIdsArray.length; i += 30) {
           const chunk = topicIdsArray.slice(i, i + 30);
           const defsSnap = await db.collection('activityItems')
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

    // D) SORULAR ve ETKİNLİKLER
    const exportCollection = async (colName: string, folder: string, typeKey: string) => {
        if (!types.includes(typeKey)) return;
        const topicIdsArray = Array.from(targetTopicIds);
        if (topicIdsArray.length === 0) return;

        for (let i = 0; i < topicIdsArray.length; i += 30) {
           const chunk = topicIdsArray.slice(i, i + 30);
           const snap = await db.collection(colName).where('topicId', 'in', chunk).get();
           
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

    // 5. ADIM: DISK YAZMA
    const CHUNK_SIZE = 50;
    for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
        const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
    }

    return { 
      success: true, 
      message: `İşlem tamamlandı. ${allDocsToWrite.length} dosya oluşturuldu/güncellendi.` 
    };

  } catch (error: any) {
    console.error("Export error:", error);
    return { success: false, error: "Dışa aktarma hatası: " + error.message };
  }
}

// Helper for Manifest Process
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

    