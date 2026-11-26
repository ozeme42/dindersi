'use server';

import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs,
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { pickStudioDistractors, prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export type HitTheTargetRound = {
    definition: string;
    target: string;
    words: string[];
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

export async function getHitTheTargetAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: HitTheTargetRound[] | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all') ? topicId : undefined;

        const studio = await getRegisteredStudioItemsForGame({
            courseId,
            unitId,
            topicId: effectiveTopicId,
        });

        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 35,
            cleanClue: true,
        });

        const distractorPool = [...new Set([...pairs.map(p => p.term), ...studio.concepts])];
        const shuffled = shuffleArray(pairs);
        const rounds: HitTheTargetRound[] = [];

        for (const targetDef of shuffled) {
            const decoys = pickStudioDistractors(targetDef.term, distractorPool, 3);
            if (decoys.length === 0) continue;

            rounds.push({
                definition: targetDef.definition,
                target: targetDef.term,
                words: shuffleArray([targetDef.term, ...decoys]),
            });
        }

        if (pairs.length < 2 || rounds.length < 2) {
            return { error: "Hedefi Vur oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.", data: null };
        }

        const finalRounds = rounds.slice(0, 10);

        return { data: JSON.parse(JSON.stringify(finalRounds)) };

    } catch (error: any) {
        console.error("Server Action Error (getHitTheTargetAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", data: null };
    }
}

export async function submitHitTheTargetScoreAction(
    userId: string | null,
    score: number,
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) return { success: true };

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', 'in', ['Hedefi Vur', 'hedefi-vur']),
            where('context', '==', context)
        );

        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= MAX_ATTEMPTS_PER_CONTEXT) {
            return {
                success: false,
                error: `Bu etkinlikten daha fazla puan kazanamazsınız. Lütfen farklı bir konu seçin.`
            };
        }

        const batch = writeBatch(db);

        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Hedefi Vur',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitHitTheTargetScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
