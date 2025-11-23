
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import { getQuestionsFromBank } from '@/lib/quiz-actions';

export async function getMazeQuestionsAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış'],
            questionCount: 20, // Fetch a decent number for variety in the maze
            difficulty: ['Kolay', 'Orta']
        });

        if (result.error) {
            return { error: result.error, questions: [] };
        }
        
        if (result.questions.length < 5) { // Need at least a few questions
            return { error: "Labirent oyunu için bu konuda yeterli sayıda (en az 5) soru bulunamadı.", questions: [] };
        }

        return { questions: result.questions };

    } catch (error: any) {
        console.error("Error getting Maze questions:", error);
        return { error: "Labirent soruları alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitMazeScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Labirent'),
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
            gameType: 'Labirent',
            context: context,
        });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Maze score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
