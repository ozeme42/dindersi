
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question, GetQuizInput, GetQuizOutput } from "@/lib/types";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

// Centralized function to fetch questions
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 10, difficulty, questionTypes } = params;

    try {
        let allQuestions: Question[] = [];

        if (isStaticBuild && topicId && topicId !== 'all') {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/curriculum/questions/${topicId}.json`);
            if (res.ok) {
                allQuestions = await res.json();
            } else if (res.status !== 404) { // Don't throw for 404, just return empty
                throw new Error(`Static question data for topic ${topicId} not found or failed to load.`);
            }
        } else if (!isStaticBuild) {
            let conditions = [];
            if (topicId && topicId !== 'all') {
                conditions.push(where("topicId", "==", topicId));
            } else if (unitId && unitId !== 'all') {
                conditions.push(where("unitId", "==", unitId));
            } else if (courseId && courseId !== 'all') {
                conditions.push(where("courseId", "==", courseId));
            }

            const questionsRef = collection(db, "questions");
            const finalQuery = conditions.length > 0 ? query(questionsRef, ...conditions) : query(questionsRef, firestoreLimit(100)); // Limit open queries
            
            const querySnapshot = await getDocs(finalQuery);
            allQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        }

        // Apply client-side filtering after fetching
        if (difficulty && difficulty.length > 0) {
            allQuestions = allQuestions.filter(q => difficulty.includes(q.difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            allQuestions = allQuestions.filter(q => mappedTypes.includes(q.type));
        }

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);
        
        const questionsWithShuffledOptions = selectedQuestions.map(question => {
            const standardizedQuestion: Question = {
                ...question,
                text: question.text || (question as any).statement || '',
                options: question.options || (question.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : []),
                correctAnswer: question.correctAnswer || (question.type === 'Doğru/Yanlış' ? (question.isTrue ? 'Doğru' : 'Yanlış') : '')
            };
            if ((standardizedQuestion.type === 'Çoktan Seçmeli' || standardizedQuestion.type === 'Boşluk Doldurma') && standardizedQuestion.options) {
                standardizedQuestion.options = [...standardizedQuestion.options].sort(() => Math.random() - 0.5);
            }
            return standardizedQuestion;
        });

        if (questionsWithShuffledOptions.length === 0) {
            return { questions: [], error: "Belirtilen kriterlere uygun soru bulunamadı." };
        }

        return { questions: JSON.parse(JSON.stringify(questionsWithShuffledOptions)) };

    } catch (e: any) {
        console.error("Error fetching questions:", e);
        if (e.code === 'failed-precondition') {
            return { questions: [], error: `Veritabanı indeksi eksik. Geliştirici konsolundaki linki kullanarak indeksi oluşturun. Hata: ${e.message}` };
        }
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}
