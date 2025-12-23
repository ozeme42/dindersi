
'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import type { Question } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getTornadoGameQuestions(
    { courseId, unitId, topicId, questionCount = 30 }: { courseId?: string; unitId?: string; topicId?: string; questionCount?: number; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const params = {
            courseId,
            unitId,
            topicId,
            questionCount,
            difficulty: ['Kolay', 'Orta', 'Zor'],
            questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış'],
        };
        
        const result = await getQuestionsFromBank(params);
        
        if (result.error) {
             return { questions: [], error: result.error };
        }
        
        return { questions: result.questions as Question[] };
        
    } catch (e: any) {
        console.error("Error getting Tornado questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}


export async function submitTornadoScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Tornado'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
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
            gameType: 'Tornado',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Tornado score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
