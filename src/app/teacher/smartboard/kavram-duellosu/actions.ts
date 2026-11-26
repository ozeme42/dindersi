'use server';

import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { pickStudioDistractors, prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';
import { unstable_noStore as noStore } from 'next/cache';

export type KavramDuellosuQuestion = {
    q: string; // The definition
    a: string; // The correct term
    options: string[]; // All options including correct one
};

export async function getKavramDuellosuQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: KavramDuellosuQuestion[]; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const uniquePairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: true,
        });

        const distractorPool = [...new Set([...uniquePairs.map(p => p.term), ...studio.concepts])];
        const gameQuestions: KavramDuellosuQuestion[] = [];

        for (const item of uniquePairs) {
            const selectedDistractors = pickStudioDistractors(item.term, distractorPool, 3);
            if (selectedDistractors.length === 0) continue;

            gameQuestions.push({
                q: item.definition,
                a: item.term,
                options: shuffleArray([item.term, ...selectedDistractors]),
            });
        }

        if (uniquePairs.length < 2 || gameQuestions.length < 2) {
            return {
                error: "Kavram Düellosu oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
                questions: [],
            };
        }

        return { questions: JSON.parse(JSON.stringify(shuffleArray(gameQuestions))) };
    } catch (error: any) {
        console.error("Error getting Kavram Düellosu data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
