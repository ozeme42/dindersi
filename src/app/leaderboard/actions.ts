
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy, addDoc, serverTimestamp, deleteDoc, writeBatch, getDoc, setDoc, increment, limit, runTransaction, doc, documentId } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { UserProfile, ScoreEvent, Announcement } from "@/lib/types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, subMonths, startOfDay, endOfDay, subDays, format, startOfToday, endOfToday, subWeeks } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getAdminDb } from "@/lib/firebase-admin";


type LeaderboardEntry = UserProfile & { score: number };

export async function getStudentScoreEvents(studentId: string): Promise<ScoreEvent[]> {
    noStore();
    if (!studentId) {
        return [];
    }

    try {
        const eventsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', studentId),
            orderBy('timestamp', 'desc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);

        const events = eventsSnapshot.docs.map(doc => {
            const data = doc.data() as ScoreEvent;
            return {
                ...data,
                id: doc.id,
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
            } as ScoreEvent;
        });
        
        return JSON.parse(JSON.stringify(events));

    } catch (error) {
        console.error(`Error fetching score events for student ${studentId}:`, error);
        return [];
    }
}


// New Function for Hall of Fame
export type HallOfFamePeriod = {
    periodName: string;
    winners: LeaderboardEntry[];
};

// Function to award daily prizes using a transaction to prevent race conditions.
async function awardDailyPrizes() {
    const yesterday = subDays(new Date(), 1);
    const dateString = format(yesterday, 'yyyy-MM-dd');
    const prizeLogRef = doc(db, 'dailyPrizes', dateString);

    try {
        await runTransaction(db, async (transaction) => {
            const prizeLogSnap = await transaction.get(prizeLogRef);
            if (prizeLogSnap.exists()) {
                // Prizes for this day have already been awarded.
                return;
            }
            
            const startDate = startOfDay(yesterday);
            const endDate = endOfDay(yesterday);

            const scoreEventsQuery = query(
                collection(db, 'scoreEvents'),
                where('timestamp', '>=', Timestamp.fromDate(startDate)),
                where('timestamp', '<=', Timestamp.fromDate(endDate))
            );
            
            // This must be read outside the transaction for this query type.
            const eventsSnapshot = await getDocs(scoreEventsQuery);
            const scoresByStudent = new Map<string, number>();
            
            eventsSnapshot.forEach(doc => {
                const event = doc.data();
                 if (!event.gameType?.startsWith('smartboard_') && event.gameType !== 'Derece Puanı' && event.gameType !== 'Manuel Puan') {
                    const currentScore = scoresByStudent.get(event.userId) || 0;
                    scoresByStudent.set(event.userId, currentScore + event.points);
                 }
            });

            if (scoresByStudent.size === 0) {
                // Log it so we don't check again.
                transaction.set(prizeLogRef, { awarded: true, timestamp: Timestamp.fromDate(endDate), winners: [] });
                return;
            }
            
            const leaderboard = Array.from(scoresByStudent.entries())
                .map(([uid, score]) => ({ uid, score }))
                .sort((a, b) => b.score - a.score);
            
            const prizeAmounts = [1000, 750, 500];
            const winnersToLog: { userId: string; rank: number; prize: number; score: number; }[] = [];

            for (let i = 0; i < Math.min(leaderboard.length, 3); i++) {
                const winner = leaderboard[i];
                if (winner.score <= 0) continue;

                const prize = prizeAmounts[i];
                
                const userRef = doc(db, 'users', winner.uid);
                // Perform the score update within the transaction
                transaction.update(userRef, { score: increment(prize) });

                const eventRef = doc(collection(db, 'scoreEvents'));
                // Log the prize event within the transaction
                transaction.set(eventRef, {
                    userId: winner.uid,
                    points: prize,
                    timestamp: Timestamp.fromDate(endDate),
                    gameType: 'Derece Puanı',
                    context: `${format(yesterday, 'dd MMMM yyyy')} Günü ${i + 1}.lik Ödülü`,
                });
                winnersToLog.push({ userId: winner.uid, rank: i + 1, prize, score: winner.score });
            }
            
            // Finalize the transaction by setting the log document
            transaction.set(prizeLogRef, { awarded: true, timestamp: Timestamp.fromDate(endDate), winners: winnersToLog.sort((a,b) => b.score - a.score) });
        });
    } catch (error) {
        console.error("Error in awardDailyPrizes transaction:", error);
    }
}

export async function getLiveLeaderboard(period: 'daily' | 'weekly' | 'all-time' = 'daily'): Promise<LeaderboardEntry[]> {
    noStore();

    if (period === 'all-time') {
        const usersQuery = query(
            collection(db, 'users'), 
            where('role', '==', 'student'), 
            orderBy('score', 'desc'), 
            limit(100)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const leaderboard = usersSnapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id,
            score: doc.data().score || 0
        } as LeaderboardEntry));
        return JSON.parse(JSON.stringify(leaderboard));
    }

    let startDate: Date;
    const now = new Date();

    if (period === 'daily') {
        startDate = startOfToday();
    } else { // weekly
        startDate = startOfWeek(now, { weekStartsOn: 1 });
    }

    const eventsQuery = query(
        collection(db, 'scoreEvents'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(now))
    );

    const eventsSnapshot = await getDocs(eventsQuery);
    const scoresByStudent = new Map<string, number>();

    eventsSnapshot.forEach(doc => {
        const event = doc.data();
        if (event.gameType?.startsWith('smartboard_') || event.gameType === 'Derece Puanı' || event.gameType === 'Manuel Puan') return;
        const currentScore = scoresByStudent.get(event.userId) || 0;
        scoresByStudent.set(event.userId, currentScore + event.points);
    });

    if (scoresByStudent.size === 0) return [];
    
    const userIds = Array.from(scoresByStudent.keys());
    const studentProfiles: UserProfile[] = [];
    
    // Chunk userIds to avoid Firestore 'in' query limit of 30
    for (let i = 0; i < userIds.length; i += 30) {
        const chunk = userIds.slice(i, i + 30);
        if (chunk.length === 0) continue;
        const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Ensure we only add students to the leaderboard
            if (userData.role === 'student') {
                studentProfiles.push({ uid: doc.id, ...userData } as UserProfile);
            }
        });
    }
    
    const leaderboard = studentProfiles
        .map(student => ({
            ...student,
            score: scoresByStudent.get(student.uid) || 0,
        }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    return JSON.parse(JSON.stringify(leaderboard));
}


export async function getHallOfFameData(): Promise<{ seasons: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }> {
    noStore();

    // Fetch archived seasons
    const adminDb = getAdminDb();
    const seasonsSnap = await adminDb.collection('archivedSeasons').orderBy('createdAt', 'desc').get();
    const seasons = seasonsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            periodName: data.seasonName,
            winners: data.leaderboard.slice(0, 3) // Sadece ilk 3 kişiyi alıyoruz
        } as HallOfFamePeriod;
    });

    // Fetch dynamic periods
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where("role", "==", "student")));
    const allStudents = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    const studentsMap = new Map(allStudents.map(s => [s.uid, s]));
    
    const now = new Date();
    const startDate = subMonths(now, 6);
    
    const monthlyWinners: HallOfFamePeriod[] = [];
    const months = eachMonthOfInterval({ start: startDate, end: now });

    for (const month of months) {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthlyEventsQuery = query(
            collection(db, 'scoreEvents'),
            where("timestamp", ">=", Timestamp.fromDate(monthStart)),
            where("timestamp", "<=", Timestamp.fromDate(monthEnd))
        );
        const eventsSnapshot = await getDocs(monthlyEventsQuery);

        const scoresByStudent = new Map<string, number>();
        eventsSnapshot.forEach(eventDoc => {
            const event = eventDoc.data();
            if (event.gameType?.startsWith('smartboard_') || event.gameType === 'Derece Puanı') return;
            const currentScore = scoresByStudent.get(event.userId) || 0;
            scoresByStudent.set(event.userId, currentScore + event.points);
        });
        
        if (scoresByStudent.size === 0) continue;

        const leaderboard = Array.from(scoresByStudent.entries())
            .map(([uid, score]) => ({ student: studentsMap.get(uid), score }))
            .filter((entry): entry is { student: UserProfile; score: number } => !!entry.student && entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(entry => ({...entry.student, score: entry.score }));

        if (leaderboard.length > 0) {
            monthlyWinners.push({
                periodName: format(monthStart, 'MMMM yyyy', { locale: tr }),
                winners: leaderboard,
            });
        }
    }
    
    const result = {
        seasons,
        monthly: monthlyWinners.reverse(),
    };

    return JSON.parse(JSON.stringify(result));
}

