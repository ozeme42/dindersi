
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Anagram, ActivityItem } from '@/lib/types';

const shuffle = (word: string): string => {
    const a = word.split("");
    const n = a.length;

    // Fisher-Yates shuffle
    for(let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    const shuffledWord = a.join("");
    // Ensure it's not the same as the original word for short words
    if (shuffledWord === word && word.length > 1) {
        return shuffle(word);
    }
    return shuffledWord;
};

export async function getConceptHuntAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Anagram[]; error?: string }> {
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
        const allDefinitions = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ActivityItem[];
        
        // Filter for definitions that have a single-word term suitable for an anagram.
        const suitableItems = allDefinitions.filter(item => 
            item.content &&
            item.content.term && 
            item.content.term.trim().length > 3 && // At least 4 letters
            !item.content.term.includes(' ') && // Single word
            !/\d/.test(item.content.term) && // No numbers
            item.content.definition
        );

        if (suitableItems.length < 1) {
            return { error: "Kavram Avı için bu konuda uygun tanım bulunamadı.", questions: [] };
        }

        // Shuffle and pick up to 10
        const selectedItems = suitableItems.sort(() => 0.5 - Math.random()).slice(0, 10);

        const anagrams: Anagram[] = selectedItems.map(item => {
            const correctAnswer = item.content.term!;
            const definition = item.content.definition!;

            return {
                definition,
                scrambledWord: shuffle(correctAnswer.toLocaleUpperCase('tr-TR')),
                correctAnswer: correctAnswer.toLocaleUpperCase('tr-TR'),
            };
        });

        return { questions: JSON.parse(JSON.stringify(anagrams)) };
    } catch (error: any) {
        console.error("Error getting concept hunt quest:", error);
        return { error: "Kavram Avı görevi alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitConceptHuntScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kavram Avı'),
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
            gameType: 'Kavram Avı',
            context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting concept hunt score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
