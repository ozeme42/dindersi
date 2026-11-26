'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment,
} from 'firebase/firestore';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { pickStudioDistractors, prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';


export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

export async function getConceptQuizAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string; unitId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const uniquePairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: true,
        });

        const distractorPool = [...new Set([...uniquePairs.map(p => p.term), ...studio.concepts])];
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of uniquePairs) {
            const selectedDistractors = pickStudioDistractors(item.term, distractorPool, 3);
            if (selectedDistractors.length === 0) continue;

            gameQuestions.push({
                definition: item.definition,
                options: shuffleArray([item.term, ...selectedDistractors]),
                correctAnswer: item.term,
            });
        }

        if (uniquePairs.length < 2 || gameQuestions.length < 2) {
            return {
                error: "Kavram Yarışması için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
                questions: null,
            };
        }

        return { questions: JSON.parse(JSON.stringify(shuffleArray(gameQuestions))) };

    } catch (error: any) {
        console.error("Error getting Kavram Yarışması questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: null };
    }
}

export async function submitConceptQuizScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kavram Yarışması'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Kavram Yarışması',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Kavram Yarışması score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
