
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, getCountFromServer } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment, UserProgress, TestResult } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { unstable_noStore as noStore } from 'next/cache';

export type StudentStats = {
    score: number;
    completedTopics: number;
    totalTopics: number;
    lessonProgress: number;
    questionBankProgress: number;
    coursesStarted: number;
    coursesCompleted: number;
    totalCourses: number;
    generalRank: number;
    classRank: number;
    branchRank: number;
};


export async function getStudentDashboardStats(userId: string): Promise<{ data?: StudentStats; error?: string }> {
    noStore();
    if (!userId) {
        return { error: "Kullanıcı bulunamadı. Oturum açtığınızdan emin olun." };
    }

    try {
        const studentRef = doc(db, "users", userId);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
            return { error: "Kullanıcı veritabanında bulunamadı. Lütfen bir yönetici ile iletişime geçin." };
        }
        
        const user = { uid: studentSnap.id, ...studentSnap.data() } as UserProfile;

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot] = await Promise.all([
            getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
            getDocs(query(collection(db, "courses"))),
            getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        ]);

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & { uid: string }));
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;
        if (user.class) {
            const gradeName = user.class.split(' - ')[0];
            const branchName = user.class;
            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === user.uid) + 1;
            const studentsInBranch = allStudents.filter(s => s.class === branchName);
            const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
            branchRank = sortedBranchStudents.findIndex(s => s.uid === user.uid) + 1;
        }

        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        const studentClassName = user.class?.split(' - ')[0];
        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;
        
        const studentCourses = allCourses.filter(course => {
            if (course.isSummerSchool) return false;
            if (!studentClassId) return !course.classId;
            return course.classId === studentClassId || !course.classId;
        });

        let completedTopicsCount = 0;
        let totalTopicsAvailable = 0;
        let passedTests = 0;
        let totalQuestionBankTests = 0;

        for (const course of studentCourses) {
            const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
            const qbStats = getCourseQuestionBankStats(course.id, user.uid);
            
            const [progressSnap, questionBankStats] = await Promise.all([
                getDoc(progressRef),
                qbStats
            ]);

            const completedTopics = progressSnap.exists() ? (progressSnap.data() as UserProgress).completedTopics || [] : [];
            completedTopicsCount += completedTopics.length;
            
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`)));
            let totalTopics = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.data().count;
            }
            totalTopicsAvailable += totalTopics;

            passedTests += questionBankStats.passedTests;
            totalQuestionBankTests += questionBankStats.totalTests;
        }

        const lessonProgress = totalTopicsAvailable > 0 ? Math.round((completedTopicsCount / totalTopicsAvailable) * 100) : 0;
        const qbProgressPercentage = totalQuestionBankTests > 0 ? Math.round((passedTests / totalQuestionBankTests) * 100) : 0;
        
        const coursesStartedCount = studentCourses.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = studentCourses.filter(c => c.progress === 100).length;

        const finalStats: StudentStats = {
            score: user.score || 0,
            completedTopics: completedTopicsCount,
            totalTopics: totalTopicsAvailable,
            lessonProgress,
            questionBankProgress: qbProgressPercentage,
            coursesStarted: coursesStartedCount,
            coursesCompleted: coursesCompletedCount,
            totalCourses: studentCourses.length,
            generalRank,
            classRank,
            branchRank,
        };

        return { data: finalStats };

    } catch (e: any) {
        console.error("Error fetching student dashboard stats:", e);
        return { error: e.message || "Öğrenci verileri alınırken bilinmeyen bir sunucu hatası oluştu." };
    }
}
