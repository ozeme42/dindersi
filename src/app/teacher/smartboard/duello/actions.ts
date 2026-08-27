
'use server';

import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank, getStaticGameData } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export async function getClimbingDuelQuestions(params: GetQuizInput): Promise<{ questions: Question[], error?: string }> {
    noStore();
    try {
        const questionResult = await getQuestionsFromBank({
            ...params,
            questionTypes: params.questionTypes || ['mcq', 'tf', 'Çoktan Seçmeli', 'Doğru/Yanlış'],
            questionCount: params.questionCount || 30
        });

        let questions = (questionResult.questions || []) as Question[];

        if (questions.length < 3) {
            try {
                const allItems = await getStaticGameData({ courseId: params.courseId, unitId: params.unitId, topicId: params.topicId });
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
                            id: `duello-gen-${idx}-${Date.now()}`,
                            type: 'Doğru/Yanlış',
                            text: statement,
                            correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
                            options: ['Doğru', 'Yanlış'],
                            difficulty: 'Orta',
                            topicId: params.topicId || ''
                        } as any);
                    }
                });
            } catch (fallbackErr) {}
        }

        if (questions.length < 2) {
            return { questions: [], error: "Bu konu için yarışmaya uygun soru bulunamadı (En az 2 soru gereklidir)." };
        }
        
        const shuffledQuestions = [...questions].sort(() => 0.5 - Math.random());

        const finalQuestions = shuffledQuestions.map(q => {
            if (q.type === 'Çoktan Seçmeli' && q.options) {
                return { ...q, options: [...q.options].sort(() => 0.5 - Math.random()) };
            }
            return q;
        });

        return { questions: JSON.parse(JSON.stringify(finalQuestions)) };

    } catch (error: any) {
        console.error("Error fetching questions for Climbing Duel:", error);
        return { questions: [], error: "Sorular alınırken bir hata oluştu." };
    }
}
