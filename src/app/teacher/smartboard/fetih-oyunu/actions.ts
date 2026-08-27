
'use server';

import type { Question } from "@/lib/types";
import { getQuestionsFromBank, getStaticGameData } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export async function getFetihGameQuestions(
    { courseId, unitId, topicId, questionCount = 20 }: { courseId?: string; unitId?: string; topicId?: string; questionCount: number }
): Promise<{ questions: Question[], error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionTypes: ['mcq', 'tf', 'Çoktan Seçmeli', 'Doğru/Yanlış'],
            questionCount: Math.max(questionCount, 30)
        });

        let questions = (result.questions || []) as Question[];

        if (questions.length < questionCount) {
            try {
                const allItems = await getStaticGameData({ courseId, unitId, topicId });
                const definitions = allItems.filter(it => 'type' in it && it.type === 'definition' && (it as any).content?.term && (it as any).content?.definition);
                
                definitions.forEach((dItem, idx) => {
                    const term = (dItem as any).content.term.trim();
                    const def = (dItem as any).content.definition.trim();
                    const isTrue = idx % 2 === 0;
                    let statement = `${term}, ${def}`;
                    if (!isTrue && definitions.length > 1) {
                        const wrongTerm = (definitions[(idx + 1) % definitions.length] as any).content.term.trim();
                        statement = `${wrongTerm}, ${def}`;
                    }
                    if (!questions.some(q => q.text === statement)) {
                        questions.push({
                            id: `fetih-gen-${idx}-${Date.now()}`,
                            type: 'Doğru/Yanlış',
                            text: statement,
                            correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
                            options: ['Doğru', 'Yanlış'],
                            difficulty: 'Orta',
                            topicId: topicId || ''
                        } as any);
                    }
                });
            } catch (fallbackErr) {}
        }

        if (questions.length < 2) {
            return { error: `Bu konu için yeterli soru bulunamadı (En az 2 soru gereklidir).`, questions: [] };
        }

        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);

        return { questions: JSON.parse(JSON.stringify(selectedQuestions)) };

    } catch (error: any) {
        console.error("Error fetching questions for Fetih Game:", error);
        return { error: 'Sorular alınırken bir hata oluştu.', questions: [] };
    }
}
