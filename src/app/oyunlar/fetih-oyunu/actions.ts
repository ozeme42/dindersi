
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question } from "@/lib/types";

// This is a simplified version for now. 
// A more robust solution might use getQuestionsFromBank from quiz-actions.
export async function getFetihGameQuestions(
    { courseId, unitId, topicId, questionCount }: { courseId?: string; unitId?: string; topicId?: string; questionCount: number }
): Promise<{ questions: Question[], error?: string }> {
    try {
        let q: Query = collection(db, "questions");
        
        // Apply filters directly
        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        } else {
             // If no specific filters are applied, limit the query to avoid fetching the entire collection
            q = query(q, firestoreLimit(100)); 
        }
        
        const querySnapshot = await getDocs(q);
        
        let allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const question: Question = {
                id: doc.id,
                text: data.text || data.statement || '',
                type: data.type,
                options: data.options || [],
                correctAnswer: data.correctAnswer || (data.isTrue ? 'Doğru' : 'Yanlış'),
                difficulty: data.difficulty || 'Orta',
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
        console.error("Error fetching questions for Fetih Game:", error);
        if (error.code === 'failed-precondition') {
            return { error: `Veritabanı indeksi eksik veya oluşturuluyor. Lütfen birkaç dakika sonra tekrar deneyin. Hata: ${error.message}`, questions: [] };
        }
        return { error: 'Sorular alınırken bir hata oluştu.', questions: [] };
    }
}
