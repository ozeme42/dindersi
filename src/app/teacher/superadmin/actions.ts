'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
// Admin SDK importlarını isimlendirerek ayırıyoruz
import { Timestamp as AdminTimestamp, FieldValue } from "firebase-admin/firestore"; 
import { db } from "@/lib/firebase"; 
// Client SDK importları
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, Timestamp as ClientTimestamp, serverTimestamp } from 'firebase/firestore'; 
import { unstable_noStore as noStore } from 'next/cache';
import type { UserProfile, SchoolClass, Course, Unit, Topic, LessonStep, School, Announcement } from "@/lib/types";

// Dosya sistemi modülleri
import fs from 'fs/promises';
import path from 'path';
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

// --- TİP TANIMLARI ---
type LeaderboardEntry = UserProfile & { score: number };

export type HallOfFamePeriod = {
    periodName: string;
    winners: LeaderboardEntry[];
};

export type ClassLeaderboardEntry = {
    name: string;
    totalScore: number;
    studentCount: number;
};

// --- YARDIMCI FONKSİYON: GÜVENLİ SERIALIZER ---
const serialize = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(serialize);
  
  if (data && typeof data === 'object' && typeof data.toDate === 'function') {
      return data.toDate().toISOString();
  }

  if (data && typeof data === 'object' && '_seconds' in data) {
      return new Date(data._seconds * 1000).toISOString();
  }
  
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
// 1. BÖLÜM: LEADERBOARD VERİLERİ (Öğrenci Sayfası İçin - Okuma Amaçlı)
// ==========================================

export async function getLiveLeaderboard(): Promise<LeaderboardEntry[]> {
    noStore();
    try {
        const usersQuery = query(
            collection(db, 'users'), 
            where('role', '==', 'student'), 
            orderBy('score', 'desc'), 
            limit(100)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const leaderboard = usersSnapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id,
            score: doc.data().score || 0
        } as LeaderboardEntry));
        
        return serialize(leaderboard);
    } catch (e) {
        console.error("Leaderboard fetch error:", e);
        return [];
    }
}

export async function getHallOfFameData(): Promise<{ seasons: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }> {
    noStore();

    const adminDb = getAdminDb();
    const seasonsSnap = await adminDb.collection('archivedSeasons').orderBy('createdAt', 'desc').get();
    
    const seasons = seasonsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            periodName: data.seasonName,
            winners: data.leaderboard.slice(0, 10)
        } as HallOfFamePeriod;
    });

    const monthlyWinners: HallOfFamePeriod[] = [];
    const now = new Date();
    const startDate = subMonths(now, 6);
    const months = eachMonthOfInterval({ start: startDate, end: now });

    const usersSnapshot = await getDocs(query(collection(db, 'users'), where("role", "==", "student")));
    const studentsMap = new Map();
    usersSnapshot.forEach(doc => studentsMap.set(doc.id, { uid: doc.id, ...doc.data() }));

    for (const month of months) {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthlyEventsQuery = query(
            collection(db, 'scoreEvents'),
            where("timestamp", ">=", ClientTimestamp.fromDate(monthStart)),
            where("timestamp", "<=", ClientTimestamp.fromDate(monthEnd))
        );
        
        try {
            const eventsSnapshot = await getDocs(monthlyEventsQuery);
            const scoresByStudent = new Map<string, number>();
            
            eventsSnapshot.forEach(eventDoc => {
                const event = eventDoc.data();
                if (event.gameType === 'holiday_reward') return; 
                
                const currentScore = scoresByStudent.get(event.userId) || 0;
                scoresByStudent.set(event.userId, currentScore + event.points);
            });

            if (scoresByStudent.size > 0) {
                const leaderboard = Array.from(scoresByStudent.entries())
                    .map(([uid, score]) => ({ student: studentsMap.get(uid), score }))
                    .filter((entry): entry is { student: UserProfile; score: number } => !!entry.student && entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(entry => ({...entry.student, score: entry.score }));

                if (leaderboard.length > 0) {
                    monthlyWinners.push({
                        periodName: format(monthStart, 'MMMM yyyy', { locale: tr }),
                        winners: leaderboard,
                    });
                }
            }
        } catch (e) {
            console.warn(`Monthly stats error for ${month}:`, e);
        }
    }
    
    return {
        seasons: serialize(seasons),
        monthly: serialize(monthlyWinners.reverse()),
    };
}

