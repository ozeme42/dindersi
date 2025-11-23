'use server';

import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, getDocs, query, where, increment, serverTimestamp } from "firebase/firestore";

type ScoreUpdate = {
    userId: string;
    points: number;
    gameType: 'smartboard_bireysel' | 'smartboard_takim' | 'smartboard_duello' | 'smartboard_kavram_yarismasi';
    context?: string;
};

export async function updateMultipleStudentScores(scoreUpdates: ScoreUpdate[]): Promise<{ success: boolean; error?: string }> {
    if (!scoreUpdates) {
        return { success: true }; 
    }

    const batch = writeBatch(db);
    const scoreEventsRef = collection(db, 'scoreEvents');

    scoreUpdates.forEach(update => {
        // Log the event for every participant, even if their score is 0.
        // This ensures participation is recorded.
        const newEventRef = doc(scoreEventsRef);
        batch.set(newEventRef, {
            userId: update.userId,
            points: update.points,
            timestamp: serverTimestamp(),
            gameType: update.gameType, 
            context: update.context || 'Akıllı Tahta Yarışması',
        });

        // DO NOT increment the user's main score.
        // The tournament leaderboard is separate from the all-time leaderboard.
        // The main score is updated through individual activities and daily quests.
    });

    try {
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error updating multiple scores:", error);
        return { success: false, error: "Skorlar güncellenirken bir hata oluştu." };
    }
}