
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
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
import { prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export type ScrambledSentenceData = {
    correctSentence: string;
};

export async function getCumleOlusturmaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ data: ScrambledSentenceData[] | null; error?: string }> {
    noStore();
    try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
            ? topicId
            : undefined;

        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const extractedSentences: string[] = [];

        for (const rawSentence of studio.sentences) {
            const txt = String(rawSentence || '').trim();
            if (txt.split(/\s+/).length >= 3 && txt.length <= 160) {
                extractedSentences.push(txt);
            }
        }

        const pairs = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
            minTermLength: 2,
            maxTermLength: 40,
            cleanClue: false,
        });
        for (const p of pairs) {
            const s = `${p.term}, ${p.definition}`;
            if (s.split(/\s+/).length >= 3 && s.length <= 150) {
                extractedSentences.push(s);
            }
        }

        const uniqueSentences = [...new Set(extractedSentences)];

        if (uniqueSentences.length < 1) {
            return { error: "Cümle Oluşturma oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı uygun cümle veya tanım bulunamadı.", data: null };
        }

        const gameData: ScrambledSentenceData[] = shuffleArray(uniqueSentences)
            .slice(0, 15)
            .map(sentence => ({
                correctSentence: sentence.trim(),
            }));

        return { data: JSON.parse(JSON.stringify(gameData)) };

    } catch (error: any) {
        console.error("Server Action Error (getCumleOlusturmaAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", data: null };
    }
}

export async function submitCumleOlusturmaScoreAction(
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
            where('gameType', '==', 'Cümle Oluşturma'),
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
            gameType: 'Cümle Oluşturma',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitCumleOlusturmaScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
