
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer } from "firebase/firestore";
import type { UserProfile, Question, Course, QuestionBankStats, ScoreEvent, QuestionBankProgress, TestResult } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import fs from 'fs/promises';
import path from 'path';

let CACHED_MANIFEST: { timestamp: number; data: any } | null = null;
const MANIFEST_TTL = 1000 * 60 * 30;

async function getLoadedManifest(): Promise<any | null> {
    if (CACHED_MANIFEST && (Date.now() - CACHED_MANIFEST.timestamp < MANIFEST_TTL)) {
        return CACHED_MANIFEST.data;
    }
    const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        CACHED_MANIFEST = { timestamp: Date.now(), data };
        return data;
    } catch (e) {
        return null;
    }
}

export async function getGeneralStats() {
    noStore();
    const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
    const kolayQuery = query(collection(db, "questions"), where("difficulty", "in", ["Kolay", "kolay"]));
    const ortaQuery = query(collection(db, "questions"), where("difficulty", "in", ["Orta", "orta"]));
    const zorQuery = query(collection(db, "questions"), where("difficulty", "in", ["Zor", "zor"]));

    const [studentSnap, kolaySnap, ortaSnap, zorSnap] = await Promise.all([
        getDocs(studentQuery),
        getCountFromServer(kolayQuery).catch(() => null),
        getCountFromServer(ortaQuery).catch(() => null),
        getCountFromServer(zorQuery).catch(() => null),
    ]);

    const allStudents = studentSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    
    // Sort and take top 5 students in-memory
    const topStudents = allStudents
        .slice()
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map(s => JSON.parse(JSON.stringify(s)));

    const studentsPerClassData = allStudents.reduce((acc, student) => {
        const className = student.class?.split(' - ')[0] || "Belirtilmemiş";
        acc[className] = (acc[className] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const studentsPerClass = Object.entries(studentsPerClassData)
        .map(([name, students]) => ({ name, students }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signupsByDayData = allStudents
        .filter(student => {
            if (student.createdAt && typeof (student.createdAt as any).toDate === 'function') {
                 const createdAtDate = (student.createdAt as any).toDate();
                 return createdAtDate instanceof Date && !isNaN(createdAtDate.valueOf()) && createdAtDate > thirtyDaysAgo;
            } else if (typeof student.createdAt === 'string') {
                const createdAtDate = new Date(student.createdAt);
                return createdAtDate instanceof Date && !isNaN(createdAtDate.valueOf()) && createdAtDate > thirtyDaysAgo;
            }
            return false;
        })
        .reduce((acc, student) => {
          let date = '';
          if(typeof student.createdAt === 'string') {
              date = student.createdAt.split('T')[0];
          } else if (student.createdAt && typeof (student.createdAt as any).toDate === 'function') {
              date = (student.createdAt as any).toDate().toISOString().split('T')[0];
          }
          if(date) {
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
  
    const signupsByDay = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        return {
            date: dateStr,
            kayit: signupsByDayData[dateStr] || 0,
        };
    }).reverse();

    const questionsByDifficulty = [
        { name: "Kolay", value: kolaySnap ? (kolaySnap.data().count || 0) : 0, fill: "hsl(var(--chart-1))" },
        { name: "Orta", value: ortaSnap ? (ortaSnap.data().count || 0) : 0, fill: "hsl(var(--chart-2))" },
        { name: "Zor", value: zorSnap ? (zorSnap.data().count || 0) : 0, fill: "hsl(var(--chart-3))" }
    ];

    return { studentsPerClass, signupsByDay, questionsByDifficulty, topStudents };
}


export type StudentProgressReport = UserProfile & {
    totalTopics: number;
    completedTopics: number;
    lessonProgress: number;
    totalQuestionBankTests: number;
    passedTests: number;
    questionBankProgress: number;
    activityCount: number;
    totalCorrectAnswers: number;
    totalAnsweredQuestions: number;
    successRate: number;
};

export async function getStudentProgressReports(): Promise<{data?: StudentProgressReport[], error?: string}> {
    noStore();
    try {
        const [studentsSnap, coursesSnap, scoreEventsSnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), where("role", "==", "student"))),
            getDocs(collection(db, 'courses')),
            getDocs(collection(db, 'scoreEvents'))
        ]);

        const allStudents = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const allCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allScoreEvents = scoreEventsSnap.docs.map(doc => doc.data() as ScoreEvent);

        const totalTopicsPerCourse: { [courseId: string]: number } = {};
        const manifest = await getLoadedManifest();
        if (manifest?.classGroups) {
            for (const cg of manifest.classGroups) {
                for (const c of cg.courses || []) {
                    let topicCount = 0;
                    for (const u of c.units || []) {
                        topicCount += (u.topics || []).length;
                    }
                    totalTopicsPerCourse[c.id] = topicCount;
                }
            }
        } else {
            for (const course of allCourses) {
                const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`)));
                let topicCount = 0;
                for (const unitDoc of unitsSnap.docs) {
                    const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                    topicCount += topicsSnap.data().count;
                }
                totalTopicsPerCourse[course.id] = topicCount;
            }
        }

        const studentReports: StudentProgressReport[] = await Promise.all(
            allStudents.map(async student => {
                let totalTopicsAvailable = 0;
                let completedTopicsCount = 0;
                let totalQuestionBankTests = 0;
                let passedTests = 0;
                let totalCorrectAnswers = 0;
                let totalAnsweredQuestions = 0;

                const studentCourses = allCourses.filter(c => !c.isTeacherOnly && (!c.classId || (student.class && c.className === student.class.split(' - ')[0])));
                totalTopicsAvailable = studentCourses.reduce((sum, course) => sum + (totalTopicsPerCourse[course.id] || 0), 0);

                const progressCollectionRef = collection(db, `users/${student.uid}/progress`);
                const progressSnapshot = await getDocs(progressCollectionRef);
                progressSnapshot.forEach(doc => {
                    completedTopicsCount += (doc.data().completedTopics || []).length;
                });
                
                const qbProgressRef = collection(db, `users/${student.uid}/questionBankProgress`);
                const qbSnapshot = await getDocs(qbProgressRef);
                
                for(const doc of qbSnapshot.docs) {
                    const data = doc.data();
                    for(const topicId in data) {
                        const topicProgress = data[topicId];
                        const allResults = [
                            ...Object.values(topicProgress.easy || {}),
                            ...Object.values(topicProgress.medium || {}),
                            ...Object.values(topicProgress.hard || {})
                        ] as TestResult[];
                        
                        totalQuestionBankTests += allResults.length;
                        passedTests += allResults.filter((r) => r.status === 'passed').length;
                        totalCorrectAnswers += allResults.reduce((sum, res) => sum + res.correct, 0);
                        totalAnsweredQuestions += allResults.reduce((sum, res) => sum + res.total, 0);
                    }
                }
                
                const activityCount = allScoreEvents.filter(e => e.userId === student.uid).length;

                return {
                    ...student,
                    totalTopics: totalTopicsAvailable,
                    completedTopics: completedTopicsCount,
                    lessonProgress: totalTopicsAvailable > 0 ? Math.round((completedTopicsCount / totalTopicsAvailable) * 100) : 0,
                    totalQuestionBankTests,
                    passedTests,
                    questionBankProgress: totalQuestionBankTests > 0 ? Math.round((passedTests / totalQuestionBankTests) * 100) : 0,
                    activityCount,
                    totalCorrectAnswers,
                    totalAnsweredQuestions,
                    successRate: totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0,
                };
            })
        );
        
        return { data: JSON.parse(JSON.stringify(studentReports)) };

    } catch (e: any) {
        console.error("Error generating student progress reports:", e);
        return { error: 'Öğrenci ilerleme raporları alınırken bir hata oluştu.' };
    }
}
