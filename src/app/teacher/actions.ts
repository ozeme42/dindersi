

'use server';

import { db } from "@/lib/firebase";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp, 
    orderBy,
    limit,
    doc,
    getDoc,
    getCountFromServer,
    writeBatch,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import type { UserProfile, Course, Unit, Topic, ScoreEvent, SchoolClass, QuestionBankStats } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getAdminDb } from "@/lib/firebase-admin";

type DashboardStats = {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalCourses: number;
    totalUnits: number;
    totalTopics: number;
    totalQuestions: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
    noStore();
    try {
        const collections = ['users', 'classes', 'courses', 'units', 'topics', 'questions'];
        const counts = await Promise.all(
            collections.map(coll => getCountFromServer(collection(db, coll)))
        );

        const usersSnapshot = await getDocs(collection(db, 'users'));
        let totalStudents = 0;
        let totalTeachers = 0;
        usersSnapshot.forEach(doc => {
            if (doc.data().role === 'student') totalStudents++;
            if (doc.data().role === 'teacher') totalTeachers++;
        });

        const [usersCount, classesCount, coursesCount, unitsCount, topicsCount, questionsCount] = counts.map(c => c.data().count);
        
        return {
            totalStudents,
            totalTeachers,
            totalClasses: classesCount,
            totalCourses: coursesCount,
            totalUnits: unitsCount,
            totalTopics: topicsCount,
            totalQuestions: questionsCount,
        };

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return { totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalCourses: 0, totalUnits: 0, totalTopics: 0, totalQuestions: 0 };
    }
}

type LeaderboardEntry = UserProfile & { score: number };

export async function getTopStudents(count: number = 5): Promise<LeaderboardEntry[]> {
    noStore();
    try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const usersSnapshot = await getDocs(usersQuery);
        const students = usersSnapshot.docs.map(doc => ({
            ...doc.data() as UserProfile,
            uid: doc.id,
            score: doc.data().score || 0
        }));
        students.sort((a, b) => (b.score || 0) - (a.score || 0));
        return JSON.parse(JSON.stringify(students.slice(0, count)));
    } catch (error) {
        console.error("Error fetching top students:", error);
        return [];
    }
}

export async function getRecentActivity(count: number = 10): Promise<(ScoreEvent & { student?: UserProfile })[]> {
    noStore();
    try {
        const eventsQuery = query(collection(db, 'scoreEvents'), orderBy('timestamp', 'desc'), limit(count));
        const eventsSnapshot = await getDocs(eventsQuery);

        const activities = await Promise.all(eventsSnapshot.docs.map(async (d) => {
            const eventData = d.data() as ScoreEvent;
            eventData.id = d.id;
            const ts = eventData.timestamp;
            eventData.timestamp = (ts && typeof (ts as any).toDate === 'function') ? (ts as any).toDate().toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString());

            try {
                if (eventData.userId) {
                    const studentDoc = await getDoc(doc(db, 'users', eventData.userId));
                    if (studentDoc.exists()) {
                        return { ...eventData, student: { uid: studentDoc.id, ...studentDoc.data() } as UserProfile };
                    }
                }
            } catch (uErr) {}
            return eventData;
        }));

        return JSON.parse(JSON.stringify(activities));
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
    }
}


export async function getStudentSearchResults(searchTerm: string): Promise<UserProfile[]> {
    noStore();
    if (!searchTerm || searchTerm.length < 2) return [];

    try {
        const nameQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('displayName', '>=', searchTerm),
            where('displayName', '<=', searchTerm + '\uf8ff'),
            limit(10)
        );
        const emailQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('email', '>=', searchTerm),
            where('email', '<=', searchTerm + '\uf8ff'),
            limit(10)
        );

        const [nameSnapshot, emailSnapshot] = await Promise.all([getDocs(nameQuery), getDocs(emailQuery)]);

        const resultsMap = new Map<string, UserProfile>();
        nameSnapshot.forEach(doc => resultsMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile));
        emailSnapshot.forEach(doc => resultsMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile));

        return Array.from(resultsMap.values());
    } catch (error) {
        console.error("Error searching students:", error);
        return [];
    }
}

export async function archiveAndResetScores(seasonName: string): Promise<{ success: boolean; error?: string }> {
    noStore();
    const adminDb = getAdminDb();
    const studentQuery = adminDb.collection('users').where('role', '==', 'student');
    
    try {
        const studentSnap = await studentQuery.orderBy('score', 'desc').limit(100).get();
        const topStudents = studentSnap.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                displayName: data.displayName,
                class: data.class,
                score: data.score,
                avatar: data.avatar || null,
            };
        });
        
        const archiveRef = adminDb.collection('archivedSeasons').doc();
        await archiveRef.set({
            seasonName: seasonName || `Sezon Finali - ${new Date().toLocaleDateString('tr-TR')}`,
            createdAt: serverTimestamp(),
            leaderboard: topStudents,
        });

        const allStudentsSnap = await studentQuery.get();
        const batch = adminDb.batch();
        allStudentsSnap.docs.forEach(doc => {
            batch.update(doc.ref, { score: 0 });
        });
        await batch.commit();

        await setDoc(doc(db, 'settings', 'leaderboard'), { seasonName: "Yeni Sezon" });

        return { success: true };
    } catch (error: any) {
        console.error('Error archiving and resetting scores:', error);
        return { success: false, error: 'İşlem sırasında bir sunucu hatası oluştu.' };
    }
}

// --- NEW LEADERBOARD SETTINGS ACTIONS ---
export async function getLeaderboardSettings(): Promise<{ seasonName: string }> {
    noStore();
    try {
        const docRef = doc(db, 'settings', 'leaderboard');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as { seasonName: string };
        }
        return { seasonName: "Genel Liderlik Tablosu" };
    } catch (error) {
        return { seasonName: "Genel Liderlik Tablosu" };
    }
}

export async function saveLeaderboardSettings(settings: { seasonName: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = doc(db, 'settings', 'leaderboard');
        await setDoc(docRef, settings, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Ayarlar kaydedilemedi." };
    }
}
