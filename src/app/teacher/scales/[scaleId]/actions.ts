

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

export async function getUnitScaleDetails(courseId: string, unitId: string, branchName: string | null): Promise<{ success: boolean; data?: UnitScaleDetails; error?: string }> {
    noStore();
    if (!courseId || !unitId) return { success: false, error: 'Ders veya Ünite ID\'si bulunamadı.' };
    if (!branchName) return { success: false, error: 'Şube bilgisi eksik.' };

    try {
        const courseRef = doc(db, 'courses', courseId);
        const unitRef = doc(db, `courses/${courseId}/units`, unitId);
        const [courseSnap, unitSnap] = await Promise.all([getDoc(courseRef), getDoc(unitRef)]);

        if (!courseSnap.exists()) return { success: false, error: 'Ders bulunamadı.' };
        if (!unitSnap.exists()) return { success: false, error: 'Ünite bulunamadı.' };
        
        const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
        const unit = { id: unitSnap.id, ...unitSnap.data() } as Unit;

        const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitId}/topics`), orderBy("title")));
        
        const unsortedTopics = topicsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Topic);
        
        unit.topics = unsortedTopics.sort((a, b) => 
            a.title.localeCompare(b.title, 'tr', { numeric: true, sensitivity: 'base' })
        );
        
        let students: UserProfile[] = [];
        if (course.classId) {
             const classRef = doc(db, 'classes', course.classId);
             const classSnap = await getDoc(classRef);
             if (classSnap.exists()) {
                const className = classSnap.data().name;
                const fullClassName = `${className} - ${branchName}`;
                const poolClassName = `${fullClassName} (Havuz)`;
                const studentsQuery = query(
                    collection(db, 'users'), 
                    where('role', '==', 'guest'),
                    where('class', 'in', [fullClassName, poolClassName])
                );
                const studentsSnapshot = await getDocs(studentsQuery);
                students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
             }
        }
        
        const entriesRef = collection(db, `evaluationScales/${unitId}/entries`);
        const entriesSnapshot = await getDocs(entriesRef);
        const entries: { [studentId: string]: ScaleEntry } = {};
        entriesSnapshot.forEach(docSnap => {
            entries[docSnap.id] = docSnap.data() as ScaleEntry;
        });

        return { success: true, data: JSON.parse(JSON.stringify({ 
            course: course,
            unit: unit,
            students: students,
            entries: entries,
        })) };

    } catch (error) {
        console.error("Error fetching unit scale details:", error);
        return { success: false, error: 'Ölçek detayları alınırken bir hata oluştu.' };
    }
}

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
        const scale: EvaluationScale = {
            id: scaleSnap.id,
            ...scaleData,
            createdAt: (scaleData.createdAt as Timestamp)?.toDate().toISOString()
        } as EvaluationScale;
        
        if (!scale.courseId) return { success: false, error: 'Ölçeğe bağlı ders bilgisi eksik.' };
        const courseRef = doc(db, 'courses', scale.courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) return { success: false, error: 'Ölçeğe bağlı ders bulunamadı.' };

        const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
        
        const scaleClassNameMatch = scale.name.match(/\(([^)]+)\)/);
        const scaleFullClassName = scaleClassNameMatch ? scaleClassNameMatch[1] : null;
        
        let students: UserProfile[] = [];
        if (scaleFullClassName) {
            const poolClassName = `${scaleFullClassName} (Havuz)`;
            const studentsQuery = query(
                collection(db, 'users'), 
                where('role', '==', 'guest'),
                where('class', 'in', [scaleFullClassName, poolClassName])
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        } else {
            console.warn(`Could not extract class name from scale: ${scale.name}`);
        }
        
        const entriesQuery = query(collection(db, `evaluationScales/${scaleId}/entries`));
        const entriesSnapshot = await getDocs(entriesQuery);
        const entries: { [studentId: string]: ScaleEntry } = {};
        entriesSnapshot.forEach(docSnap => {
            entries[docSnap.id] = docSnap.data() as ScaleEntry;
        });

        return { success: true, data: JSON.parse(JSON.stringify({ 
            scale: scale, 
            students: students,
            entries: entries,
            course: course,
        })) };

    } catch (error) {
        console.error("Error fetching assignment details:", error);
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
            
            const dataToSet = {
                ...entryData,
                lastUpdated: serverTimestamp()
            };

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
