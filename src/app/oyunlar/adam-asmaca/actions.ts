'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { db } from "@/lib/firebase";
import {
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import {
  cleanStudioTermForWordGame,
  prepareStudioDefinitionPairs,
  shuffleArray,
} from '@/lib/studio-game-helpers';

export type HangmanData = {
    word: string;
    hint: string;
};

export async function getAdamAsmacaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ data: HangmanData[] | null; error?: string }> {
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

        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 3,
            maxTermLength: 38,
            cleanTermForTyping: false,
            cleanClue: true,
        });

        const turkishAlphabetRegex = /^[A-ZÇĞİÖŞÜ]+( [A-ZÇĞİÖŞÜ]+)*$/;
        const validWords: HangmanData[] = [];
        const seenWords = new Set<string>();

        for (const pair of pairs) {
            const upperTerm = cleanStudioTermForWordGame(pair.term, { removeSpaces: false, uppercase: true });
            const lettersOnly = upperTerm.replace(/\s+/g, '');

            if (
                lettersOnly.length >= 3 &&
                upperTerm.length <= 38 &&
                turkishAlphabetRegex.test(upperTerm) &&
                !seenWords.has(upperTerm)
            ) {
                seenWords.add(upperTerm);
                validWords.push({ word: upperTerm, hint: pair.definition });
            }
        }

        if (validWords.length < 2) {
            return {
                error: "Adam Asmaca oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram tanımı bulunmalıdır.",
                data: null,
            };
        }

        const shuffled = shuffleArray(validWords);
        return { data: JSON.parse(JSON.stringify(shuffled.slice(0, 15))) };

    } catch (error: any) {
        console.error("Server Action Error (getAdamAsmacaAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", data: null };
    }
}

export async function submitAdamAsmacaScoreAction(
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
            where('gameType', '==', 'Adam Asmaca'),
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
            gameType: 'Adam Asmaca',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Adam Asmaca score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
