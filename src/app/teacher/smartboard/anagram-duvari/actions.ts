'use server';

import { getRegisteredStudioItemsForGame } from "@/lib/quiz-actions";
import { filterStudioWordList, shuffleArray } from "@/lib/studio-game-helpers";
import { unstable_noStore as noStore } from 'next/cache';

export type AnagramWallWord = string;

export async function getAnagramWallWords(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ words: AnagramWallWord[]; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const uniqueWords = filterStudioWordList(studio.concepts, {
            minLength: 3,
            maxLength: 18,
            maxWords: 2,
        });

        if (uniqueWords.length === 0) {
            return {
                words: [],
                error: "Anagram Duvarı oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı uygun kavram bulunamadı.",
            };
        }

        const shuffled = shuffleArray(uniqueWords);
        return { words: JSON.parse(JSON.stringify(shuffled.slice(0, 30))) };

    } catch (error: any) {
        console.error("Error getting Anagram words:", error);
        return { error: "Veri alınırken hata oluştu.", words: [] };
    }
}
