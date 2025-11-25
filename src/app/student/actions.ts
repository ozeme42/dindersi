
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, getCountFromServer } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { unstable_noStore as noStore } from 'next/cache';

type StudentStats = {
    score: number;
    completedTopics: number;
    totalTopics: number;
    questionBankProgress: number;
    generalRank: number;
    classRank: number;
    branchRank: number;
};

export async function getStudentDashboardStats(userId: string): Promise<{ data?: StudentStats; error?: string; success: boolean }> {
    noStore();
    if (!userId) {
        return { error: "Kullanıcı ID'si bulunamadı.", success: false };
    }

    const defaultStats: StudentStats = {
        score: 0,
        completedTopics: 0,
        totalTopics: 0,
        questionBankProgress: 0,
        generalRank: 0,
        classRank: 0,
        branchRank: 0,
    };

    try {
        const studentRef = doc(db, 'users', userId);
        const [studentSnap, allClassesSnap, allCoursesSnap, allUsersSnap] = await Promise.all([
            getDoc(studentRef),
            getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
            getDocs(collection(db, "courses")),
            getDocs(query(collection(db, "users"), where("role", "==", "student")))
        ]);

        if (!studentSnap.exists()) {
            return { error: "Kullanıcı bulunamadı.", success: false };
        }

        const user = { uid: studentSnap.id, ...studentSnap.data() } as UserProfile;
        const studentClassName = user.class?.split(' - ')[0];

        const allStudents = allUsersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const sortedAllStudents = [...allStudents].sort((a, b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;

        if (user.class) {
            const gradeName = user.class.split(' - ')[0];
            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            const sortedGradeStudents = [...studentsInGrade].sort((a, b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === user.uid) + 1;

            const studentsInBranch = allStudents.filter(s => s.class === user.class);
            const sortedBranchStudents = [...studentsInBranch].sort((a, b) => (b.score || 0) - (a.score || 0));
            branchRank = sortedBranchStudents.findIndex(s => s.uid === user.uid) + 1;
        }

        const allClasses = allClassesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;
        
        const allCourses = allCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        
        let filteredCourses: Course[] = [];
        if (studentClassId) {
            const isFirstClass = allClasses[0] && studentClassId === allClasses[0].id;
            filteredCourses = studentVisibleCourses.filter(course =>
                course.classId === studentClassId || (!course.classId && isFirstClass)
            );
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId);
        }
        
        let grandTotalTopics = 0;
        let completedTopicsTotal = 0;
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;
        
        for (const course of filteredCourses) {
            const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
            const qbStatsPromise = getCourseQuestionBankStats(course.id, user.uid);
            
            const [progressSnap, questionBankStats] = await Promise.all([
                getDoc(progressRef),
                qbStatsPromise
            ]);

            const completedTopics = progressSnap.exists() ? (progressSnap.data() as any).completedTopics || [] : [];
            completedTopicsTotal += completedTopics.length;
            
            const unitsSnap = await getDocs(collection(db, 'courses', course.id, 'units'));
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                grandTotalTopics += topicsSnap.data().count;
            }

            totalQuestionBankPassedTests += questionBankStats.passedTests;
            totalQuestionBankTests += questionBankStats.totalTests;
        }

        const qbProgressPercentage = totalQuestionBankTests > 0 ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100) : 0;

        const finalStats = {
            score: user.score || 0,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            questionBankProgress: qbProgressPercentage,
            generalRank,
            classRank,
            branchRank,
        };

        return { data: finalStats, success: true };

    } catch (error) {
        console.error("Error fetching student dashboard stats:", error);
        return { error: "İstatistikler yüklenirken bir hata oluştu.", success: false, data: defaultStats };
    }
  }
