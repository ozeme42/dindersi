
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import type { UserProfile, Course, Unit, Topic, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

export async function getStudentDashboardData(userId: string): Promise<{
  stats: any,
  examStats: any,
  error?: string
}> {
    if (!userId) {
        return { stats: {}, examStats: {}, error: "Kullanıcı bulunamadı veya yetkili değil."};
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
             return { stats: {}, examStats: {}, error: "Kullanıcı profili bulunamadı."};
        }
        const user = { uid: userDoc.id, ...userDoc.data() } as UserProfile;

        let completedTopicsTotal = 0;
        let grandTotalTopics = 0;
        
        let userScore = user.score || 0;
        const studentClassName = user.class?.split(' - ')[0];

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          getStudentExams(user.uid),
        ]);
        
        let examStats = { pending: 0, solved: 0 };
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            const solved = examsSnapshot.data.length - pending;
            examStats = { pending, solved };
        }

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));

        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;

        if(user.class) {
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
        const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
        
        const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
        const studentClassId = studentClass?.id;

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
        
        let filteredCourses: Course[] = [];
        if (studentClassId) {
            const isFirstClass = studentClassId === firstClassId;
            filteredCourses = studentVisibleCourses.filter(course =>
                !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
            );
        } else {
            filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
        }
        
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        for (const course of filteredCourses) {
          const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
          const qbStats = getCourseQuestionBankStats(course.id, user.uid);
          
          const [progressSnap, questionBankStats] = await Promise.all([
            getDoc(progressRef),
            qbStats
          ]);

          const completedTopics = progressSnap.exists() ? (progressSnap.data().completedTopics || []).length : 0;
          completedTopicsTotal += completedTopics;
          
          const unitsSnap = await getDocs(collection(db, 'courses', course.id, 'units'));
          let totalTopics = 0;
          for (const unitDoc of unitsSnap.docs) {
            const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
            totalTopics += topicsSnap.size;
          }
          grandTotalTopics += totalTopics;

          totalQuestionBankPassedTests += questionBankStats.passedTests;
          totalQuestionBankTests += questionBankStats.totalTests;
        }
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100)
            : 0;

        const stats = {
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            questionBankProgress: qbProgressPercentage,
            generalRank,
            classRank,
            branchRank,
        };

        return { stats, examStats };

    } catch (e: any) {
        console.error("Error fetching student dashboard data:", e);
        return { stats: {}, examStats: {}, error: "Öğrenci verileri yüklenirken bir hata oluştu."};
    }
}
