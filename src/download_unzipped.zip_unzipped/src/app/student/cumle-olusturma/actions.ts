
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, SentenceScramble } from '@/lib/types';

// Simple array shuffle function
const shuffleArray = (array: string[]): string[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export async function getSentenceScrambleAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: SentenceScramble[]; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'sentence'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(q);
        const allSentences = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ActivityItem[];
        
        // Filter for sentences that have enough words to be scrambled
        const suitableItems = allSentences.filter(item => 
            item.content &&
            item.content.text &&
            item.content.text.trim().split(' ').length > 2 // At least 3 words
        );

        if (suitableItems.length < 1) {
            return { error: "Cümle Oluşturma için bu konuda uygun veri bulunamadı.", questions: [] };
        }

        // Shuffle and pick up to 10
        const selectedItems = suitableItems.sort(() => 0.5 - Math.random()).slice(0, 10);

        const scrambledSentences: SentenceScramble[] = selectedItems.map(item => {
            const correctSentence = item.content.text!;
            const words = correctSentence.split(' ');
            let shuffledWords = shuffleArray(words);
            
            // Ensure it's not the same as the original
            while(shuffledWords.join(' ') === correctSentence) {
                shuffledWords = shuffleArray(words);
            }
            
            const scrambledSentence = shuffledWords.join(' ');

            return {
                scrambledSentence,
                correctSentence,
            };
        });

        return { questions: scrambledSentences };
    } catch (error: any) {
        console.error("Error getting sentence scramble quest:", error);
        return { error: "Cümle Oluşturma görevi alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitSentenceScrambleScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Cümle Ustası'),
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
            gameType: 'Cümle Ustası',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting sentence scramble score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
