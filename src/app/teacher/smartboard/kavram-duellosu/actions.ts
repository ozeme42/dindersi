'use server';

import type { ActivityItem } from "@/lib/types";
import { getStaticQuestionsForGame } from "@/lib/quiz-actions";
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
        const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
        
        const pairs: { term: string; definition: string }[] = [];
        const fallbackPool = ['İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 'Adalet', 'Merhamet', 'Sabır', 'Şükür', 'İhlas', 'Takva', 'Furkan'];

        for (const item of allItems || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term && (item as any).content?.definition) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition).trim();
                    if (t.length >= 2 && t.length <= 30) pairs.push({ term: t, definition: d });
                } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).text || (item as any).question)) {
                    const t = String((item as any).correctAnswer).trim();
                    const d = String((item as any).text || (item as any).question).trim();
                    if (t.length >= 2 && t.length <= 30) pairs.push({ term: t, definition: d });
                }
            }
        }

        if (pairs.length < 1) {
            return { error: "Bu oyun için en az 1 tanım/soru gereklidir.", questions: [] };
        }

        const allTerms = [...new Set([...pairs.map(p => p.term), ...fallbackPool])];
        
        const gameQuestions: KavramDuellosuQuestion[] = pairs.map(item => {
            const correctAnswer = item.term;
            const distractors = allTerms
                .filter(term => term.toLocaleLowerCase('tr-TR') !== correctAnswer.toLocaleLowerCase('tr-TR'))
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

            return {
                q: item.definition,
                a: correctAnswer,
                options: options,
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions.sort(() => 0.5 - Math.random()))) };
    } catch (error: any) {
        console.error("Error getting Kavram Düellosu data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