export type ClassLeaderboardEntry = {
    name: string;
    totalScore: number;
    studentCount: number;
};

export async function getSchoolLeaderboard(): Promise<ClassLeaderboardEntry[]> {
    noStore();
    try {
        const studentsQuery = query(collection(db, 'users'), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const scoresBySchool: Record<string, { totalScore: number, studentCount: number }> = {};

        studentsSnapshot.forEach(doc => {
            const student = doc.data() as UserProfile;
            const schoolName = student.schoolName;

            if (schoolName) {
                if (!scoresBySchool[schoolName]) {
                    scoresBySchool[schoolName] = { totalScore: 0, studentCount: 0 };
                }
                scoresBySchool[schoolName].totalScore += (student.score || 0);
                scoresBySchool[schoolName].studentCount += 1;
            }
        });

        const schoolLeaderboard = Object.entries(scoresBySchool)
            .map(([schoolName, data]) => ({
                name: schoolName,
                totalScore: data.totalScore,
                studentCount: data.studentCount,
            }))
            .sort((a, b) => b.totalScore - a.totalScore);
        
        return JSON.parse(JSON.stringify(schoolLeaderboard));

    } catch (error) {
        console.error("Error fetching school leaderboard:", error);
        return [];
    }
}


export async function getGradeLeaderboard(): Promise<ClassLeaderboardEntry[]> {
    noStore();
    try {
        const studentsQuery = query(collection(db, 'users'), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const scoresByClass: Record<string, { totalScore: number, studentCount: number }> = {};

        studentsSnapshot.forEach(doc => {
            const student = doc.data() as UserProfile;
            const className = student.class?.split(' - ')[0]; // Group by grade level, e.g., "5" from "5 - A"

            if (className) {
                if (!scoresByClass[className]) {
                    scoresByClass[className] = { totalScore: 0, studentCount: 0 };
                }
                scoresByClass[className].totalScore += (student.score || 0);
                scoresByClass[className].studentCount += 1;
            }
        });

        const classLeaderboard = Object.entries(scoresByClass)
            .map(([className, data]) => ({
                name: `${className}. Sınıflar`,
                totalScore: data.totalScore,
                studentCount: data.studentCount,
            }))
            .sort((a, b) => b.totalScore - a.totalScore);
        
        return JSON.parse(JSON.stringify(classLeaderboard));

    } catch (error) {
        console.error("Error fetching grade leaderboard:", error);
        return [];
    }
}

export async function getBranchLeaderboard(): Promise<ClassLeaderboardEntry[]> {
    noStore();
    try {
        const studentsQuery = query(collection(db, 'users'), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const scoresByBranch: Record<string, { totalScore: number, studentCount: number }> = {};

        studentsSnapshot.forEach(doc => {
            const student = doc.data() as UserProfile;
            const branchName = student.class;

            if (branchName) {
                if (!scoresByBranch[branchName]) {
                    scoresByBranch[branchName] = { totalScore: 0, studentCount: 0 };
                }
                scoresByBranch[branchName].totalScore += (student.score || 0);
                scoresByBranch[branchName].studentCount += 1;
            }
        });

        const branchLeaderboard = Object.entries(scoresByBranch)
            .map(([className, data]) => ({
                name: className,
                totalScore: data.totalScore,
                studentCount: data.studentCount,
            }))
            .sort((a, b) => b.totalScore - a.totalScore);
        
        return JSON.parse(JSON.stringify(branchLeaderboard));

    } catch (error) {
        console.error("Error fetching branch leaderboard:", error);
        return [];
    }
}


export async function getAnnouncements(category: 'general' | 'exam' = 'general'): Promise<{ success: boolean; data?: Announcement[]; error?: string }> {
    noStore();
    try {
        const q = query(collection(db, 'announcements'), where('category', '==', category), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString(),
        } as Announcement));
        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (e: any) {
        console.error("Error getting announcements:", e);
        if (e.code === 'failed-precondition') {
             return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${e.message}`};
        }
        return { success: false, error: "Duyurular alınamadı." };
    }
}

export async function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    try {
        await addDoc(collection(db, 'announcements'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru oluşturulamadı." };
    }
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'announcements', id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru silinemedi." };
    }
}

    