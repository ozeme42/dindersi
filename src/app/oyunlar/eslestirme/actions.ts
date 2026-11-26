
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { db } from "@/lib/firebase";
import {
  increment,
  collection,
  serverTimestamp,
  writeBatch,
  query,
  where,
  getCountFromServer,
  doc,
} from 'firebase/firestore';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export type MatchingPair = {
    id: string;
    type: 'term' | 'definition';
    content: string;
    pairId: string;
};

export async function getEslestirmeAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ pairs: MatchingPair[] | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({
            courseId,
            unitId,
            topicId: effectiveTopicId,
        });

        const uniquePairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: true,
        });

        if (uniquePairs.length < 2) {
            return {
                error: "Eşleştirme oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
                pairs: null,
            };
        }

        const selectedItems = shuffleArray(uniquePairs).slice(0, 20);
        const gamePairs: MatchingPair[] = [];
        selectedItems.forEach((item, index) => {
            const pairId = `pair-${index}`;
            gamePairs.push({ id: `term-${index}`, type: 'term', content: item.term, pairId });
            gamePairs.push({ id: `def-${index}`, type: 'definition', content: item.definition, pairId });
        });

        return { pairs: JSON.parse(JSON.stringify(shuffleArray(gamePairs))) };

    } catch (error: any) {
        console.error("Server Action Error (getEslestirmeAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", pairs: null };
    }
}

export async function submitEslestirmeScoreAction(
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
            where('gameType', '==', 'Eşleştirme'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;
        
        if (attemptCount >= 10) {
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
            gameType: 'Eşleştirme',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitEslestirmeScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
