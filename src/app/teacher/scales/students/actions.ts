
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { SchoolClass, UserProfile, ScaleEntry } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type { SchoolClass };

export type StudentAnalysisData = {
    id: string;
    studentNumber: string;
    name: string;
    branch: string;
    classId: string;
    average: number;
    completedScales: number;
};

export async function getStudentAnalysis(classId: string, branch: string): Promise<{ success: boolean; data?: StudentAnalysisData[]; error?: string }> {
    noStore();
    if (!classId || !branch) {
        return { success: false, error: 'Sınıf ve şube seçimi zorunludur.' };
    }

    try {
        const classDoc = await getDoc(doc(db, "classes", classId));
        if (!classDoc.exists()) {
            return { success: false, error: "Seçilen sınıf bulunamadı." };
        }
        const className = classDoc.data().name;

        // 1. Get all students matching the criteria
        let studentsQuery;
        if (branch === 'all') {
            studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                where('class', '>=', className),
                where('class', '<', className + '\uf8ff')
            );
        } else {
            const fullClassName = `${className} - ${branch}`;
            studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                where('class', '==', fullClassName)
            );
        }

        const studentsSnap = await getDocs(studentsQuery);
        if (studentsSnap.empty) {
            return { success: true, data: [] }; // No students, no error
        }
        const studentIds = studentsSnap.docs.map(d => d.id);

        // 2. Get all evaluation entries for these students
        // Firestore 'in' query is limited to 30 items. We need to chunk.
        const studentEntryMap = new Map<string, any[]>();
        const chunks: string[][] = [];
        for (let i = 0; i < studentIds.length; i += 30) {
            chunks.push(studentIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            const entriesQuery = query(collection(db, `evaluationScales`), where('__name__', '!=', '')); // A placeholder to get all scales
            const allScalesSnap = await getDocs(entriesQuery);
            for(const scaleDoc of allScalesSnap.docs) {
                const entriesSubCollQuery = query(collection(db, `evaluationScales/${scaleDoc.id}/entries`), where('__name__', 'in', chunk));
                const entriesSnap = await getDocs(entriesSubCollQuery);
                entriesSnap.forEach(entryDoc => {
                    const studentId = entryDoc.id;
                    const entryData = entryDoc.data() as ScaleEntry;
                    if (!studentEntryMap.has(studentId)) {
                        studentEntryMap.set(studentId, []);
                    }
                    studentEntryMap.get(studentId)!.push(entryData);
                });
            }
        }
        
        // 3. Process data
        const studentList: StudentAnalysisData[] = studentsSnap.docs.map(doc => {
            const data = doc.data();
            const studentId = doc.id;
            const studentEntries = studentEntryMap.get(studentId) || [];

            let totalSuccess = 0;
            let totalScalesCount = 0;

            studentEntries.forEach(entry => {
                if (entry.statuses) {
                    const statuses = Object.values(entry.statuses);
                    const pluses = statuses.filter(s => s === '+').length;
                    const totalGraded = pluses + statuses.filter(s => s === '-').length;
                    if (totalGraded > 0) {
                        totalSuccess += (pluses / totalGraded) * 100;
                        totalScalesCount += 1;
                    }
                }
            });

            const average = totalScalesCount > 0 ? Math.round(totalSuccess / totalScalesCount) : 0;

            return {
                id: studentId,
                studentNumber: data.studentNumber || 'No Yok',
                name: data.displayName || 'İsimsiz',
                branch: data.class?.split(' - ')[1] || '?',
                classId: classId,
                average: average,
                completedScales: totalScalesCount,
            };
        });

        return { success: true, data: JSON.parse(JSON.stringify(studentList)) };

    } catch (e: any) {
        console.error("Error in getStudentAnalysis:", e);
         if (e.code === 'failed-precondition') {
            return { success: false, error: `Veritabanı indeksi eksik. Sorgu oluşturulamadı. Lütfen Firebase konsolundan gerekli indeksi oluşturun. Hata detayı: ${e.message}` };
        }
        return { success: false, error: "Analiz verileri alınırken bir hata oluştu." };
    }
}
