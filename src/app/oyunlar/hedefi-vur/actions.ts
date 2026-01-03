
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
import { getStaticQuestionsForGame } from "@/lib/quiz-actions";


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
        const allItems: ActivityItem[] = await getStaticQuestionsForGame({
            courseId,
            unitId,
            topicId,
            dataType: 'activities'
        });

        const allDefinitions = allItems
             .filter(item => 
                item.type === 'definition' &&
                item.content &&
                item.content.term && 
                item.content.definition &&
                item.content.term.trim().length > 2 &&
                !item.content.term.includes(' ')
            );

        if (allDefinitions.length < 5) {
            return { error: "Hedefi Vur oynamak için bu konuda en az 5 adet uygun tanım (tek kelimelik kavramlar) bulunmalıdır.", data: null };
        }
        
        const shuffled = [...allDefinitions].sort(() => 0.5 - Math.random());
        const rounds: HitTheTargetRound[] = [];

        for (const targetDef of shuffled) {
            const targetWord = targetDef.content.term!;
            const definition = targetDef.content.definition!;
            
            const otherWords = allDefinitions
                .filter(d => d.content.term !== targetWord)
                .map(d => d.content.term!);
            
            const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());
            const decoys = shuffledOthers.slice(0, 4);

            const wordsForRound = [targetWord, ...decoys].sort(() => 0.5 - Math.random());

            rounds.push({
                definition: definition,
                target: targetWord,
                words: wordsForRound,
            });
        }
        
        const finalRounds = rounds.slice(0, 10); // Limit to 10 rounds per game

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
            where('gameType', '==', 'Hedefi Vur'),
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
