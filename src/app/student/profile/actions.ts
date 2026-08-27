
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
        const rawStartDate = new Date(registrationDate);
        const startDate = isNaN(rawStartDate.getTime()) ? sub(new Date(), { months: 3 }) : rawStartDate;
        const now = new Date();
        const achievementsWithTime: (Achievement & { sortTimestamp: number })[] = [];
        
        // Weekly Achievements (Capped to max 12 recent weeks)
        const maxWeekStart = sub(now, { weeks: 12 });
        const effectiveWeekStart = startDate > maxWeekStart ? startDate : maxWeekStart;

        const weeks = eachWeekOfInterval(
            { start: effectiveWeekStart, end: now },
            { weekStartsOn: 1 }
        );

        for (const week of weeks) {
            const weekStart = startOfWeek(week, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
            if (weekEnd > now) continue;

            const leaderboard = await getLeaderboardForPeriod(weekStart, weekEnd);
            const userRank = leaderboard.findIndex(entry => entry.uid === studentId);
            
            if (userRank !== -1 && userRank < 3) {
                achievementsWithTime.push({
                    periodType: 'weekly',
                    periodName: `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM yyyy')}`,
                    rank: userRank + 1,
                    score: leaderboard[userRank].score,
                    sortTimestamp: weekEnd.getTime(),
                });
            }
        }

        // Monthly Achievements (Capped to max 6 recent months)
        const maxMonthStart = sub(now, { months: 6 });
        const effectiveMonthStart = startDate > maxMonthStart ? startDate : maxMonthStart;

        const months = eachMonthOfInterval({ start: effectiveMonthStart, end: now });

        for (const month of months) {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            if (monthEnd > now) continue;

            const leaderboard = await getLeaderboardForPeriod(monthStart, monthEnd);
            const userRank = leaderboard.findIndex(entry => entry.uid === studentId);

            if (userRank !== -1 && userRank < 3) {
                achievementsWithTime.push({
                    periodType: 'monthly',
                    periodName: format(monthStart, 'MMMM yyyy', { locale: tr }),
                    rank: userRank + 1,
                    score: leaderboard[userRank].score,
                    sortTimestamp: monthEnd.getTime(),
                });
            }
        }
        
        // Sort achievements by timestamp descending (most recent first)
        achievementsWithTime.sort((a, b) => b.sortTimestamp - a.sortTimestamp);

        const achievements: Achievement[] = achievementsWithTime.map(({ sortTimestamp, ...rest }) => rest);

        return { success: true, achievements: JSON.parse(JSON.stringify(achievements)) };

    } catch (e: any) {
        console.error("Error getting student achievements:", e);
        return { success: false, error: "Başarılar alınırken bir hata oluştu." };
    }
}
