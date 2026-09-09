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

        const cleanWord = (raw: string) => {
            return raw
                .replace(/[âÂ]/g, 'A')
                .replace(/[îÎ]/g, 'İ')
                .replace(/[ûÛ]/g, 'U')
                .replace(/['’\-]/g, '')
                .trim();
        };

        for (const item of allItems || []) {
            if ('type' in item) {
                let term = '';
                if ((item.type === 'definition') && (item as any).content?.term && (item as any).content?.definition) {
                    term = String((item as any).content.term).trim();
                } else if (item.type === 'concept' && ((item as any).content?.term || (item as any).content?.text) && ((item as any).content?.definition || (item as any).content?.meaning)) {
                    term = String((item as any).content?.term || (item as any).content?.text).trim();
                }

                if (term) {
                    const cleaned = cleanWord(term);
                    const noSpace = cleaned.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
                    if (noSpace.length >= 3 && noSpace.length <= 15 && turkishAlphabetRegex.test(noSpace)) {
                        validWords.push(noSpace);
                    }
                    const parts = cleaned.split(/\s+/);
                    if (parts.length === 2) {
                        for (const part of parts) {
                            const upperPart = part.toLocaleUpperCase('tr-TR');
                            if (upperPart.length >= 3 && upperPart.length <= 15 && turkishAlphabetRegex.test(upperPart)) {
                                validWords.push(upperPart);
                            }
                        }
                    }
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