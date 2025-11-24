
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';

// Simple array shuffle function
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Re-using the Question type for the output, as it fits the structure.
export async function getBilBakalimAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const definitionsQuery = query(baseQuery, where('type', '==', 'definition'));
        const definitionsSnapshot = await getDocs(definitionsQuery);
        
        const allDefinitions = definitionsSnapshot.docs
            .map(doc => ({ ...doc.data() as ActivityItem, id: doc.id}))
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 1) {
            return { error: "Bil Bakalım için bu konuda uygun tanım bulunamadı.", questions: [] };
        }

        const gameQuestions: Question[] = allDefinitions.map((item, index) => {
            return {
                id: item.id,
                text: item.content.definition!,
                type: 'Çoktan Seçmeli', // This type is nominal for the Question type, game logic will differ
                correctAnswer: item.content.term!,
                options: allDefinitions.map(d => d.content.term!), // Provide all terms as options
                difficulty: 'Orta',
                courseId: item.courseId,
                unitId: item.unitId,
                topicId: item.topicId,
                topic: '',
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
    } catch (error: any) {
        console.error("Error getting Bil Bakalım questions:", error);
        return { error: "Bil Bakalım görevi alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitBilBakalimScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Bil Bakalım'),
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
            gameType: 'Bil Bakalım',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Bil Bakalım score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
