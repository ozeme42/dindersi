
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
import type { ActivityItem } from '@/lib/types';
import { cleanForAnagram } from '@/lib/utils';

import { getStaticQuestionsForGame } from "@/lib/quiz-actions";

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
        const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
        
        const validItems: { term: string; definition: string }[] = [];
        const seenWords = new Set<string>();

        for (const item of allItems || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition || (item as any).content.text || `${t} kavramı`).trim();
                    const cleaned = cleanForAnagram(t).replace(/\s/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 14 && !seenWords.has(cleaned)) {
                        seenWords.add(cleaned);
                        validItems.push({ term: t, definition: d });
                    }
                } else if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb' || item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer) {
                    const t = String((item as any).correctAnswer).trim();
                    const d = String((item as any).text || (item as any).question || (item as any).sentenceWithBlank || `${t} kavramı`).trim();
                    const cleaned = cleanForAnagram(t).replace(/\s/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 14 && !seenWords.has(cleaned)) {
                        seenWords.add(cleaned);
                        validItems.push({ term: t, definition: d });
                    }
                }
            }
        }

        if (validItems.length === 0) {
            return { error: "İlim Hazinesi oynamak için bu konuda en az 1 adet tanımı olan kavram bulunmalıdır.", levels: null };
        }
        
        const shuffled = [...validItems].sort(() => 0.5 - Math.random());
        
        const gameLevels: IlimHazinesiLevel[] = [];

        for (const item of shuffled) {
            const mainWord = cleanForAnagram(item.term);
            const definition = item.definition;
            
            // The letters will only be from the main word itself.
            const letters = mainWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5);
            
            gameLevels.push({
                mainWord,
                info: definition,
                letters,
            });
        }
        
        return { levels: JSON.parse(JSON.stringify(gameLevels.slice(0, 20))) };

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
