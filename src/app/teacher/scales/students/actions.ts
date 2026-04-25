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
        if (studentsSnap.empty) {
            return { success: true, data: [] }; 
        }

        // KRİTİK: Sadece sanal öğrencileri (role: 'guest') alıyoruz
        const studentsData = studentsSnap.docs
            .map(d => ({uid: d.id, ...d.data()}) as UserProfile)
            .filter(s => s.role === 'guest');

        const studentIds = studentsData.map(s => s.uid);
        if (studentIds.length === 0) return { success: true, data: [] };

        const studentEntryMap = new Map<string, ScaleEntry[]>();

        const allScalesSnap = await getDocs(query(collection(db, 'evaluationScales'), where('type', '==', 'checklist')));
        
        const studentIdChunks: string[][] = [];
        for (let i = 0; i < studentIds.length; i += 30) {
            studentIdChunks.push(studentIds.slice(i, i + 30));
        }

        for(const scaleDoc of allScalesSnap.docs) {
            for (const chunk of studentIdChunks) {
                if(chunk.length === 0) continue;
                const entriesSubCollQuery = query(collection(db, `evaluationScales/${scaleDoc.id}/entries`), where('__name__', 'in', chunk));
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
                        studentScores[studentId].totalSuccess += (pluses / totalGraded) * 100;
                        studentScores[studentId].scaleCount += 1;
                    }
                }
            });

            // entry.history yapısını da destekleyelim
            studentEntries.forEach(entry => {
                if (entry.history) {
                    Object.values(entry.history).forEach(session => {
                        if (session.statuses) {
                            const statuses = Object.values(session.statuses);
                            const pluses = statuses.filter(s => s === '+').length;
                            const totalGraded = pluses + statuses.filter(s => s === '-').length;
                            if (totalGraded > 0) {
                                totalSuccess += (pluses / totalGraded) * 100;
                                totalScalesCount += 1;
                            }
                        }
                    });
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
        return { success: false, error: "Analiz verileri alınırken bir hata oluştu." };
    }
}
