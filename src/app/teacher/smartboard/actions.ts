'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type ScoreUpdate = {
    userId: string;
    points: number;
    gameType: 'smartboard_bireysel' | 'smartboard_takim' | 'smartboard_duello' | 'smartboard_kavram_yarismasi';
    context?: string;
};

export async function updateMultipleStudentScores(scoreUpdates: ScoreUpdate[]): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !scoreUpdates || scoreUpdates.length === 0) {
        return { success: true }; 
    }

    try {
        const db = getAdminDb();
        if (!db) return { success: true };
        const batch = db.batch();
        const scoreEventsRef = db.collection('scoreEvents');

        scoreUpdates.forEach(update => {
            if (!update.userId) return;
            const newEventRef = scoreEventsRef.doc();
            batch.set(newEventRef, {
                userId: update.userId,
                points: update.points || 0,
                timestamp: FieldValue.serverTimestamp(),
                gameType: update.gameType, 
                context: update.context || 'Akıllı Tahta Yarışması',
            });
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error updating multiple scores:", error);
        return { success: false, error: "Skorlar güncellenirken bir hata oluştu." };
    }
}
