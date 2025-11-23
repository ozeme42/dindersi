
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { UserProfile, Achievement } from "@/lib/types";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, sub } from 'date-fns';
import { tr } from 'date-fns/locale';

async function getLeaderboardForPeriod(startDate: Date, endDate: Date): Promise<{ uid: string, score: number }[]> {
    noStore();
    const firestoreStartDate = Timestamp.fromDate(startDate);
    const firestoreEndDate = Timestamp.fromDate(endDate);
    
    const scoresByStudent = new Map<string, number>();

    const scoreEventsQuery = query(
        collection(db, 'scoreEvents'),
        where("timestamp", ">=", firestoreStartDate),
        where("timestamp", "<=", firestoreEndDate)
    );
    
    const eventsSnapshot = await getDocs(scoreEventsQuery);
    
    eventsSnapshot.forEach(doc => {
        const event = doc.data();
        if (event.userId) {
            const currentScore = scoresByStudent.get(event.userId) || 0;
            scoresByStudent.set(event.userId, currentScore + event.points);
        }
    });

    return Array.from(scoresByStudent.entries())
        .map(([uid, score]) => ({ uid, score }))
        .sort((a, b) => b.score - a.score);
}

export async function getStudentAchievements(studentId: string, registrationDate: string | null): Promise<{ success: boolean; achievements?: Achievement[]; error?: string }> {
    noStore();
    if (!studentId || !registrationDate) {
        return { success: false, error: "Kullanıcı bilgileri eksik." };
    }

    try {
        const startDate = new Date(registrationDate);
        const now = new Date();
        const achievements: Achievement[] = [];
        
        // Weekly Achievements
        const weeks = eachWeekOfInterval(
            { start: startDate, end: now },
            { weekStartsOn: 1 }
        );

        for (const week of weeks) {
            const weekStart = startOfWeek(week, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
            if (weekEnd > now) continue;

            const leaderboard = await getLeaderboardForPeriod(weekStart, weekEnd);
            const userRank = leaderboard.findIndex(entry => entry.uid === studentId);
            
            if (userRank !== -1 && userRank < 3) {
                achievements.push({
                    periodType: 'weekly',
                    periodName: `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM yyyy')}`,
                    rank: userRank + 1,
                    score: leaderboard[userRank].score,
                });
            }
        }

        // Monthly Achievements
        const months = eachMonthOfInterval({ start: startDate, end: now });

        for (const month of months) {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            if (monthEnd > now) continue;

            const leaderboard = await getLeaderboardForPeriod(monthStart, monthEnd);
            const userRank = leaderboard.findIndex(entry => entry.uid === studentId);

            if (userRank !== -1 && userRank < 3) {
                achievements.push({
                    periodType: 'monthly',
                    periodName: format(monthStart, 'MMMM yyyy', { locale: tr }),
                    rank: userRank + 1,
                    score: leaderboard[userRank].score,
                });
            }
        }
        
        // Sort achievements by period name descending (most recent first)
        achievements.sort((a,b) => {
            const dateA = new Date(a.periodName.split(' - ')[1] || a.periodName);
            const dateB = new Date(b.periodName.split(' - ')[1] || b.periodName);
            return dateB.getTime() - dateA.getTime();
        });


        return { success: true, achievements: JSON.parse(JSON.stringify(achievements)) };

    } catch (e: any) {
        console.error("Error getting student achievements:", e);
        return { success: false, error: "Başarılar alınırken bir hata oluştu." };
    }
}
