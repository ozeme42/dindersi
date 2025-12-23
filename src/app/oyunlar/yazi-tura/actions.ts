
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, getCountFromServer, increment } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank } from "@/lib/quiz-actions";

export type YaziTuraQuestions = {
    easy: Question[];
    hard: Question[];
};

export async function getYaziTuraQuestionsAction(params: GetQuizInput): Promise<{ questions: YaziTuraQuestions | null; error?: string }> {
    try {
        const easyParams: GetQuizInput = { ...params, difficulty: ['Kolay'], questionTypes: ['mcq'], questionCount: 20 };
        const hardParams: GetQuizInput = { ...params, difficulty: ['Zor'], questionTypes: ['mcq'], questionCount: 20 };

        const [easyResult, hardResult] = await Promise.all([
            getQuestionsFromBank(easyParams),
            getQuestionsFromBank(hardParams)
        ]);

        if (easyResult.error || hardResult.error || easyResult.questions.length < 1 || hardResult.questions.length < 1) {
            return { questions: null, error: "Bu konu için yeterli sayıda kolay ve zor soru bulunamadı." };
        }

        const data: YaziTuraQuestions = {
            easy: easyResult.questions as Question[],
            hard: hardResult.questions as Question[],
        };

        return { questions: JSON.parse(JSON.stringify(data)) };

    } catch (e: any) {
        console.error("Error getting Yazi Tura questions:", e);
        return { questions: null, error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
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
            gameType: 'Yazı Tura',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Yazı Tura score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
