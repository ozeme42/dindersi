
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type CarkifelekQuestions = {
    easy: Question[];
    hard: Question[];
};

export async function getCarkifelekQuestions(params: GetQuizInput): Promise<{ questions: CarkifelekQuestions | null; error?: string }> {
    noStore();
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

        const data: CarkifelekQuestions = {
            easy: easyResult.questions as Question[],
            hard: hardResult.questions as Question[],
        };

        return { questions: JSON.parse(JSON.stringify(data)) };

    } catch (e: any) {
        console.error("Error getting Çarkıfelek questions:", e);
        return { questions: null, error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}


export async function submitCarkifelekScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    // This is a smartboard game, so we don't need to submit scores for now.
    // The logic can be added here if needed in the future.
    return { success: true };
}
