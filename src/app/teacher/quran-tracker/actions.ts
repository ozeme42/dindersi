'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { deduplicateStudents } from "@/lib/utils";
import { KURAN_BOOK_PAGES, type KuranBookPage } from "@/lib/kuran-ders-kitabi-data";

export interface AyahScoreRecord {
    ayahNumber: number;
    ayahText?: string;
    score: number; // 0-100 (bu ayetin rubrik puani)
    criteriaScores: Record<string, number>; // 10 kriter puani (0-10)
    notes?: string;
}

export interface BookReadingRecord {
    readingId: string;
    grade: number;
    pageNumber: number;
    status: 'completed' | 'in_progress' | 'needs_practice';
    score: number; // 0-100 (Genel Sayfa / Ayetlerin Ortalamasi)
    criteriaScores: Record<string, number>;
    ayahScores?: Record<number, AyahScoreRecord>;
    evaluationMode?: 'ayah' | 'page';
    evaluatedAyahCount?: number;
    totalAyahCount?: number;
    teacherNotes?: string;
    completedAt: string;
}

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
    bookReadings?: {
        [readingId: string]: BookReadingRecord;
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
 * Firestore'a veri yazılırken `undefined` değerli alanları temizler.
 * Firestore `undefined` alanları kabul etmez ve FirebaseError (invalid-argument) fırlatır.
 */
function cleanUndefined<T>(obj: T): T {
    if (obj === null || obj === undefined) return null as any;
    if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefined(item)) as any;
    }
    if (typeof obj === 'object' && !(obj instanceof Date)) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                result[key] = typeof value === 'object' && value !== null && !(value instanceof Date)
                    ? cleanUndefined(value)
                    : value;
            }
        }
        return result;
    }
    return obj;
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

        const currentStages: Record<string, any> = { ...(existingData?.stages || {}) };
        const prevStage = currentStages[data.stageId] || {};

        const stageUpdate: Record<string, any> = {
            status: data.status,
            notes: data.notes ?? prevStage.notes ?? ''
        };

        if (data.status === 'completed') {
            stageUpdate.completedAt = prevStage.completedAt || new Date().toISOString();
            stageUpdate.score = data.score !== undefined ? data.score : (prevStage.score ?? 100);
        } else {
            if (prevStage.completedAt) stageUpdate.completedAt = prevStage.completedAt;
            if (data.score !== undefined) {
                stageUpdate.score = data.score;
            } else if (prevStage.score !== undefined) {
                stageUpdate.score = prevStage.score;
            }
        }

        if (data.passedCount !== undefined) {
            stageUpdate.passedCount = data.passedCount;
        } else if (prevStage.passedCount !== undefined) {
            stageUpdate.passedCount = prevStage.passedCount;
        }

        if (data.totalCount !== undefined) {
            stageUpdate.totalCount = data.totalCount;
        } else if (prevStage.totalCount !== undefined) {
            stageUpdate.totalCount = prevStage.totalCount;
        }

        currentStages[data.stageId] = stageUpdate;

        const payload: Record<string, any> = {
            studentUid: data.studentUid,
            studentName: data.studentName || existingData?.studentName || 'İsimsiz Öğrenci',
            studentNumber: data.studentNumber ?? existingData?.studentNumber ?? '',
            classId: data.classId || existingData?.classId || '',
            className: data.className || existingData?.className || '',
            branch: data.branch || existingData?.branch || '',
            currentStageId: data.stageId,
            stages: currentStages,
            lastAssessedAt: new Date().toISOString()
        };

        if (data.cuzPage !== undefined) {
            payload.cuzPage = data.cuzPage;
        } else if (existingData?.cuzPage !== undefined) {
            payload.cuzPage = existingData.cuzPage;
        }

        if (data.teacherNotes !== undefined) {
            payload.teacherNotes = data.teacherNotes;
        } else if (existingData?.teacherNotes !== undefined) {
            payload.teacherNotes = existingData.teacherNotes;
        }

        const sanitizedPayload = cleanUndefined(payload);

        await setDoc(docRef, { ...sanitizedPayload, updatedAt: serverTimestamp() }, { merge: true });

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
            const stages: Record<string, any> = { ...(prev?.stages || {}) };
            const prevStage = stages[stageId] || {};

            const stageUpdate: Record<string, any> = {
                status,
                notes: prevStage.notes || ''
            };

            if (status === 'completed') {
                stageUpdate.completedAt = prevStage.completedAt || now;
                stageUpdate.score = 100;
            } else {
                if (prevStage.completedAt) stageUpdate.completedAt = prevStage.completedAt;
                if (prevStage.score !== undefined) stageUpdate.score = prevStage.score;
            }

            stages[stageId] = stageUpdate;

            const docData = cleanUndefined({
                studentUid: s.uid,
                studentName: s.name,
                classId: classInfo.classId,
                className: classInfo.className,
                branch: classInfo.branch,
                currentStageId: stageId,
                stages,
                lastAssessedAt: now,
                updatedAt: serverTimestamp()
            });

            batch.set(docRef, docData, { merge: true });
        }

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Batch update error:", error);
        return { success: false, error: error.message || 'Toplu güncelleme başarısız.' };
    }
}

/**
 * Öğrencinin MEB Kur'an Ders Kitabı Okuma Sayfası Değerlendirmesini Kaydeder.
 * Elifba aşamalarını bozmaz, quran_progress altındaki bookReadings haritasına yazar.
 */
