'use server';

import type { ActivityItem } from "@/lib/types";
import { getStaticQuestionsForGame } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type AnagramWallWord = string;

const DEFAULT_ANAGRAM_WORDS: string[] = [
    'ZEKÂT', 'SADAKA', 'NAMAZ', 'ORUÇ', 'HAC', 'KÂBE', 'FATİHA', 'İHLAS', 
    'MEKKE', 'MEDİNE', 'PEYGAMBER', 'MÜMİN', 'SEVAP', 'GÜNAH', 'CENNET', 
    'TEVHİD', 'ADALET', 'SABIR', 'MERHAMET', 'ŞÜKÜR', 'ABDEST', 'EZAN', 
    'CAMİ', 'HİCRET', 'KANDİL', 'RAMAZAN', 'KURAN', 'AYET', 'SÜNNET', 'İMAN'
];

export async function getAnagramWallWords(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ words: AnagramWallWord[]; error?: string }> {
    noStore();
    try {
        const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
        const turkishAlphabetRegex = /^[A-ZÇĞİÖŞÜ]+( [A-ZÇĞİÖŞÜ]+)*$/;
        const validWords: string[] = [];

        const cleanWord = (raw: string) => {
            return raw
                .replace(/^Hz[\.\s]*/i, '')
                .replace(/\s*\([^)]*\)/g, '')
                .replace(/\s*\[[^\]]*\]/g, '')
                .replace(/[âÂ]/g, 'A')
                .replace(/[îÎ]/g, 'İ')
                .replace(/[ûÛ]/g, 'U')
                .replace(/['’\-.]/g, ' ')
                .replace(/\s+/g, ' ')
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
                    const upper = cleaned.toLocaleUpperCase('tr-TR');
                    const lettersOnly = upper.replace(/\s+/g, '');
                    const wordCount = upper.split(' ').length;

                    // 1 veya 2 kelimelik kavramlar (Asla Ebu / Talib gibi bölünmez, bütün olarak korunur)
                    if (
                        lettersOnly.length >= 3 && 
                        lettersOnly.length <= 18 && 
                        wordCount <= 2 && 
                        turkishAlphabetRegex.test(upper)
                    ) {
                        validWords.push(upper);
                    }
                }
            }
        }

        let uniqueWords = [...new Set(validWords)];

        if (uniqueWords.length < 5) {
            uniqueWords = [...new Set([...uniqueWords, ...DEFAULT_ANAGRAM_WORDS])];
        }

        const shuffled = [...uniqueWords].sort(() => 0.5 - Math.random());
        return { words: JSON.parse(JSON.stringify(shuffled.slice(0, 30))) };

    } catch (error: any) {
        console.error("Error getting Anagram words:", error);
        return { error: "Veri alınırken hata oluştu.", words: [] };
    }
}
