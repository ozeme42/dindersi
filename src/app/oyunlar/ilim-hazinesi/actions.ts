
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
  getDocs, 
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import { getQuestionsFromBank } from "@/lib/quiz-actions";

export async function getIlimHazinesiQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        const params = {
            courseId,
            unitId,
            topicId,
            questionCount: 50, // Fetch a larger pool for this game
            difficulty: ['Kolay', 'Orta', 'Zor'],
            questionTypes: ['Çoktan Seçmeli'],
        };

        const result = await getQuestionsFromBank(params);
        
        if (result.error || result.questions.length < 5) {
             return { questions: [], error: result.error || "Bu oyun için en az 5 çoktan seçmeli soru gereklidir." };
        }
        
        return { questions: result.questions };
    } catch (e: any) {
        console.error("Error getting Ilim Hazinesi questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitIlimHazinesiScore(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'İlim Hazinesi'),
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
            gameType: 'İlim Hazinesi',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Ilim Hazinesi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
