'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { deduplicateStudents } from "@/lib/utils";

export interface QuranStudentProgress {
    id: string; // studentUid
    studentUid: string;
    studentName: string;
    studentNumber?: string;
    classId: string;
    className: string;
    branch: string;
    currentStageId: string; // e.g., 'harfler', 'ustun1', 'cezm', 'cuz'
    cuzPage?: number;       // e.g. 1 - 30 (or Quran page 1 - 604)
    cuzNumber?: number;     // e.g. 1 - 30
    stages: {
        [stageId: string]: {
            status: 'completed' | 'in_progress' | 'not_started';
            completedAt?: string;
            score?: number; // 0-100
            notes?: string;
            passedCount?: number; // E.g., 25/28 letters
            totalCount?: number;
        };
    };
    lastAssessedAt?: string;
    teacherNotes?: string;
}

const serialize = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (Array.isArray(data)) return data.map(serialize);
    if (data && typeof data === 'object' && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (data && typeof data === 'object' && '_seconds' in data && '_nanoseconds' in data) {
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

/**
 * Belirli bir sınıf ve şube için kayıtlı öğrencileri ve Kur'an takip verilerini getirir.
 */
export async function getQuranTrackerData(classId: string, branch: string, teacherId?: string): Promise<{
    success: boolean;
    students?: UserProfile[];
    progress?: { [studentUid: string]: QuranStudentProgress };
    className?: string;
    error?: string;
}> {
    noStore();
    if (!classId || !branch) {
        return { success: false, error: 'Sınıf ve şube seçilmelidir.' };
    }

    try {
        const classDoc = await getDoc(doc(db, "classes", classId));
        if (!classDoc.exists()) {
            return { success: false, error: "Seçilen sınıf bulunamadı." };
        }
        const className = classDoc.data().name as string;

        // Öğrencileri çek (role: guest veya student)
        let studentsQuery;
        if (branch === 'all') {
            studentsQuery = query(
                collection(db, 'users'),
                where('class', '>=', className),
                where('class', '<', className + '\uf8ff')
            );
        } else {
            const fullClassName = `${className} - ${branch}`;
            const poolClassName = `${fullClassName} (Havuz)`;
            studentsQuery = query(
                collection(db, 'users'),
                where('class', 'in', [fullClassName, poolClassName])
            );
        }

        const studentsSnap = await getDocs(studentsQuery);
        let rawStudents = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() }) as UserProfile);

        // Okul filtresi (öğretmenle eşleşme)
        if (teacherId) {
            const teacherSnap = await getDoc(doc(db, 'users', teacherId));
            if (teacherSnap.exists()) {
                const teacherData = teacherSnap.data() as UserProfile;
                if (teacherData.schoolName) {
                    rawStudents = rawStudents.filter(s => s.schoolName === teacherData.schoolName);
                }
            }
        }

        const students = deduplicateStudents(rawStudents);
        students.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'tr', { sensitivity: 'base' }));

        const studentIds = students.map(s => s.uid);
        const progressMap: { [studentUid: string]: QuranStudentProgress } = {};

        if (studentIds.length > 0) {
            // Firestore 'in' sorgusu en fazla 30 eleman alır
            const chunks: string[][] = [];
            for (let i = 0; i < studentIds.length; i += 30) {
                chunks.push(studentIds.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                const q = query(
                    collection(db, 'quran_progress'),
                    where('studentUid', 'in', chunk)
                );
                const snap = await getDocs(q);
                snap.forEach(d => {
                    const data = d.data() as QuranStudentProgress;
                    progressMap[data.studentUid] = { ...data, id: d.id };
                });
            }
        }

        return {
            success: true,
            students: serialize(students),
            progress: serialize(progressMap),
            className
        };

    } catch (error: any) {
        console.error("Error fetching quran tracker data:", error);
        return { success: false, error: error.message || 'Veriler alınamadı.' };
    }
}

/**
 * Tek bir öğrencinin Kur'an/Elifba ilerlemesini kaydeder veya günceller.
 */
export async function saveStudentQuranProgress(data: {
    studentUid: string;
    studentName: string;
    studentNumber?: string;
    classId: string;
    className: string;
    branch: string;
    stageId: string;
    status: 'completed' | 'in_progress' | 'not_started';
    cuzPage?: number;
    score?: number;
    notes?: string;
    passedCount?: number;
    totalCount?: number;
    teacherNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
    if (!data.studentUid) {
        return { success: false, error: 'Öğrenci kimliği eksik.' };
    }

    try {
        const docRef = doc(db, 'quran_progress', data.studentUid);
        const existingSnap = await getDoc(docRef);
        const existingData = existingSnap.exists() ? (existingSnap.data() as QuranStudentProgress) : null;

        const currentStages = existingData?.stages || {};
        
        currentStages[data.stageId] = {
            status: data.status,
            completedAt: data.status === 'completed' ? new Date().toISOString() : currentStages[data.stageId]?.completedAt,
            score: data.score !== undefined ? data.score : currentStages[data.stageId]?.score,
            notes: data.notes || currentStages[data.stageId]?.notes || '',
            passedCount: data.passedCount !== undefined ? data.passedCount : currentStages[data.stageId]?.passedCount,
            totalCount: data.totalCount !== undefined ? data.totalCount : currentStages[data.stageId]?.totalCount
        };

        // Eğer tamamlandıysa ve şu anki aşama bu ise, otomatik bir sonraki aşamaya işaret et
        const payload: Partial<QuranStudentProgress> = {
            studentUid: data.studentUid,
            studentName: data.studentName,
            studentNumber: data.studentNumber || existingData?.studentNumber || '',
            classId: data.classId,
            className: data.className,
            branch: data.branch,
            currentStageId: data.stageId,
            stages: currentStages,
            lastAssessedAt: new Date().toISOString()
        };

        if (data.cuzPage !== undefined) {
            payload.cuzPage = data.cuzPage;
        } else if (existingData?.cuzPage) {
            payload.cuzPage = existingData.cuzPage;
        }

        if (data.teacherNotes !== undefined) {
            payload.teacherNotes = data.teacherNotes;
        } else if (existingData?.teacherNotes) {
            payload.teacherNotes = existingData.teacherNotes;
        }

        await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error saving student quran progress:", error);
        return { success: false, error: error.message || 'Kayıt sırasında hata oluştu.' };
    }
}

/**
 * Toplu olarak seçilen öğrencilerin belirli bir aşamasını günceller.
 */
export async function batchUpdateQuranStage(
    students: { uid: string; name: string }[],
    stageId: string,
    status: 'completed' | 'in_progress' | 'not_started',
    classInfo: { classId: string; className: string; branch: string }
): Promise<{ success: boolean; error?: string }> {
    if (!students.length) {
        return { success: false, error: 'Öğrenci seçilmedi.' };
    }

    try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();

        for (const s of students) {
            const docRef = doc(db, 'quran_progress', s.uid);
            const snap = await getDoc(docRef);
            const prev = snap.exists() ? (snap.data() as QuranStudentProgress) : null;
            const stages = prev?.stages || {};

            stages[stageId] = {
                status,
                completedAt: status === 'completed' ? now : undefined,
                score: status === 'completed' ? 100 : undefined
            };

            batch.set(docRef, {
                studentUid: s.uid,
                studentName: s.name,
                classId: classInfo.classId,
                className: classInfo.className,
                branch: classInfo.branch,
                currentStageId: stageId,
                stages,
                lastAssessedAt: now,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Batch update error:", error);
        return { success: false, error: error.message || 'Toplu güncelleme başarısız.' };
    }
}
