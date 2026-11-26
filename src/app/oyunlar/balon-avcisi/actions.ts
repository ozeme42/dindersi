'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { pickStudioDistractors, prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export type BalloonHunterQuestion = {
    q: string; // The definition
    a: string; // The correct term
    wrongs: string[]; // Distractor terms
};

export async function getBalloonHunterDataAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: BalloonHunterQuestion[]; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 35,
            cleanClue: true,
        });

        const distractorPool = [...new Set([...pairs.map(p => p.term), ...studio.concepts])];
        const gameQuestions: BalloonHunterQuestion[] = [];

        for (const item of pairs) {
            const wrongs = pickStudioDistractors(item.term, distractorPool, 4);
            if (wrongs.length === 0) continue;
            gameQuestions.push({
                q: item.definition,
                a: item.term,
                wrongs,
            });
        }

        if (pairs.length < 2 || gameQuestions.length < 2) {
            return {
                error: "Balon Avcısı oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
                questions: [],
            };
        }

        return { questions: JSON.parse(JSON.stringify(shuffleArray(gameQuestions))) };

    } catch (error: any) {
        console.error("Error getting Balloon Hunter data:", error);
        return { error: "Oyun verileri alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitBalloonHunterScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Balon Avcısı'),
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
            gameType: 'Balon Avcısı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Balloon Hunter score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
