
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { Anagram } from '@/lib/types';
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
import {
  cleanStudioTermForWordGame,
  prepareStudioDefinitionPairs,
  shuffleArray,
} from '@/lib/studio-game-helpers';

function scrambleConceptWord(answerUpper: string): string {
    return answerUpper
        .split(' ')
        .map(word => {
            const chars = word.split('');
            if (chars.length <= 1) return word;
            let scrambled = word;
            let attempts = 0;
            while (scrambled === word && attempts < 20) {
                scrambled = shuffleArray(chars).join('');
                attempts++;
            }
            if (scrambled === word) {
                [chars[0], chars[chars.length - 1]] = [chars[chars.length - 1], chars[0]];
                scrambled = chars.join('');
            }
            return scrambled;
        })
        .join(' ');
}

export async function getConceptHuntAction({
    courseId,
    unitId,
    topicId
}: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
}): Promise<{ questions: Anagram[] | null; error?: string }> {
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
        const seenTerms = new Set<string>();
        const validItems: { term: string; definition: string }[] = [];

        for (const item of pairs) {
            const upperTerm = cleanStudioTermForWordGame(item.term, { removeSpaces: false, uppercase: true });
            const lettersOnly = upperTerm.replace(/\s+/g, '');

            if (
                lettersOnly.length >= 3 &&
                upperTerm.length <= 38 &&
                turkishAlphabetRegex.test(upperTerm) &&
                !seenTerms.has(upperTerm)
            ) {
                seenTerms.add(upperTerm);
                validItems.push({ term: upperTerm, definition: item.definition });
            }
        }

        if (validItems.length < 1) {
            return {
                error: "Kavram Avı oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı tanımı bulunan en az 1 uygun kavram bulunmalıdır.",
                questions: null,
            };
        }

        const anagramQuestions: Anagram[] = shuffleArray(validItems)
            .slice(0, 20)
            .map(item => ({
                definition: item.definition,
                scrambledWord: scrambleConceptWord(item.term),
                correctAnswer: item.term,
            }));

        return { questions: JSON.parse(JSON.stringify(anagramQuestions)) };

    } catch (error: any) {
        console.error("Server Action Error (getConceptHuntAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", questions: null };
    }
}

export async function submitConceptHuntScoreAction(
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
            where('gameType', '==', 'Kavram Avı'),
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
            gameType: 'Kavram Avı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitConceptHuntScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
