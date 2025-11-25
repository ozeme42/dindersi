"use server";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, getCountFromServer } from "firebase/firestore";
import type { UserProfile, Course, QuestionBankStats, ScoreEvent, Unit, UserProgress, TestResult } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

// This function needs to be robust.
export async function getStudentDashboardStats(userId: string, userClass: string) {
    noStore();
    if (!userId) {
        return { error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın." };
    }

    try {
        const studentRef = doc(db, 'users', userId);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) {
             return { error: "Kullanıcı veritabanında bulunamadı. Lütfen bir yönetici ile iletişime geçin." };
        }
        const studentData = studentSnap.data() as UserProfile;

        const [allCoursesSnapshot, allUsersSnapshot] = await Promise.all([
            getDocs(query(collection(db, "courses"), where("isSummerSchool", "!=", true))),
            getDocs(query(collection(db, "users"), where("role", "==", "student")))
        ]);
        
        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        const studentClassName = studentData.class?.split(' - ')[0];

        // Determine accessible courses for this student
        const accessibleCourses = allCourses.filter(course => {
            if (course.isTeacherOnly) return false;
            if (!course.classId) return true; // General courses are accessible to all
            return course.className === studentClassName;
        });
        
        let totalTopicsAvailable = 0;
        let completedTopicsCount = 0;
        let totalQuestionBankTests = 0;
        let passedTests = 0;

        // Lesson Progress Calculation
        const progressSnapshot = await getDocs(collection(db, `users/${userId}/progress`));
        const courseProgressMap = new Map();
        progressSnapshot.forEach(doc => {
            courseProgressMap.set(doc.id, doc.data().completedTopics || []);
        });

        for (const course of accessibleCourses) {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`)));
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopicsAvailable += topicsSnap.data().count;
            }
            completedTopicsCount += (courseProgressMap.get(course.id) || []).length;
        }

        // Question Bank Progress Calculation
        const qbProgressSnapshot = await getDocs(collection(db, `users/${userId}/questionBankProgress`));
        const qbProgressMap = new Map();
        qbProgressSnapshot.forEach(doc => {
            qbProgressMap.set(doc.id, doc.data());
        });

        for (const course of accessibleCourses) {
            const qbStatsSnap = await getDocs(query(collection(db, "questions"), where("courseId", "==", course.id)));
            const testsForCourse = Math.ceil(qbStatsSnap.size / 10);
            totalQuestionBankTests += testsForCourse;

            const courseProgress = qbProgressMap.get(course.id);
            if (courseProgress) {
                 for(const topicId in courseProgress) {
                    const topicProgressData = courseProgress[topicId];
                    if (topicProgressData) {
                        const allResults = [
                            ...Object.values(topicProgressData.easy || {}),
                            ...Object.values(topicProgressData.medium || {}),
                            ...Object.values(topicProgressData.hard || {})
                        ] as TestResult[];
                        passedTests += allResults.filter(r => r.status === 'passed').length;
                    }
                }
            }
        }
        
        // Ranking Calculation
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === userId) + 1;
        
        let classRank = 0;
        let branchRank = 0;

        if(studentData.class) {
            const gradeName = studentData.class.split(' - ')[0];
            const branchName = studentData.class;

            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === userId) + 1;

            const studentsInBranch = allStudents.filter(s => s.class === branchName);
            const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
            branchRank = sortedBranchStudents.findIndex(s => s.uid === userId) + 1;
        }


        const data = {
            score: studentData.score || 0,
            completedTopics: completedTopicsCount,
            totalTopics: totalTopicsAvailable,
            lessonProgress: totalTopicsAvailable > 0 ? Math.round((completedTopicsCount / totalTopicsAvailable) * 100) : 0,
            questionBankProgress: totalQuestionBankTests > 0 ? Math.round((passedTests / totalQuestionBankTests) * 100) : 0,
            generalRank,
            classRank,
            branchRank,
        };

        return { data };

    } catch (e: any) {
        console.error("Error fetching student dashboard stats:", e);
        return { error: 'Öğrenci verileri alınırken bir sunucu hatası oluştu.' };
    }
}
