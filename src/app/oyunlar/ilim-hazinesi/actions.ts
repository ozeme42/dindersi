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
import { cleanForAnagram } from '@/lib/utils';
import { getRegisteredStudioItemsForGame } from '@/lib/quiz-actions';
import { prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export type IlimHazinesiLevel = {
    letters: string[];
    mainWord: string;
    info: string; // This will now hold the definition
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

// This function now fetches definitions and prepares levels based on them.
export async function getIlimHazinesiAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ levels: IlimHazinesiLevel[] | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 3,
            maxTermLength: 24,
            cleanClue: true,
        });

        const validItems: { term: string; definition: string }[] = [];
        const seenWords = new Set<string>();

        for (const p of pairs) {
            const cleaned = cleanForAnagram(p.term).replace(/\s/g, '');
            if (cleaned.length >= 3 && cleaned.length <= 16 && !seenWords.has(cleaned)) {
                seenWords.add(cleaned);
                validItems.push(p);
            }
        }

        if (validItems.length === 0) {
            return { error: "İlim Hazinesi oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı tanımı olan en az 1 uygun kavram bulunmalıdır.", levels: null };
        }

        const shuffled = shuffleArray(validItems);
        const gameLevels: IlimHazinesiLevel[] = shuffled.slice(0, 20).map(item => {
            const mainWord = cleanForAnagram(item.term);
            const letters = shuffleArray(mainWord.replace(/\s/g, '').split(''));
            return {
                mainWord,
                info: item.definition,
                letters,
            };
        });

        return { levels: JSON.parse(JSON.stringify(gameLevels)) };

    } catch (error: any) {
        console.error("Server Action Error (getIlimHazinesiAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", levels: null };
    }
}

export async function submitIlimHazinesiScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'İlim Hazinesi'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= MAX_ATTEMPTS_PER_CONTEXT) {
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
            gameType: 'İlim Hazinesi',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Ilim Hazinesi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
