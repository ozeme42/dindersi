

'use server';

import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getCountFromServer } from 'firebase/firestore';
import type { Question } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';


export async function getTrueFalseChainAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionTypes: ['Doğru/Yanlış'],
            questionCount: 100 // Fetch a large number to ensure we get as many as possible
        });

        if (result.error) {
            return { error: result.error, questions: [] };
        }
        
        if (result.questions.length === 0) {
            return { error: "Bu konu için Doğru/Yanlış sorusu bulunamadı.", questions: [] };
        }
        
        // Final check to ensure data consistency, although getQuestionsFromBank should handle this.
        const consistentQuestions = result.questions.map(q => {
            if (q.type === 'Doğru/Yanlış') {
                return { ...q, isTrue: q.correctAnswer === 'Doğru' };
            }
            return q;
        });

        return { questions: consistentQuestions };

    } catch (error: any) {
        console.error("Error getting T/F chain questions:", error);
        return { error: "Doğru/Yanlış Zinciri soruları alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitTrueFalseChainScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Doğru/Yanlış Zinciri'),
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
            gameType: 'Doğru/Yanlış Zinciri',
            context,
        });
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting T/F Chain score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}

    
