'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getDoc, doc } from "firebase/firestore";
import type { UserProfile, Course, QuestionBankStats, TestResult } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';


export async function getStudentDashboardStats(userId: string): Promise<{
    success: boolean,
    data?: {
        score: number;
        lessonProgress: number;
        questionBankProgress: number;
        generalRank: number;
        classRank: number;
        branchRank: number;
    },
    error?: string
}> {
    noStore();

    // Initialize with default values
    const defaultData = {
        score: 0,
        lessonProgress: 0,
        questionBankProgress: 0,
        generalRank: 0,
        classRank: 0,
        branchRank: 0,
    };

    if (!userId) {
        return { success: false, error: "Kullanıcı ID'si bulunamadı." };
    }

    try {
        const [allUsersSnapshot, allCoursesSnapshot] = await Promise.all([
            getDocs(query(collection(db, "users"), where("role", "in", ["student", "guest"]))),
            getDocs(collection(db, "courses"))
        ]);

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const currentUser = allStudents.find(s => s.uid === userId);

        if (!currentUser) {
            return { success: false, error: "Kullanıcı bulunamadı." };
        }

        // --- Rank Calculations ---
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === userId) + 1;
        
        let classRank = 0;
        let branchRank = 0;
        if (currentUser.class) {
            const gradeName = currentUser.class.split(' - ')[0];
            const branchName = currentUser.class;

            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            if(studentsInGrade.length > 0) {
                 const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
                 classRank = sortedGradeStudents.findIndex(s => s.uid === userId) + 1;
            }

            const studentsInBranch = allStudents.filter(s => s.class === branchName);
             if (studentsInBranch.length > 0) {
                const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
                branchRank = sortedBranchStudents.findIndex(s => s.uid === userId) + 1;
            }
        }
        
        // --- Progress Calculations ---
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        let studentVisibleCourses: Course[];
        if (currentUser.class) {
            const studentClassName = currentUser.class.split(' - ')[0];
            studentVisibleCourses = allCourses.filter(course =>
                !course.isTeacherOnly &&
                (course.className === studentClassName || !course.classId) // Match student's class OR general courses
            );
        } else {
             studentVisibleCourses = allCourses.filter(course => !course.isTeacherOnly && !course.classId);
        }

        let totalTopicsAvailable = 0;
        let completedTopicsCount = 0;
        let totalQuestionBankTests = 0;
        let passedTests = 0;

        for (const course of studentVisibleCourses) {
            const courseId = course.id;
            const unitsSnap = await getDocs(collection(db, 'courses', courseId, 'units'));
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, 'courses', courseId, 'units', unitDoc.id, 'topics'));
                totalTopicsAvailable += topicsSnap.size;
            }
            
            const progressDoc = await getDoc(doc(db, `users/${userId}/progress`, courseId));
            if (progressDoc.exists()) {
                completedTopicsCount += (progressDoc.data().completedTopics || []).length;
            }
            
            const qbStats = await getCourseQuestionBankStats(courseId, userId);
            totalQuestionBankTests += qbStats.totalTests;
            passedTests += qbStats.passedTests;
        }

        const lessonProgress = totalTopicsAvailable > 0 ? Math.round((completedTopicsCount / totalTopicsAvailable) * 100) : 0;
        const questionBankProgress = totalQuestionBankTests > 0 ? Math.round((passedTests / totalQuestionBankTests) * 100) : 0;

        return {
            success: true,
            data: {
                score: currentUser.score || 0,
                lessonProgress,
                questionBankProgress,
                generalRank,
                classRank,
                branchRank,
            }
        };

    } catch (e: any) {
        console.error("Error calculating student dashboard stats:", e);
        return { success: false, error: 'İstatistikler yüklenirken bir hata oluştu.', data: defaultData };
    }
}