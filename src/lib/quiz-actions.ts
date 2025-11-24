
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question, GetQuizInput, GetQuizOutput } from "@/lib/types";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

// Helper function to shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Centralized function to fetch questions
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 10, difficulty, questionTypes } = params;

    try {
        let conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }

        if (difficulty && difficulty.length > 0) {
            conditions.push(where("difficulty", "in", difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            conditions.push(where("type", "in", mappedTypes));
        }

        const questionsRef = collection(db, "questions");
        const finalQuery = conditions.length > 0 ? query(questionsRef, ...conditions) : query(questionsRef);
        
        const querySnapshot = await getDocs(finalQuery);
        
        let allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // This is the critical part: ensure the output format is consistent
            // for the QuestionDialog component.
            const question: Question = {
                id: doc.id,
                text: data.text || data.statement || data.sentenceWithBlank || '',
                type: data.type,
                options: data.options || (data.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : []),
                correctAnswer: data.correctAnswer, // Keep original correctAnswer for now
                difficulty: data.difficulty || 'Orta',
                isTrue: data.isTrue, // Keep original isTrue
                // Context fields
                courseId: data.courseId,
                unitId: data.unitId,
                topicId: data.topicId,
                topic: data.topic,
                classId: data.classId,
                className: data.className,
            };
            
            // Standardize correct answer for True/False questions
            if (question.type === 'Doğru/Yanlış') {
                if (typeof question.correctAnswer !== 'string') {
                    question.correctAnswer = data.isTrue ? "Doğru" : "Yanlış";
                }
                question.isTrue = question.correctAnswer === 'Doğru';
            } else {
                question.correctAnswer = data.correctAnswer || '';
            }

            return question;
        });
        
        // Shuffle and limit
        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        let selectedQuestions = shuffled.slice(0, questionCount);
        
        if (selectedQuestions.length === 0) {
            return { questions: [], error: "Belirtilen kriterlere uygun soru bulunamadı." };
        }

        // Shuffle options for MCQ and FITB questions
        selectedQuestions = selectedQuestions.map(q => {
            if ((q.type === 'Çoktan Seçmeli' || q.type === 'Boşluk Doldurma') && q.options) {
                return { ...q, options: shuffleArray(q.options) };
            }
            return q;
        });

        return { questions: JSON.parse(JSON.stringify(selectedQuestions)) };

    } catch (e: any) {
        console.error("Error fetching questions:", e);
        if (e.code === 'failed-precondition') {
            return { questions: [], error: `Veritabanı indeksi eksik. Geliştirici konsolundaki linki kullanarak indeksi oluşturun. Hata: ${e.message}` };
        }
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}
