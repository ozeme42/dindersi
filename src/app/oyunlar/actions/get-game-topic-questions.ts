'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { pickStudioDistractors, prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';
import type { MiniGameQuestion } from '@/lib/types';

export type GetGameTopicQuestionsInput = {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    preferConceptsFirst?: boolean;
};

export type GetGameTopicQuestionsOutput = {
    questions: MiniGameQuestion[];
    topicTitle: string;
    error?: string;
};

/**
 * Resolves a human-readable topic title from Firestore metadata without reading slide steps.
 */
async function resolveTopicTitle(topicId?: string): Promise<string> {
    if (!topicId || topicId === 'all' || topicId === 'unit-flow' || topicId === 'preview-topic') {
        return '';
    }
    try {
        const topicSnap = await getDoc(doc(db, 'topics', topicId));
        if (topicSnap.exists()) {
            const title = topicSnap.data()?.title;
            if (typeof title === 'string' && title.trim()) {
                return title.trim();
            }
        }
    } catch {
        // Fallback smoothly if Firestore is offline during static export/local mode
    }
    return '';
}

export async function getGameTopicQuestions(
    input: GetGameTopicQuestionsInput
): Promise<GetGameTopicQuestionsOutput> {
    noStore();
    const { courseId, unitId, topicId } = input;
    const effectiveTopicId = (topicId && topicId !== 'all' && topicId !== 'unit-flow' && topicId !== 'preview-topic' && topicId !== unitId)
        ? topicId
        : undefined;

    try {
        const [studio, resolvedTitle] = await Promise.all([
            getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId }),
            resolveTopicTitle(effectiveTopicId),
        ]);

        const topicTitle = resolvedTitle || 'Kavram Etkinliği';
        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: true,
        });

        if (pairs.length < 2) {
            return {
                questions: [],
                topicTitle,
                error: "Bu konu için Kavram ve Notlar Stüdyosu'nda kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
            };
        }

        const distractorPool = [...new Set([...pairs.map(p => p.term), ...studio.concepts])];
        const formatted: MiniGameQuestion[] = shuffleArray(pairs)
            .slice(0, 30)
            .map((pair, idx) => {
                const distractors = pickStudioDistractors(pair.term, distractorPool, 3);
                const options = [pair.term, ...distractors];
                return {
                    id: `studio-pair-${idx + 1}`,
                    question: pair.definition,
                    options,
                    correctAnswerIndex: 0,
                    explanation: pair.definition,
                };
            });

        return {
            questions: JSON.parse(JSON.stringify(formatted)),
            topicTitle,
        };
    } catch (err: any) {
        console.error("getGameTopicQuestions Error:", err);
        return {
            questions: [],
            topicTitle: 'Oyun',
            error: err?.message || 'Sorular yüklenirken bir hata oluştu.',
        };
    }
}
