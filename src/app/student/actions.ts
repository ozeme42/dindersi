
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";


export async function getStudentDashboardStats(user: UserProfile | null): Promise<{ data?: any, error?: string, success: boolean }> {
    if (!user || !user.uid) {
        return { error: 'Kullanıcı bulunamadı.', success: false };
    }

    const defaultStats = {
        score: user.score || 0,
        completedTopics: 0,
        totalTopics: 0,
        coursesStarted: 0,
        coursesCompleted: 0,
        totalCourses: 0,
        generalRank: 0,
        classRank: 0,
        branchRank: 0,
        questionBankProgress: 0,
        passedTests: 0,
        totalQuestionBankTests: 0,
    };
    
    try {
        let completedTopicsTotal = 0;
        let grandTotalTopics = 0;
        const studentClassName = user.class?.split(' - ')[0];

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot] = await Promise.all([
            getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
            getDocs(collection(db, "courses")),
            getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        ]);

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;
        if(user.class) {
            const gradeName = user.class.split(' - ')[0];
            const branchName = user.class;
            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            classRank = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1;
            const studentsInBranch = allStudents.filter(s => s.class === branchName);
            branchRank = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1;
        }

        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly && !c.isSummerSchool);
        
        let filteredCourses: Course[] = [];
        if (studentClassId) {
            const isFirstClass = studentClassId === firstClassId;
            filteredCourses = studentVisibleCourses.filter(course => course.classId === studentClassId || (!course.classId && isFirstClass));
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId);
        }

        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        const coursesData = await Promise.all(filteredCourses.map(async (course) => {
            const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
            const qbStats = getCourseQuestionBankStats(course.id, user.uid);
            
            const [progressSnap, questionBankStats] = await Promise.all([
                getDoc(progressRef),
                qbStats
            ]);

            const completedTopics = progressSnap.exists() ? (progressSnap.data() as any).completedTopics || [] : [];
            completedTopicsTotal += completedTopics.length;
            
            const unitsRef = collection(db, 'courses', course.id, 'units');
            const unitsSnap = await getDocs(unitsRef);
            let totalTopics = 0;
            
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.size;
            }
            
            grandTotalTopics += totalTopics;
            
            totalQuestionBankPassedTests += questionBankStats.passedTests;
            totalQuestionBankTests += questionBankStats.totalTests;

            return course;
        }));
        
        const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;
        
        const finalStats = {
            ...defaultStats,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: coursesStartedCount,
            coursesCompleted: coursesCompletedCount,
            totalCourses: coursesData.length,
            generalRank,
            classRank,
            branchRank,
            questionBankProgress: qbProgressPercentage,
            passedTests: totalQuestionBankPassedTests,
            totalQuestionBankTests,
        };

        return { data: finalStats, success: true };
    } catch (error) {
        console.error("Error fetching student dashboard data:", error);
        return { data: defaultStats, error: "Öğrenci verileri yüklenirken bir hata oluştu.", success: false };
    }
}