export async function saveStudentBookReadingProgress(data: {
    studentUid: string;
    studentName: string;
    studentNumber?: string;
    classId: string;
    className: string;
    branch: string;
    readingId: string;
    grade: number;
    pageNumber: number;
    status: 'completed' | 'in_progress' | 'needs_practice';
    score: number;
    criteriaScores: Record<string, number>;
    ayahScores?: Record<number, AyahScoreRecord>;
    evaluationMode?: 'ayah' | 'page';
    evaluatedAyahCount?: number;
    totalAyahCount?: number;
    teacherNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
    if (!data.studentUid || !data.readingId) {
        return { success: false, error: 'Öğrenci veya okuma sayfası kimliği eksik.' };
    }

    try {
        const docRef = doc(db, 'quran_progress', data.studentUid);
        const existingSnap = await getDoc(docRef);
        const existingData = existingSnap.exists() ? (existingSnap.data() as QuranStudentProgress) : null;

        const currentBookReadings: Record<string, BookReadingRecord> = { ...(existingData?.bookReadings || {}) };
        
        const now = new Date().toISOString();
        currentBookReadings[data.readingId] = {
            readingId: data.readingId,
            grade: data.grade,
            pageNumber: data.pageNumber,
            status: data.status,
            score: data.score,
            criteriaScores: data.criteriaScores,
            ayahScores: data.ayahScores,
            evaluationMode: data.evaluationMode || 'ayah',
            evaluatedAyahCount: data.evaluatedAyahCount,
            totalAyahCount: data.totalAyahCount,
            teacherNotes: data.teacherNotes || '',
            completedAt: now
        };

        const payload: Record<string, any> = {
            studentUid: data.studentUid,
            studentName: data.studentName || existingData?.studentName || 'İsimsiz Öğrenci',
            studentNumber: data.studentNumber ?? existingData?.studentNumber ?? '',
            classId: data.classId || existingData?.classId || '',
            className: data.className || existingData?.className || '',
            branch: data.branch || existingData?.branch || '',
            bookReadings: currentBookReadings,
            lastAssessedAt: now,
            updatedAt: serverTimestamp()
        };

        await setDoc(docRef, cleanUndefined(payload), { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Book reading progress save error:", error);
        return { success: false, error: error.message || 'Okuma değerlendirmesi kaydedilemedi.' };
    }
}

/**
 * Özel / MEB Ders Kitabı Okuma Sayfalarını Firestore'dan getirir.
 * Firestore'da kayıtlı değilse varsayılan KURAN_BOOK_PAGES listesini döner.
 */
export async function getCustomQuranBookPages(): Promise<KuranBookPage[]> {
    noStore();
    try {
        const docRef = doc(db, 'system_settings', 'kuran_book_pages');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data?.pages && Array.isArray(data.pages) && data.pages.length > 0) {
                return serialize(data.pages) as KuranBookPage[];
            }
        }
        return KURAN_BOOK_PAGES;
    } catch (err) {
        console.error("getCustomQuranBookPages error:", err);
        return KURAN_BOOK_PAGES;
    }
}

/**
 * Sayfaların tamamını Firestore'a toplu kaydeder.
 */
export async function saveCustomQuranBookPages(pages: KuranBookPage[]): Promise<{ success: boolean; pages?: KuranBookPage[]; error?: string }> {
    try {
        const docRef = doc(db, 'system_settings', 'kuran_book_pages');
        const sanitized = cleanUndefined(pages);
        await setDoc(docRef, {
            pages: sanitized,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return { success: true, pages: sanitized };
    } catch (err: any) {
        console.error("saveCustomQuranBookPages error:", err);
        return { success: false, error: err.message || 'Sayfalar kaydedilemedi.' };
    }
}

/**
 * Yeni bir ders kitabı sayfası ekler veya mevcut sayfayı günceller.
 */
export async function saveCustomQuranBookPage(page: KuranBookPage): Promise<{ success: boolean; pages?: KuranBookPage[]; error?: string }> {
    try {
        const currentPages = await getCustomQuranBookPages();
        const existingIndex = currentPages.findIndex(p => p.id === page.id);

        let updated: KuranBookPage[];
        if (existingIndex >= 0) {
            updated = [...currentPages];
            updated[existingIndex] = { ...updated[existingIndex], ...page };
        } else {
            updated = [...currentPages, page];
        }

        return await saveCustomQuranBookPages(updated);
    } catch (err: any) {
        console.error("saveCustomQuranBookPage error:", err);
        return { success: false, error: err.message || 'Sayfa kaydedilemedi.' };
    }
}

/**
 * Bir ders kitabı sayfasını siler.
 */
export async function deleteCustomQuranBookPage(pageId: string): Promise<{ success: boolean; pages?: KuranBookPage[]; error?: string }> {
    try {
        const currentPages = await getCustomQuranBookPages();
        const filtered = currentPages.filter(p => p.id !== pageId);
        return await saveCustomQuranBookPages(filtered);
    } catch (err: any) {
        console.error("deleteCustomQuranBookPage error:", err);
        return { success: false, error: err.message || 'Sayfa silinemedi.' };
    }
}

/**
 * Sayfaları varsayılan KURAN_BOOK_PAGES listesine sıfırlar.
 */
export async function resetCustomQuranBookPages(): Promise<{ success: boolean; pages: KuranBookPage[]; error?: string }> {
    try {
        const docRef = doc(db, 'system_settings', 'kuran_book_pages');
        await setDoc(docRef, {
            pages: cleanUndefined(KURAN_BOOK_PAGES),
            updatedAt: serverTimestamp()
        });
        return { success: true, pages: KURAN_BOOK_PAGES };
    } catch (err: any) {
        console.error("resetCustomQuranBookPages error:", err);
        return { success: false, pages: KURAN_BOOK_PAGES, error: err.message };
    }
}


