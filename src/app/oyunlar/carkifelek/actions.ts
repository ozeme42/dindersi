
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank, getStaticGameData } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type CarkifelekQuestions = {
    easy: Question[];
    hard: Question[];
};

export async function getCarkifelekQuestions(params: GetQuizInput): Promise<{ questions: CarkifelekQuestions | null; error?: string }> {
    noStore();
    try {
        const allResult = (await getQuestionsFromBank({ ...params, questionTypes: ['mcq', 'tf'], questionCount: 50 })).questions as Question[];

        if (!allResult || allResult.length < 2) {
            return { questions: null, error: "Bu konu için yeterli sayıda soru bulunamadı (En az 2 soru gereklidir)." };
        }

        let easy = allResult.filter(q => q.difficulty === 'Kolay');
        let hard = allResult.filter(q => q.difficulty === 'Zor');
        const medium = allResult.filter(q => q.difficulty === 'Orta' || !q.difficulty);

        if (easy.length === 0) {
            easy = medium.slice(0, Math.ceil(medium.length / 2));
            if (easy.length === 0) easy = allResult.slice(0, 1);
        }
        if (hard.length === 0) {
            hard = medium.slice(Math.ceil(medium.length / 2));
            if (hard.length === 0) hard = allResult.slice(-1);
        }

        const data: CarkifelekQuestions = {
            easy: easy.length > 0 ? easy : allResult,
            hard: hard.length > 0 ? hard : allResult,
        };

        return { questions: JSON.parse(JSON.stringify(data)) };

    } catch (e: any) {
        console.error("Error getting Çarkıfelek questions:", e);
        return { questions: null, error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitCarkifelekScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
}
