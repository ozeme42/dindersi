
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, and, limit as firestoreLimit } from "firebase/firestore";
import type { Question } from "@/lib/types";

// This is a simplified version for now. 
// A more robust solution might use getQuestionsFromBank from quiz-actions.
export async function getTornadoGameQuestions(params: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    questionCount: number;
}): Promise<{ questions: Question[], error?: string }> {
    const { courseId, unitId, topicId, questionCount } = params;
    try {
        let q: Query = collection(db, "questions");
        
        const conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }

        if (conditions.length > 0) {
            q = query(q, and(...conditions));
        }
        
        const querySnapshot = await getDocs(q);
        
        let allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // This is the critical part: ensure the output format is consistent
            // for the QuestionDialog component.
            const question: Question = {
                id: doc.id,
                text: data.text || data.statement || data.sentenceWithBlank || '',
                type: data.type,
                options: data.options || (data.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : []),
                correctAnswer: data.correctAnswer || (data.isTrue ? 'Doğru' : 'Yanlış'),
                difficulty: data.difficulty || 'Orta',
                isTrue: data.isTrue,
                // Context fields
                courseId: data.courseId,
                unitId: data.unitId,
                topicId: data.topicId,
                topic: data.topic,
            };
            return question;
        });

        if (allQuestions.length < questionCount) {
            return { error: `Bu kriterlere uygun yeterli soru bulunamadı. Gerekli: ${questionCount}, Bulunan: ${allQuestions.length}.`, questions: [] };
        }

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);

        return { questions: JSON.parse(JSON.stringify(selectedQuestions)) };

    } catch (error: any) {
        console.error("Error fetching questions for Tornado Game:", error);
        if (error.code === 'failed-precondition') {
            return { error: `Veritabanı indeksi eksik veya oluşturuluyor. Lütfen birkaç dakika sonra tekrar deneyin. Hata: ${error.message}`, questions: [] };
        }
        return { error: 'Sorular alınırken bir hata oluştu.', questions: [] };
    }
}
