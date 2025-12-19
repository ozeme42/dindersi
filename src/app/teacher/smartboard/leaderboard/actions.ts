
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, writeBatch, doc, documentId } from 'firebase/firestore';
import type { UserProfile, ScoreEvent } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export async function getSmartboardLeaderboard(params: {
    period?: 'all' | 'weekly' | 'monthly' | 'custom',
    offset?: number,
    startDate?: string,
    endDate?: string
}): Promise<UserProfile[]> {
    noStore();
    const { period = 'all', offset = 0, startDate: startDateStr, endDate: endDateStr } = params;

    const gameTypesToInclude = ['smartboard_bireysel', 'smartboard_takim', 'smartboard_duello'];

    const scoresByStudent = new Map<string, number>();
    let queryConstraints = [where("gameType", "in", gameTypesToInclude)];

    // For other periods, we filter by date.
    if (period !== 'all') {
        let startDate: Date;
        let endDate: Date;

        if (period === 'custom' && startDateStr && endDateStr) {
            startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endDateStr);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'weekly') {
            const now = new Date();
            const currentDay = now.getDay();
            const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() + dayOffset + (offset * 7));
            weekStart.setHours(0, 0, 0, 0);
            startDate = weekStart;
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            endDate = weekEnd;
        } else { // monthly
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1);
            monthStart.setHours(0, 0, 0, 0);
            startDate = monthStart;
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            endDate = monthEnd;
        }

        queryConstraints.push(where("timestamp", ">=", Timestamp.fromDate(startDate)));
        queryConstraints.push(where("timestamp", "<=", Timestamp.fromDate(endDate)));
    }

    const scoreEventsQuery = query(collection(db, 'scoreEvents'), ...queryConstraints);
    const eventsSnapshot = await getDocs(scoreEventsQuery);
    
    eventsSnapshot.forEach(doc => {
        const event = doc.data() as ScoreEvent;
        const currentScore = scoresByStudent.get(event.userId) || 0;
        scoresByStudent.set(event.userId, currentScore + event.points);
    });

    if (scoresByStudent.size === 0) return [];

    const studentIds = Array.from(scoresByStudent.keys());
    const studentProfiles: UserProfile[] = [];
    
    // Chunk studentIds to handle Firestore 'in' query limitation (max 30 per query)
    const chunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += 30) {
        chunks.push(studentIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const studentsQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const studentsSnapshot = await getDocs(studentsQuery);
        studentsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            studentProfiles.push({
                 uid: docSnap.id, 
                 ...data,
                 createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || null
            } as UserProfile);
        });
    }

    const leaderboard = studentProfiles.map(student => ({
        ...student,
        score: scoresByStudent.get(student.uid) || 0,
    })).filter(player => player.score > 0) // Filter out players with zero score
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    return JSON.parse(JSON.stringify(leaderboard));
}

export async function resetSmartboardScores(): Promise<{ success: boolean; error?: string }> {
    noStore();
    try {
        const gameTypesToDelete = ['smartboard_bireysel', 'smartboard_takim', 'smartboard_duello'];
        const q = query(collection(db, 'scoreEvents'), where("gameType", "in", gameTypesToDelete));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: true };
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
            batch.delete(doc(db, "scoreEvents", d.id));
        });

        await batch.commit();
        return { success: true };

    } catch(error: any) {
        console.error("Error resetting smartboard scores:", error);
        return { success: false, error: "Puanlar sıfırlanırken bir hata oluştu." };
    }
}
