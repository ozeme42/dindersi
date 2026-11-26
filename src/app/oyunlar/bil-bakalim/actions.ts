'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';
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
import { prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export async function getBilBakalimAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanTermForTyping: true,
            cleanClue: true,
        });

        if (pairs.length < 2) {
            return {
                questions: [],
                error: "Bil Bakalım oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram tanımı bulunmalıdır.",
            };
        }

        const validDefinitions: Partial<Question>[] = pairs.map((p, idx) => ({
            id: `def-${effectiveTopicId || unitId || 'studio'}-${idx}`,
            text: p.definition,
            type: 'Bil Bakalım',
            correctAnswer: p.term,
            difficulty: 'Orta',
        }));

        const shuffled = shuffleArray(validDefinitions);
        // Wordwall "Find the Match" için ideal soru sayısı: 8 ila 12 arası
        return { questions: JSON.parse(JSON.stringify(shuffled.slice(0, 12))) };

    } catch (error: any) {
        console.error("Error getting Bil Bakalım questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitBilBakalimScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Bil Bakalım'),
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
            gameType: 'Bil Bakalım',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Bil Bakalım score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
