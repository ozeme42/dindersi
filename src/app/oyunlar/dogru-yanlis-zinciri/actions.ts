
'use server';

import { db } from "@/lib/firebase";
import { doc, increment, writeBatch, collection, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { getQuestionsFromBank } from '@/lib/quiz-actions';

export async function getDogruYanlisZinciriAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionTypes: ['Doğru/Yanlış'],
            questionCount: 50 // Fetch a good amount to shuffle
        });
        
        if (result.error || result.questions.length < 5) {
            return { questions: [], error: result.error || "Bu zincir oyunu için en az 5 Doğru/Yanlış sorusu gereklidir." };
        }
        
        const questions = result.questions as Question[];
        
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        
        return { questions: JSON.parse(JSON.stringify(questions)) };

    } catch (e: any) {
        console.error("Error getting D/Y Zinciri questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitDogruYanlisZinciriScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
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
            gameType: 'Doğru/Yanlış Zinciri',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting D/Y Zinciri score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
