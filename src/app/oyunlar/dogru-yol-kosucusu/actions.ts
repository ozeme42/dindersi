
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { pickStudioDistractors, prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export type DogruYolQuestion = {
    q: string;
    correct: string;
    wrong: string;
}

export async function getDogruYolKosucusuAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: DogruYolQuestion[]; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ topicId: effectiveTopicId, courseId, unitId });
        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: true,
        });

        const distractorPool = [...new Set([...pairs.map(p => p.term), ...studio.concepts])];
        const gameQuestions: DogruYolQuestion[] = [];

        for (const item of pairs) {
            const wrong = pickStudioDistractors(item.term, distractorPool, 1)[0];
            if (!wrong) continue;
            gameQuestions.push({
                q: item.definition,
                correct: item.term,
                wrong,
            });
        }

        if (pairs.length < 2 || gameQuestions.length < 2) {
            return { error: "Bu oyun için Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım gereklidir.", questions: [] };
        }

        return { questions: JSON.parse(JSON.stringify(shuffleArray(gameQuestions).slice(0, 20))) };

    } catch (error: any) {
        console.error("Error getting Dogru Yol Kosucusu questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitDogruYolKosucusuScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', 'in', ['Doğru Kapı', 'Doğru Yol Koşucusu']),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
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
            gameType: 'Doğru Kapı',
            context: context,
            attemptNumber: attemptsSnapshot.data().count + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
