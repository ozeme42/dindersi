
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, getCountFromServer, increment } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank } from "@/lib/quiz-actions";

import { unstable_noStore as noStore } from 'next/cache';

export type YaziTuraQuestions = {
    easy: Question[];
    hard: Question[];
};

export async function getYaziTuraQuestionsAction(params: GetQuizInput): Promise<{ questions: YaziTuraQuestions | null; error?: string }> {
    noStore();
    try {
        const allResult = (await getQuestionsFromBank({ ...params, questionTypes: ['mcq'], questionCount: 40 })).questions as Question[];

        if (!allResult || allResult.length < 2) {
            return { questions: null, error: "Bu konu için yeterli sayıda soru bulunamadı (En az 2 çoktan seçmeli soru gereklidir)." };
        }

        let easy = allResult.filter(q => q.difficulty === 'Kolay');
        let hard = allResult.filter(q => q.difficulty === 'Zor');
        const medium = allResult.filter(q => q.difficulty === 'Orta' || !q.difficulty);

        if (easy.length === 0) {
            easy = medium.slice(0, Math.ceil(medium.length / 2));
            if (easy.length === 0) easy = allResult.slice(0, Math.ceil(allResult.length / 2));
        }
        if (hard.length === 0) {
            hard = medium.slice(Math.ceil(medium.length / 2));
            if (hard.length === 0) hard = allResult.slice(Math.ceil(allResult.length / 2));
            if (hard.length === 0) hard = allResult;
        }

        const data: YaziTuraQuestions = {
            easy: easy.length > 0 ? easy : allResult,
            hard: hard.length > 0 ? hard : allResult,
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
