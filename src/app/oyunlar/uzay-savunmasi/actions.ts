"use server";
import { getQuestionsFromBank } from "@/lib/quiz-actions";

export async function getSpaceDefenseQuestions(params: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    questionCount?: number;
    questionTypes?: string[];
}) {
    return getQuestionsFromBank({
        courseId: params.courseId,
        unitId: params.unitId,
        topicId: params.topicId,
        questionCount: params.questionCount || 50,
        questionTypes: params.questionTypes || ['Çoktan Seçmeli', 'Doğru/Yanlış']
    });
}
