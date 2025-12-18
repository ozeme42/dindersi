
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function updateScore(userId: string, score: number, gameType: string, context: string) {
    // This is a client-called function. It should not use the Admin SDK.
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
        console.log(`Static mode: Score update for ${userId} ignored.`);
        return;
    }

    if (!userId || !gameType) {
        console.error("User ID or game type is missing for score update.");
        return;
    }

    try {
        // Use client SDK 'db' from @/lib/firebase
        await addDoc(collection(db, 'scoreEvents'), {
            userId: userId,
            points: score,
            gameType: gameType,
            context: context,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating score in actions.ts: ", error);
        // We don't throw an error here to prevent the client from crashing
        // if score logging fails. This is a background task.
    }
}
