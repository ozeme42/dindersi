
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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

        // 1. Get all students matching the criteria (Only guests)
        let studentsQuery;
        if (branch === 'all') {
            studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'guest'), // *** DÜZELTME: 'student' yerine 'guest'
                where('class', '>=', className),
                where('class', '<', className + '\uf8ff')
            );
        } else {
            const fullClassName = `${className} - ${branch}`;
            const poolClassName = `${fullClassName} (Havuz)`;
            studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'guest'), // *** DÜZELTME: 'student' yerine 'guest'
                where('class', 'in', [fullClassName, poolClassName])
            );
        }

        const studentsSnap = await getDocs(studentsQuery);
        if (studentsSnap.empty) {
            return { success: true, data: [] }; // No students, no error
        }
        const studentIds = studentsSnap.docs.map(d => d.id);
        const studentsData = studentsSnap.docs.map(d => ({uid: d.id, ...d.data()}) as UserProfile);

        // 2. Get all evaluation entries for these students
        const studentEntryMap = new Map<string, ScaleEntry[]>();

        const allScalesSnap = await getDocs(query(collection(db, 'evaluationScales'), where('type', '==', 'checklist')));
        
        for(const scaleDoc of allScalesSnap.docs) {
            // Firestore 'in' query supports up to 30 values. If more students, this needs chunking.
            if (studentIds.length > 0) {
                const entriesSubCollQuery = query(collection(db, `evaluationScales/${scaleDoc.id}/entries`), where('__name__', 'in', studentIds.slice(0, 30)));
                const entriesSnap = await getDocs(entriesSubCollQuery);
                entriesSnap.forEach(entryDoc => {
                    const studentId = entryDoc.id;
                    if (!studentEntryMap.has(studentId)) {
                        studentEntryMap.set(studentId, []);
                    }
                    studentEntryMap.get(studentId)!.push(entryDoc.data() as ScaleEntry);
                });
            }
        }
        
        // 3. Process data
        const studentList: StudentAnalysisData[] = studentsData.map(student => {
            const studentEntries = studentEntryMap.get(student.uid) || [];

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
                id: student.uid,
                studentNumber: student.studentNumber || 'No Yok',
                name: student.displayName || 'İsimsiz',
                branch: student.class?.split(' - ')[1] || '?',
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
