
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank, getStaticGameData, getUnitOrTopicGameQuestionsAction } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type CarkifelekQuestions = {
    easy: Question[];
    hard: Question[];
};

export async function getCarkifelekQuestions(params: GetQuizInput): Promise<{ questions: CarkifelekQuestions | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (params.topicId && params.topicId !== params.unitId && params.topicId !== 'preview-topic' && params.topicId !== 'unit-flow' && params.topicId !== 'all')
            ? params.topicId
            : undefined;

        let allResult = (await getQuestionsFromBank({ ...params, topicId: effectiveTopicId, questionTypes: ['mcq', 'tf'], questionCount: 50 })).questions as Question[];

        if (!allResult || allResult.length < 2) {
            // Soru bankasından yetersiz geldiyse ünitenin veya konunun kavramlarından otomatik soru türet
            try {
                const derivedRes = await getUnitOrTopicGameQuestionsAction({
                    courseId: params.courseId,
                    unitId: params.unitId,
                    topicId: effectiveTopicId,
                    sablon: 'carkifelek'
                });
                if (derivedRes.questions && derivedRes.questions.length >= 2) {
                    allResult = derivedRes.questions.map((dq, idx) => ({
                        id: dq.id || `carki-derived-${idx}`,
                        question: dq.question,
                        options: dq.options,
                        correctAnswer: dq.options[dq.correctAnswerIndex ?? 0],
                        correctAnswerIndex: dq.correctAnswerIndex ?? 0,
                        difficulty: idx % 2 === 0 ? 'Kolay' : 'Zor',
                        type: 'Çoktan Seçmeli'
                    } as Question));
                }
            } catch (dErr) {
                console.warn("Çarkıfelek derived questions warning:", dErr);
            }
        }

        if (!allResult || allResult.length < 2) {
            return { questions: null, error: "Bu ünite/konu için yeterli sayıda soru bulunamadı (En az 2 soru gereklidir)." };
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
