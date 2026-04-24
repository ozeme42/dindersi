'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, writeBatch, updateDoc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import type { EvaluationScale, UserProfile, SchoolClass, ScaleEntry, Course, Unit, Topic, EvaluationScaleColumn } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export async function getTeacherScales(teacherId: string): Promise<{ success: boolean; data?: EvaluationScale[]; error?: string }> {
    noStore();
    if (!teacherId) {
        return { success: false, error: 'Öğretmen ID\'si bulunamadı.' };
    }

    try {
        const q = query(
            collection(db, 'evaluationScales'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const scales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvaluationScale));
        
        scales.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));

        return { success: true, data: JSON.parse(JSON.stringify(scales)) };
    } catch (error: any) {
        console.error("Error fetching scales:", error);
        if (error.code === 'failed-precondition') {
            return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın veya aşağıdaki linke tıklayın. Hata: ${error.message}`};
        }
        return { success: false, error: 'Ölçekler alınırken bir hata oluştu.' };
    }
}

export async function createScale(data: Omit<EvaluationScale, 'id' | 'createdAt'>): Promise<{ success: boolean, id?: string, error?: string }> {
    try {
        if (!data.name || !data.type || !data.teacherId || !data.classId || !data.courseId) {
            return { success: false, error: 'Eksik bilgi. Tüm alanlar doldurulmalıdır.' };
        }

        const dataToSave: Omit<EvaluationScale, 'id'> = {
            name: data.name,
            type: data.type,
            teacherId: data.teacherId,
            classId: data.classId,
            courseId: data.courseId,
            columns: (data.type === 'checklist' || data.type === 'points') ? (data.columns || [{ id: `col_${Date.now()}`, name: 'Görev 1', type: data.type === 'checklist' ? 'status' : 'number' }]) : [],
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'evaluationScales'), dataToSave);
        return { success: true, id: docRef.id };

    } catch (error: any) {
        console.error("Error creating scale:", error);
        return { success: false, error: 'Ölçek oluşturulurken bir hata oluştu.' };
    }
}


export async function deleteScale(scaleId: string): Promise<{ success: boolean; error?: string }> {
    if (!scaleId) {
        return { success: false, error: "Silinecek ölçek ID'si belirtilmedi." };
    }

    try {
        const batch = writeBatch(db);
        const scaleRef = doc(db, 'evaluationScales', scaleId);
        
        const entriesCollectionRef = collection(db, `evaluationScales/${scaleId}/entries`);
        const entriesSnapshot = await getDocs(entriesCollectionRef);
        entriesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(scaleRef);
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting scale and its entries:", error);
        return { success: false, error: "Ölçek silinirken bir hata oluştu." };
    }
}


// --- YENİ FONKSİYON: ŞUBE BAŞARI SIRALAMASI ---

export type BranchScore = {
    branchName: string;
    studentCount: number;
    averageSuccess: number;
}

export async function getBranchScaleScores(): Promise<BranchScore[]> {
    noStore();
    try {
        const [scalesSnap, usersSnap] = await Promise.all([
            getDocs(query(collection(db, 'evaluationScales'), where('type', '==', 'checklist'))),
            getDocs(query(collection(db, 'users'), where('role', 'in', ['student', 'guest'])))
        ]);

        const allStudents = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const allStudentEntries: { [studentId: string]: { [scaleId: string]: ScaleEntry } } = {};

        // Tüm ölçek girişlerini öğrenci bazında topla
        for (const scaleDoc of scalesSnap.docs) {
            const entriesSnap = await getDocs(collection(db, `evaluationScales/${scaleDoc.id}/entries`));
            entriesSnap.forEach(entryDoc => {
                if (!allStudentEntries[entryDoc.id]) {
                    allStudentEntries[entryDoc.id] = {};
                }
                allStudentEntries[entryDoc.id][scaleDoc.id] = entryDoc.data() as ScaleEntry;
            });
        }

        // Öğrenci puanlarını hesapla
        const studentScores: { [studentId: string]: { totalSuccess: number; scaleCount: number } } = {};
        for (const studentId in allStudentEntries) {
            studentScores[studentId] = { totalSuccess: 0, scaleCount: 0 };
            for (const scaleId in allStudentEntries[studentId]) {
                const entry = allStudentEntries[studentId][scaleId];
                if (entry.statuses) {
                    const statuses = Object.values(entry.statuses);
                    const pluses = statuses.filter(s => s === '+').length;
                    const totalGraded = pluses + statuses.filter(s => s === '-').length;
                    if (totalGraded > 0) {
                        studentScores[studentId].totalSuccess += (pluses / totalGraded) * 100;
                        studentScores[studentId].scaleCount += 1;
                    }
                }
            }
        }

        // Sınıf seviyelerine göre grupla ve ortalama al
        const gradeScores: { [gradeName: string]: { totalSuccess: number; studentCount: number } } = {};
        allStudents.forEach(student => {
            const studentScoreData = studentScores[student.uid];
            // Sınıf adından sadece seviyeyi al (örn: "5 - A" -> "5")
            const gradeName = student.class?.split(' - ')[0];

            if (gradeName && studentScoreData && studentScoreData.scaleCount > 0) {
                if (!gradeScores[gradeName]) {
                    gradeScores[gradeName] = { totalSuccess: 0, studentCount: 0 };
                }
                const avgStudentSuccess = studentScoreData.totalSuccess / studentScoreData.scaleCount;
                gradeScores[gradeName].totalSuccess += avgStudentSuccess;
                gradeScores[gradeName].studentCount += 1;
            }
        });

        const finalLeaderboard: BranchScore[] = Object.entries(gradeScores).map(([gradeName, data]) => ({
            branchName: `${gradeName}. Sınıflar`,
            studentCount: data.studentCount,
            averageSuccess: Math.round(data.totalSuccess / data.studentCount),
        }));

        return finalLeaderboard.sort((a, b) => b.averageSuccess - a.averageSuccess);

    } catch (e) {
        console.error("Error calculating branch scale scores:", e);
        return [];
    }
}
