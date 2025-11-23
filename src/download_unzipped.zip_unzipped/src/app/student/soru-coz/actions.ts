

'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getCountFromServer } from 'firebase/firestore';

export async function submitSoruCozScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Soru Çöz'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);

        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Soru Çöz',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Soru Çöz score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
