
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank } from "@/lib/quiz-actions";

// This action now simply fetches questions for the climbing race.
// It will be called by the game client page.
export async function getClimbingDuelQuestions(params: GetQuizInput): Promise<{ questions: Question[], error?: string }> {
    try {
        const questionResult = await getQuestionsFromBank(params);

        if (questionResult.error) {
            throw new Error(questionResult.error);
        }

        if (!questionResult.questions || questionResult.questions.length === 0) {
            return { questions: [], error: "Bu konu için yarışmaya uygun soru bulunamadı." };
        }
        
        // Ensure questions are shuffled for randomness in the game
        const shuffledQuestions = [...questionResult.questions].sort(() => 0.5 - Math.random());

        // Shuffle options for each multiple-choice question
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
