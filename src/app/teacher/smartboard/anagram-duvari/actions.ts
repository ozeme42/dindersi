'use server';

import type { ActivityItem } from "@/lib/types";
import { getStaticQuestionsForGame } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type AnagramWallWord = string;

export async function getAnagramWallWords(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ words: AnagramWallWord[]; error?: string }> {
    noStore();
    try {
        const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;
        const validWords: string[] = [];

        for (const item of allItems || []) {
            if ('type' in item) {
                let term = '';
                if ((item.type === 'concept' || item.type === 'definition') && (item as any).content?.term) {
                    term = String((item as any).content.term).trim();
                } else if ((item.type === 'concept' || item.type === 'definition') && (item as any).content?.text) {
                    term = String((item as any).content.text).trim();
                } else if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb' || item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer) {
                    term = String((item as any).correctAnswer).trim();
                }

                if (term && term.length >= 3 && term.length <= 15 && !term.includes(' ') && turkishAlphabetRegex.test(term)) {
                    validWords.push(term.toLocaleUpperCase('tr-TR'));
                }
            }
        }

        const uniqueWords = [...new Set(validWords)];

        if (uniqueWords.length < 2) {
            return { error: "Anagram Duvarı oynamak için bu konuda en az 2 uygun kelime bulunmalıdır.", words: [] };
        }

        const shuffled = [...uniqueWords].sort(() => 0.5 - Math.random());
        return { words: JSON.parse(JSON.stringify(shuffled.slice(0, 30))) };

    } catch (error: any) {
        console.error("Error getting Anagram words:", error);
        return { error: "Veri alınırken hata oluştu.", words: [] };
    }
}