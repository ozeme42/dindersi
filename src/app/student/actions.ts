
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from 'firebase/firestore';
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, TestResult } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

export async function getStudentDashboardStats({ userId, userClass }: { userId: string, userClass: string | undefined }): Promise<{ data: any | null, error?: string, success: boolean }> {
    let completedTopicsTotal = 0;
    let grandTotalTopics = 0;
    let userScore = 0;
    let generalRank = 0;
    let classRank = 0;
    let branchRank = 0;
    let questionBankProgress = 0;

    try {
        const studentDoc = await getDoc(doc(db, "users", userId));
        if (!studentDoc.exists()) {
            return { success: false, error: "Kullanıcı bulunamadı.", data: null };
        }
        const studentData = studentDoc.data() as UserProfile;
        userScore = studentData.score || 0;
        
        const studentClassName = userClass?.split(' - ')[0];

        const [allCoursesSnapshot, allUsersSnapshot, classesSnapshot] = await Promise.all([
            getDocs(collection(db, "courses")),
            getDocs(query(collection(db, "users"), where("role", "==", "student"))),
            getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
        ]);
        
        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        // RANKINGS
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        generalRank = sortedAllStudents.findIndex(s => s.uid === userId) + 1;

        if(userClass) {
            const gradeName = userClass.split(' - ')[0];
            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === userId) + 1;

            const studentsInBranch = allStudents.filter(s => s.class === userClass);
            const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
            branchRank = sortedBranchStudents.findIndex(s => s.uid === userId) + 1;
        }

        // COURSE & QB PROGRESS
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;

        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        let studentCourses: Course[] = [];
        if (studentClassId) {
            studentCourses = studentVisibleCourses.filter(course => course.classId === studentClassId || !course.classId);
        } else {
            studentCourses = studentVisibleCourses.filter(course => !course.classId);
        }

        for (const course of studentCourses) {
            const progressRef = doc(db, 'users', userId, 'progress', course.id);
            const qbStats = getCourseQuestionBankStats(course.id, userId);

            const [progressSnap, questionBankStatsData] = await Promise.all([getDoc(progressRef), qbStats]);

            const completedTopics = progressSnap.exists() ? progressSnap.data()?.completedTopics || [] : [];
            completedTopicsTotal += completedTopics.length;

            const unitsSnap = await getDocs(collection(db, 'courses', course.id, 'units'));
            let totalTopics = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.size;
            }
            grandTotalTopics += totalTopics;

            totalQuestionBankPassedTests += questionBankStatsData.passedTests;
            totalQuestionBankTests += questionBankStatsData.totalTests;
        }
        
        questionBankProgress = totalQuestionBankTests > 0 ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100) : 0;

        return {
            success: true,
            data: {
                score: userScore,
                completedTopics: completedTopicsTotal,
                totalTopics: grandTotalTopics,
                questionBankProgress,
                generalRank,
                classRank,
                branchRank,
            }
        };
    } catch (e: any) {
        console.error("Error in getStudentDashboardStats: ", e);
        return { 
            success: false, 
            error: "Öğrenci verileri alınırken bir hata oluştu.",
            data: { score: 0, completedTopics: 0, totalTopics: 0, questionBankProgress: 0, generalRank: 0, classRank: 0, branchRank: 0 }
        };
    }
}
