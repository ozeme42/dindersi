'use server';

import { unstable_noStore as noStore } from 'next/cache';
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

export interface BombQuestion {
    id: string;
    definition: string;
    options: string[];
    correctAnswer: string;
    hint?: string;
}

export async function getSaatliBombaQuestionsAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string; unitId?: string; }
): Promise<{ questions: BombQuestion[] | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 38,
            cleanClue: true,
        });

        const distractorPool = [...new Set([...pairs.map(p => p.term), ...studio.concepts])];
        const validPairs = pairs.filter(p => pickStudioDistractors(p.term, distractorPool, 3).length >= 1);

        if (validPairs.length < 2) {
            return {
                error: "Saatli Bomba oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
                questions: null,
            };
        }

        // 4 ila 6 kavram seçerek 3 tekrar dalgasında toplam tur sayısını ideal tut
        const selectedPairs = shuffleArray(validPairs).slice(0, Math.min(validPairs.length, 6));
        const targetRounds = 3;
        const tripleDeck: BombQuestion[] = [];

        for (let wave = 0; wave < targetRounds; wave++) {
            const waveItems = shuffleArray(selectedPairs);

            for (let i = 0; i < waveItems.length; i++) {
                const item = waveItems[i];
                const distractors = pickStudioDistractors(item.term, distractorPool, 3);
                if (distractors.length === 0) continue;

                tripleDeck.push({
                    id: `bomb-w${wave + 1}-${i + 1}-${item.term}`,
                    definition: item.definition,
                    options: shuffleArray([item.term, ...distractors]),
                    correctAnswer: item.term,
                });
            }
        }

        if (tripleDeck.length === 0) {
            return {
                error: "Saatli Bomba için yeterli kavram verisi bulunamadı.",
                questions: null,
            };
        }

        return { questions: JSON.parse(JSON.stringify(tripleDeck)) };

    } catch (error: any) {
        console.error("Error getting Saatli Bomba questions:", error);
        return { error: "Sorular yüklenirken bir sorun oluştu.", questions: null };
    }
}

export async function submitSaatliBombaScoreAction(
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
            where('gameType', '==', 'Saatli Bomba'),
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
            gameType: 'Saatli Bomba',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Saatli Bomba score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
