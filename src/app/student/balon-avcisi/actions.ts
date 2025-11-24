

'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import { getQuestionsFromBank } from '@/lib/quiz-actions';

export async function getBalloonHuntQuestionsAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionCount: 20, // Fetch up to 20 questions for variety
            difficulty: ['Kolay', 'Orta', 'Zor'],
            questionTypes: ['Çoktan Seçmeli'], // This game works best with MCQs
        });

        if (result.error) {
            return { error: result.error, questions: [] };
        }
        
        if (result.questions.length < 5) {
            return { error: "Balon Avcısı oyunu için bu konuda yeterli sayıda (en az 5) çoktan seçmeli soru bulunamadı.", questions: [] };
        }

        return { questions: result.questions };

    } catch (error: any) {
        console.error("Error getting Balloon Hunt questions:", error);
        return { error: "Oyun soruları alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitBalloonHuntScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Balon Avcısı'),
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
            gameType: 'Balon Avcısı',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Balloon Hunt score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
