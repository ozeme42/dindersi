
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer } from "firebase/firestore";
import type { UserProfile, Question, Course, QuestionBankStats, ScoreEvent, QuestionBankProgress, TestResult } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

export async function getGeneralStats() {
    noStore();
    const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
    const questionsQuery = query(collection(db, "questions"));
    const topStudentsQuery = query(collection(db, "users"), where("role", "==", "student"), orderBy("score", "desc"), limit(5));

    const [studentSnap, questionSnap, topStudentsSnap] = await Promise.all([
        getDocs(studentQuery),
        getDocs(questionsQuery),
        getDocs(topStudentsQuery)
    ]);

    const allStudents = studentSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    const allQuestions = questionSnap.docs.map(doc => doc.data() as Question);
    
    // Serialize Timestamps for client component
    const topStudents = topStudentsSnap.docs.map(doc => {
        const data = doc.data();
        return { ...JSON.parse(JSON.stringify(data)), uid: doc.id } as UserProfile;
    });

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


    const questionsByDifficultyData = allQuestions.reduce((acc, question) => {
        const difficulty = question.difficulty || "Bilinmiyor";
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const questionsByDifficulty = Object.entries(questionsByDifficultyData).map(([name, value], index) => ({
        name,
        value,
        fill: `hsl(var(--chart-${index + 1}))`
    }));

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
        for (const course of allCourses) {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`)));
            let topicCount = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                topicCount += topicsSnap.data().count;
            }
            totalTopicsPerCourse[course.id] = topicCount;
        }

        const studentReports: StudentProgressReport[] = await Promise.all(
            allStudents.map(async student => {
                let totalTopicsAvailable = 0;
                let completedTopicsCount = 0;
                let totalQuestionBankTests = 0;
                let passedTests = 0;
                let totalCorrectAnswers = 0;
                let totalAnsweredQuestions = 0;
                
                const studentClassName = student.class?.split(' - ')[0];
                const studentCourses = allCourses.filter(c => !c.isTeacherOnly && (!c.classId || (studentClassName && c.className === studentClassName)));
                
                totalTopicsAvailable = studentCourses.reduce((sum, course) => {
                    const topicCount = totalTopicsPerCourse[course.id] || 0;
                    return sum + topicCount;
                }, 0);


                const progressCollectionRef = collection(db, `users/${student.uid}/progress`);
                const progressSnapshot = await getDocs(progressCollectionRef);
                progressSnapshot.forEach(doc => {
                    if (studentCourses.some(c => c.id === doc.id)) {
                        completedTopicsCount += (doc.data().completedTopics || []).length;
                    }
                });
                
                const qbProgressRef = collection(db, `users/${student.uid}/questionBankProgress`);
                const qbSnapshot = await getDocs(qbProgressRef);
                
                for(const doc of qbSnapshot.docs) {
                     if (studentCourses.some(c => c.id === doc.id)) {
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
