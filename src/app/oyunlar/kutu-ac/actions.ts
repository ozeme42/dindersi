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

// --- DEĞİŞİKLİK BURADA ---
// Eskiden 30 ile sınırlıydı. Şimdi 500 yaparak konudaki "TÜM" soruların gelmesini sağlıyoruz.
const MAX_BOXES = 500; 

export async function getKutuAcQuestionsAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const params = {
            courseId,
            unitId,
            topicId,
            questionCount: MAX_BOXES, // Buraya artık 500 gidiyor
            difficulty: ['Kolay', 'Orta', 'Zor'],
            questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış'],
        };
        
        const result = await getQuestionsFromBank(params);
        
        if (result.error || result.questions.length < 5) {
             return { questions: [], error: result.error || "Bu oyun için en az 5 soru gereklidir." };
        }
        
        const shuffledQuestions = [...result.questions].sort(() => Math.random() - 0.5);

        return { questions: shuffledQuestions as Question[] };
        
    } catch (e: any) {
        console.error("Error getting Kutu Aç questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}


export async function submitKutuAcScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kutu Aç'),
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
            gameType: 'Kutu Aç',
            context: context,
            attemptNumber: attemptsSnapshot.data().count + 1
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Kutu Aç score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}