
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import type { UserProfile, StudentDetails, ScoreEvent, Course, Unit, Topic, QuestionBankProgress, QuestionBankStats } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';


// This new, single function fetches all necessary data in one go.
export async function getStudentDetails(studentId: string): Promise<{ data?: StudentDetails; error?: string }> {
    noStore();
    if (!studentId) {
        return { error: 'Öğrenci ID\'si bulunamadı.' };
    }

    try {
        // Fetch student profile
        const studentRef = doc(db, 'users', studentId);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
            return { error: "Öğrenci bulunamadı." };
        }
        
        const profileData = studentSnap.data();
        const serializableProfile = {
            ...profileData,
            uid: studentSnap.id,
            createdAt: profileData.createdAt?.toDate ? profileData.createdAt.toDate().toISOString() : null,
        } as UserProfile;
        
        // Fetch recent activity
        const recentActivityQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', studentId),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const recentActivitySnapshot = await getDocs(recentActivityQuery);
        
        const recentActivity = recentActivitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp?.toDate().toISOString(),
            } as ScoreEvent;
        });
        
        // Fetch ALL courses to map names and calculate progress against
        const coursesSnapshot = await getDocs(collection(db, "courses"));
        const allCoursesMap = new Map(coursesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Course]));
        
        // Fetch progress subcollection for the student
        const progressCollectionRef = collection(db, `users/${studentId}/progress`);
        const progressSnapshot = await getDocs(progressCollectionRef);
        
        const coursesProgress = await Promise.all(progressSnapshot.docs.map(async (progressDoc) => {
            const courseId = progressDoc.id;
            const course = allCoursesMap.get(courseId);
            
            if (!course) return null;
            
            // This is an expensive operation, but necessary without denormalization
            const unitsSnap = await getDocs(collection(db, 'courses', courseId, 'units'));
            let totalTopics = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, `courses/${courseId}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.size;
            }

            const completedTopics = progressDoc.data().completedTopics || [];

            return {
                courseId: courseId,
                courseName: course.title,
                completedTopics: completedTopics.length,
                totalTopics: totalTopics,
                progress: totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0,
            };
        }));
        
        // Fetch Question Bank Stats
        const questionBankStats: QuestionBankStats[] = [];
        for (const course of allCoursesMap.values()) {
            const stats = await getCourseQuestionBankStats(course.id, studentId);
            if (stats.totalTests > 0 || stats.passedTests > 0) { // Only include courses with activity
                 questionBankStats.push({
                    courseId: course.id,
                    courseName: course.title,
                    ...stats
                });
            }
        }
        
        const finalData = {
            profile: serializableProfile,
            recentActivity: recentActivity,
            coursesProgress: coursesProgress.filter((c): c is NonNullable<typeof c> => c !== null && c.totalTopics > 0),
            questionBankStats: questionBankStats
        };
        
        return { data: JSON.parse(JSON.stringify(finalData)) };

    } catch (error: any) {
        console.error(`Error fetching student details for ${studentId}:`, error);
        if (error.code === 'failed-precondition') {
             return { error: `Veritabanı indeksi eksik veya oluşturuluyor. Lütfen birkaç dakika sonra tekrar deneyin veya aşağıdaki linki kullanın: ${error.message}` };
        }
        return { error: 'Öğrenci detayları yüklenirken bir hata oluştu.' };
    }
}
