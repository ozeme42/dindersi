

'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import type { UserProfile, StudentDetails, ScoreEvent, Course, Unit, Topic, QuestionBankProgress, QuestionBankStats } from "@/lib/types";
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
            createdAt: (profileData.createdAt as Timestamp)?.toDate()?.toISOString() || null,
        } as UserProfile;

        // Fetch remaining data in parallel
        const recentActivityQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', studentId)
        );

        const [recentActivitySnapshot, coursesSnapshot, progressSnapshot, manifest] = await Promise.all([
            getDocs(recentActivityQuery).catch((err) => {
                console.warn("Could not fetch recent activity for student:", err);
                return null;
            }),
            getDocs(collection(db, "courses")),
            getDocs(collection(db, `users/${studentId}/progress`)),
            getLoadedManifest(),
        ]);
        
        // Process recent activity
        const recentActivity: ScoreEvent[] = recentActivitySnapshot 
            ? recentActivitySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    timestamp: (data.timestamp as Timestamp)?.toDate?.() ? (data.timestamp as Timestamp).toDate().toISOString() : (typeof data.timestamp === 'string' ? data.timestamp : null),
                } as ScoreEvent;
            }).sort((a, b) => {
                const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return tB - tA;
            }).slice(0, 10)
            : [];
        
        const allCoursesMap = new Map(coursesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Course]));

        // Build course topic counts from manifest
        const manifestTopicCounts = new Map<string, number>();
        if (manifest?.classGroups) {
            for (const cg of manifest.classGroups) {
                for (const c of cg.courses || []) {
                    let count = 0;
                    for (const u of c.units || []) {
                        count += (u.topics || []).length;
                    }
                    manifestTopicCounts.set(c.id, count);
                }
            }
        }
        
        const coursesProgress = await Promise.all(progressSnapshot.docs.map(async (progressDoc) => {
            const courseId = progressDoc.id;
            const course = allCoursesMap.get(courseId);
            
            if (!course) return null;
            
            let totalTopics = 0;
            if (manifestTopicCounts.has(courseId)) {
                totalTopics = manifestTopicCounts.get(courseId) || 0;
            } else {
                // Fallback to Firestore
                const unitsSnap = await getDocs(collection(db, 'courses', courseId, 'units'));
                for (const unitDoc of unitsSnap.docs) {
                    const topicsSnap = await getDocs(collection(db, `courses/${courseId}/units/${unitDoc.id}/topics`));
                    totalTopics += topicsSnap.size;
                }
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
        
        // Fetch Question Bank Stats in parallel
        const rawQBStats = await Promise.all(
            Array.from(allCoursesMap.values()).map(async (course) => {
                const stats = await getCourseQuestionBankStats(course.id, studentId);
                if (stats.totalTests > 0 || stats.passedTests > 0) {
                    return {
                        ...stats,
                        courseId: course.id,
                        courseName: course.title,
                    };
                }
                return null;
            })
        );
        const questionBankStats: QuestionBankStats[] = rawQBStats.filter((s): s is QuestionBankStats => s !== null);
        
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
