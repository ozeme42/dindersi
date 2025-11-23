
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import { getQuestionsFromBank } from '@/lib/quiz-actions';


export async function getKutuAcQuestionsAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionCount: 100, // Fetch all available for the topic
            difficulty: ['Kolay', 'Orta', 'Zor'],
            questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış'], // Limit to simple interaction types for this game
        });

        if (result.error) {
            return { error: result.error, questions: [] };
        }
        
        if (result.questions.length === 0) {
            return { error: "Bu konu için 'Kutu Aç' oyununa uygun soru bulunamadı.", questions: [] };
        }

        return { questions: result.questions };

    } catch (error: any) {
        console.error("Error getting Kutu Aç questions:", error);
        return { error: "Oyun soruları alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitKutuAcScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        // Allow multiple attempts, as this is a practice game.
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
        });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Kutu Aç score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
