'use server';

import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';
import { unstable_noStore as noStore } from 'next/cache';

export type HizliButonQuestion = {
    q: string; // The definition
    a: string; // The correct term
};

export async function getHizliButonQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: HizliButonQuestion[]; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const validPairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: true,
        });

        if (validPairs.length === 0) {
            return {
                error: "Hızlı Buton oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı kavram ve tanım bulunamadı.",
                questions: [],
            };
        }

        const pairs: HizliButonQuestion[] = shuffleArray(validPairs)
            .slice(0, 30)
            .map(p => ({ q: p.definition, a: p.term }));

        return { questions: JSON.parse(JSON.stringify(pairs)) };
    } catch (error: any) {
        console.error("Error getting Hizli Buton data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