export async function archiveAndResetScores(seasonName: string) {
    const adminDb = getAdminDb();
    try {
        const usersSnap = await adminDb.collection('users')
            .where('role', '==', 'student')
            .orderBy('score', 'desc')
            .limit(100)
            .get();
            
        const leaderboard = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        await adminDb.collection('archivedSeasons').add({
            seasonName,
            leaderboard,
            createdAt: new Date(),
        });

        const batch = adminDb.batch();
        const allStudentsSnap = await adminDb.collection('users').where('role', '==', 'student').get();
        
        let operationCount = 0;
        for (const doc of allStudentsSnap.docs) {
            batch.update(doc.ref, { score: 0 });
            operationCount++;
            if (operationCount >= 450) {
                await batch.commit();
                operationCount = 0;
            }
        }
        
        if (operationCount > 0) await batch.commit();

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ==========================================
// 2. BÖLÜM: DUYURU YÖNETİMİ
// ==========================================

export async function getAnnouncements(category: 'general' | 'exam' = 'general'): Promise<{ success: boolean; data?: Announcement[]; error?: string }> {
    try {
        const q = query(collection(db, 'announcements'), where('category', '==', category), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            let createdIso = new Date().toISOString();
            if (docData.createdAt && typeof docData.createdAt.toDate === 'function') {
                createdIso = docData.createdAt.toDate().toISOString();
            } else if (docData.createdAt && docData.createdAt._seconds) {
                 createdIso = new Date(docData.createdAt._seconds * 1000).toISOString();
            }

            return {
                id: doc.id,
                ...docData,
                createdAt: createdIso
            };
        });

        return { success: true, data: serialize(data) };
    } catch (e: any) {
        console.error("Error getting announcements:", e);
        return { success: false, error: "Duyurular alınamadı." };
    }
}

export async function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    try {
        await addDoc(collection(db, 'announcements'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru oluşturulamadı." };
    }
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'announcements', id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru silinemedi." };
    }
}

// ==========================================
// 3. BÖLÜM: YÖNETİM (Kullanıcı, Okul, Export)
// ==========================================

export async function deleteUserFromFirestore(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    try {
        const auth = getAdminAuth();
        await auth.deleteUser(userId);
        const adminDb = getAdminDb();
        await adminDb.collection('users').doc(userId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Silme hatası: ' + error.message };
    }
}

export async function deleteBulkUsers(userIds: string[]): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!userIds || userIds.length === 0) return { success: false, error: "Kullanıcı seçilmedi." };
    
    const auth = getAdminAuth();
    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    let deletedCount = 0;

    const authDeletions = userIds.map(uid => auth.deleteUser(uid).catch(e => ({ uid, error: e })));
    const authResults = await Promise.allSettled(authDeletions);

    authResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const uid = userIds[index];
            batch.delete(adminDb.collection('users').doc(uid));
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
    // Placeholder 
    return { success: true }; 
}

// --- OKUL YÖNETİMİ ---

export async function saveSchool(data: { id?: string; name: string }) {
    if (!data.name || data.name.trim() === '') return { success: false, error: "Okul adı boş olamaz." };
    const adminDb = getAdminDb();
    try {
        if (data.id) {
            await adminDb.collection('schools').doc(data.id).update({ name: data.name.trim() });
        } else {
            await adminDb.collection('schools').add({ name: data.name.trim(), createdAt: new Date().toISOString() });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSchool(schoolId: string) {
    if (!schoolId) return { success: false, error: "ID gerekli." };
    const adminDb = getAdminDb();
    try {
        await adminDb.collection('schools').doc(schoolId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateStudentSchool(userIds: string[], schoolId: string, schoolName: string) {
    if (!userIds.length || !schoolId) return { success: false, error: "Eksik bilgi." };
    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    try {
        userIds.forEach(userId => {
            batch.update(adminDb.collection('users').doc(userId), { 
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
    const adminDb = getAdminDb();
    try {
        let query: any = adminDb.collection(dataType);
        const snapshot = await query.get();
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return serialize(data);
    } catch (error) {
        console.error("Export error:", error);
        return [];
    }
}

// --- GELİŞMİŞ STATİK SİTE EXPORT FONKSİYONU ---

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

    // Filtreleme
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
    
    filteredTopics.forEach(t => targetTopicIds.add(t.id));
    filteredUnits.forEach(u => targetUnitIds.add(u.id));

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
      message: `İşlem tamamlandı. ${allDocsToWrite.length} dosya oluşturuldu/güncellendi.` 
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