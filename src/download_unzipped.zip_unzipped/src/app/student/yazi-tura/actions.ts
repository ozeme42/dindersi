

'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import { getQuestionsFromBank } from '@/lib/quiz-actions';

export type YaziTuraQuestions = {
    easy: Question[];
    hard: Question[];
};

export async function getYaziTuraQuestionsAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: YaziTuraQuestions | null; error?: string }> {
    noStore();
    try {
        const [easyMediumResult, hardResult] = await Promise.all([
            getQuestionsFromBank({ courseId, unitId, topicId, difficulty: ['Kolay', 'Orta'], questionCount: 20, questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış'] }),
            getQuestionsFromBank({ courseId, unitId, topicId, difficulty: ['Zor'], questionCount: 20, questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış'] })
        ]);

        if (easyMediumResult.error || hardResult.error) {
             return { error: easyMediumResult.error || hardResult.error, data: null };
        }
        
        if (easyMediumResult.questions.length < 1 || hardResult.questions.length < 1) {
            return { error: "Yazı Tura oyunu için hem kolay/orta hem de zor seviyeden yeterli sayıda soru bulunamadı.", data: null };
        }

        const data = {
            easy: easyMediumResult.questions,
            hard: hardResult.questions,
        };

        return { data: JSON.parse(JSON.stringify(data)) };

    } catch (error: any) {
        console.error("Error getting Yazi Tura questions:", error);
        return { error: "Oyun soruları alınırken bir hata oluştu.", data: null };
    }
}


export async function submitYaziTuraScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Yazı Tura'),
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
            gameType: 'Yazı Tura',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Yazı Tura score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
