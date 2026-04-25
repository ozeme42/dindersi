'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, writeBatch, serverTimestamp, orderBy, Timestamp } from "firebase/firestore";
import type { EvaluationScale, UserProfile, SchoolClass, ScaleEntry, Course, Unit, Topic, EvaluationScaleColumn } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type ScaleDetails = {
    scale: EvaluationScale;
    students: UserProfile[];
    entries: { [studentId: string]: ScaleEntry };
    course: Course;
}

export type UnitScaleDetails = {
    unit: Unit;
    course: Course;
    students: UserProfile[];
    entries: { [studentId: string]: ScaleEntry };
}

// GÜVENLİ SERIALIZER
const serialize = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (Array.isArray(data)) return data.map(serialize);
    
    if (data && typeof data === 'object' && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    
    if (data instanceof Date) {
        return data.toISOString();
    }
  
    if (data && typeof data === 'object' && '_seconds' in data && '_nanoseconds' in data) {
        return new Date(data._seconds * 1000).toISOString();
    }
    
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

/**
 * Ünite bazlı ölçek detaylarını getirir.
 * SADECE 'guest' (sanal) öğrencileri getirir.
 */
export async function getUnitScaleDetails(
    courseId: string, 
    unitId: string, 
    branchName: string | null,
    teacherSchoolName: string | null
): Promise<{ success: boolean; data?: UnitScaleDetails; error?: string }> {
    noStore();
    if (!courseId || !unitId) return { success: false, error: 'Ders veya Ünite ID\'si bulunamadı.' };

    try {
        const courseRef = doc(db, 'courses', courseId);
        const unitRef = doc(db, `courses/${courseId}/units`, unitId);
        const [courseSnap, unitSnap] = await Promise.all([getDoc(courseRef), getDoc(unitRef)]);

        if (!courseSnap.exists() || !unitSnap.exists()) {
             return { success: false, error: 'Ders veya ünite bulunamadı.' };
        }
        
        const courseData = { id: courseSnap.id, ...courseSnap.data() } as Course;
        const unitData = { id: unitSnap.id, ...unitSnap.data() } as Unit;

        const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitId}/topics`)));
        unitData.topics = topicsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Topic)
            .sort((a, b) => a.title.localeCompare(b.title, 'tr', { numeric: true }));
        
        // KRİTİK: Sadece 'guest' rolünü çekiyoruz
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'guest'));
        const studentsSnapshot = await getDocs(studentsQuery);
        let students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        
        if (teacherSchoolName) {
            students = students.filter(s => s.schoolName === teacherSchoolName);
        }

        if (courseData.classId) {
            const classSnap = await getDoc(doc(db, 'classes', courseData.classId));
            if (classSnap.exists()) {
                const className = classSnap.data().name;
                if (branchName && branchName !== 'all') {
                    const fullClassName = `${className} - ${branchName}`;
                    const poolClassName = `${fullClassName} (Havuz)`;
                    students = students.filter(s => s.class === fullClassName || s.class === poolClassName);
                } else {
                    students = students.filter(s => s.class?.startsWith(className));
                }
            }
        }
        
        const entriesRef = collection(db, `evaluationScales/${unitId}/entries`);
        const entriesSnapshot = await getDocs(entriesRef);
        const entries: { [studentId: string]: ScaleEntry } = {};
        entriesSnapshot.forEach(docSnap => {
            entries[docSnap.id] = docSnap.data() as ScaleEntry;
        });

        const finalData = { 
            course: courseData,
            unit: unitData,
            students: students,
            entries: entries,
        };

        return { success: true, data: serialize(finalData) };

    } catch (error) {
        console.error("Error fetching unit scale details:", error);
        return { success: false, error: 'Ölçek detayları alınırken bir hata oluştu.' };
    }
}

/**
 * Manuel ölçek detaylarını getirir.
 * SADECE 'guest' (sanal) öğrencileri getirir.
 */
export async function getScaleDetails(scaleId: string): Promise<{ success: boolean; data?: ScaleDetails; error?: string }> {
    noStore();
    if (!scaleId) return { success: false, error: 'Ölçek ID\'si bulunamadı.' };

    try {
        const scaleRef = doc(db, 'evaluationScales', scaleId);
        const scaleSnap = await getDoc(scaleRef);

        if (!scaleSnap.exists()) {
            return { success: false, error: 'Ölçek bulunamadı.' };
        }

        const scaleData = scaleSnap.data();
        const scale = { id: scaleSnap.id, ...scaleData } as EvaluationScale;
        
        if (!scale.courseId) return { success: false, error: 'Ölçeğe bağlı ders bilgisi eksik.' };
        const courseSnap = await getDoc(doc(db, 'courses', scale.courseId));
        if (!courseSnap.exists()) return { success: false, error: 'Ölçeğe bağlı ders bulunamadı.' };
        const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
        
        // KRİTİK: Sadece 'guest' rolünü çekiyoruz
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'guest'));
        const studentsSnapshot = await getDocs(studentsQuery);
        let students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

        const teacherSnap = await getDoc(doc(db, 'users', scale.teacherId));
        if (teacherSnap.exists()) {
            const teacherData = teacherSnap.data() as UserProfile;
            if (teacherData.schoolName) {
                students = students.filter(s => s.schoolName === teacherData.schoolName);
            }
        }

        const classMatch = scale.name.match(/\(([^)]+)\)/);
        if (classMatch) {
            const targetClassStr = classMatch[1]; 
            if (targetClassStr.includes(' - all')) {
                const baseClass = targetClassStr.split(' - ')[0];
                students = students.filter(s => s.class?.startsWith(baseClass));
            } else {
                const poolClassName = `${targetClassStr} (Havuz)`;
                students = students.filter(s => s.class === targetClassStr || s.class === poolClassName);
            }
        }
        
        const entriesSnapshot = await getDocs(collection(db, `evaluationScales/${scaleId}/entries`));
        const entries: { [studentId: string]: ScaleEntry } = {};
        entriesSnapshot.forEach(docSnap => {
            entries[docSnap.id] = docSnap.data() as ScaleEntry;
        });

        const finalData = { 
            scale: scale, 
            students: students,
            entries: entries,
            course: course,
        };

        return { success: true, data: serialize(finalData) };

    } catch (error: any) {
        console.error("Error fetching scale details:", error);
        return { success: false, error: 'Ölçek detayları alınırken bir hata oluştu.' };
    }
}

export async function saveScaleEntries(scaleId: string, entries: { [studentId: string]: ScaleEntry }): Promise<{ success: boolean; error?: string }> {
    if (!scaleId || !entries) {
        return { success: false, error: "Eksik bilgi." };
    }

    try {
        const batch = writeBatch(db);
        
        for (const studentId in entries) {
            const entryData = entries[studentId];
            const entryRef = doc(db, `evaluationScales/${scaleId}/entries`, studentId);
            
            const cleanedHistory = entryData.history ? JSON.parse(JSON.stringify(entryData.history)) : null;

            const dataToSet: any = {
                ...entryData,
                lastUpdated: serverTimestamp()
            };
            
            if (cleanedHistory) dataToSet.history = cleanedHistory;

            batch.set(entryRef, dataToSet, { merge: true });
        }

        await batch.commit();
        return { success: true };

    } catch(e: any) {
        console.error("Error saving scale entries:", e);
        return { success: false, error: "Değerlendirmeler kaydedilirken bir hata oluştu." };
    }
}

export async function updateScaleColumns(scaleId: string, columns: EvaluationScaleColumn[]): Promise<{ success: boolean; error?: string }> {
    if (!scaleId) {
        return { success: false, error: "Ölçek ID'si belirtilmedi." };
    }
    try {
        const scaleRef = doc(db, 'evaluationScales', scaleId);
        await updateDoc(scaleRef, { columns });
        return { success: true };
    } catch (error) {
        console.error("Error updating scale columns:", error);
        return { success: false, error: "Sütunlar güncellenirken bir hata oluştu." };
    }
}
