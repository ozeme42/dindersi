
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type HangmanData = {
    word: string;
    hint: string;
};

export async function getAdamAsmacaAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: HangmanData[] | null; error?: string }> {
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
        const allDefinitions = querySnapshot.docs.map(doc => doc.data() as ActivityItem);
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

        const suitableItems = allDefinitions.filter(item => 
            item.content &&
            item.content.term && 
            item.content.term.trim().length > 3 && // At least 4 letters
            item.content.term.trim().length <= 14 && // At most 14 letters
            !item.content.term.includes(' ') && // Single word
            turkishAlphabetRegex.test(item.content.term) && // Only Turkish alphabet letters
            item.content.definition
        );

        if (suitableItems.length === 0) {
            return { error: "Adam Asmaca için bu konuda uygun kelime bulunamadı.", data: null };
        }
        
        const shuffledItems = suitableItems.sort(() => 0.5 - Math.random());
        const gameData: HangmanData[] = shuffledItems.map(item => ({
            word: item.content.term!.toLocaleUpperCase('tr-TR'),
            hint: item.content.definition!,
        }));

        // Limit to a reasonable number for a single game session
        return { data: gameData.slice(0, 10) };

    } catch (error: any) {
        console.error("Error getting hangman data:", error);
        return { error: "Adam Asmaca görevi alınırken bir hata oluştu.", data: null };
    }
}

export async function submitAdamAsmacaScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Adam Asmaca'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);
        
        // 1. Increment the user's total score
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        // 2. Log the score event
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Adam Asmaca',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Adam Asmaca score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
