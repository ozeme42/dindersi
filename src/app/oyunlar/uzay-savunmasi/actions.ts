"use server";
import { getQuestionsFromBank, getStaticGameData } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from "next/cache";
import type { Question } from "@/lib/types";

export async function getSpaceDefenseQuestions(params: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    questionCount?: number;
    questionTypes?: string[];
}) {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId: params.courseId,
            unitId: params.unitId,
            topicId: params.topicId,
            questionCount: params.questionCount || 50,
            questionTypes: params.questionTypes || ['Çoktan Seçmeli', 'Doğru/Yanlış', 'mcq', 'tf']
        });

        let questions = (result.questions || []) as Question[];

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
                            id: `space-tf-${idx}-${Date.now()}`,
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
            return { questions: [], error: "Bu konu için yeterli soru bulunamadı (En az 2 soru gereklidir)." };
        }

        return { questions: JSON.parse(JSON.stringify(questions)) };
    } catch (e: any) {
        return { questions: [], error: e.message || "Hata oluştu" };
    }
}
