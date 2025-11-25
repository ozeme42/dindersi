
'use server';

import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, collection, addDoc } from "firebase/firestore";

export async function submitBalloonHuntScore(userId: string, score: number, context: string): Promise<{ success: boolean, error?: string }> {
    if (!userId || score <= 0) {
        // No points to save, but not an error.
        return { success: true };
    }

    const userRef = doc(db, 'users', userId);
    const scoreEventRef = doc(collection(db, 'scoreEvents'));

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("Kullanıcı bulunamadı.");
            }
            const currentScore = userDoc.data().score || 0;
            const newScore = currentScore + score;

            transaction.update(userRef, { score: newScore });

            transaction.set(scoreEventRef, {
                userId: userId,
                points: score,
                gameType: 'Balon Avcısı',
                context: context,
                timestamp: serverTimestamp(),
            });
        });
        return { success: true };
    } catch (e: any) {
        console.error('Puan kaydetme sırasında hata:', e);
        return { success: false, error: e.message };
    }
}
