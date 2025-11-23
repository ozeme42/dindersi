
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type MemoryCardPair = {
    concept: string;
    definition: string;
};

// Simple array shuffle function
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export async function getMemoryGameAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ items: MemoryCardPair[]; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(q);
        
        const allDefinitions = querySnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 3) {
            return { error: "Hafıza Kartları oyunu için bu konuda en az 3 uygun tanım bulunamadı.", items: [] };
        }
        
        // Select up to 7 definitions for the game (14 cards for a 3x5 grid)
        const selectedDefinitions = shuffleArray(allDefinitions).slice(0, 7);

        const gameItems: MemoryCardPair[] = selectedDefinitions.map(item => ({
            concept: item.content.term!,
            definition: item.content.definition!,
        }));

        return { items: JSON.parse(JSON.stringify(gameItems)) };
    } catch (error: any) {
        console.error("Error getting Memory Game items:", error);
        return { error: "Hafıza Kartları oyunu verileri alınırken bir hata oluştu.", items: [] };
    }
}


export async function submitMemoryGameScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Hafıza Kartları'),
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
            userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Hafıza Kartları',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting memory game score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
