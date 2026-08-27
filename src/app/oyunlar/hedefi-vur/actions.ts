
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
        const allItems = await getStaticQuestionsForGame({
            courseId,
            unitId,
            topicId,
            dataType: 'all'
        });

        const pairs: { term: string; definition: string }[] = [];
        const fallbackTerms = ['İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 'Adalet', 'Merhamet', 'Sabır', 'Şükür', 'İhlas', 'Takva', 'Furkan'];

        for (const item of allItems || []) {
            if ('type' in item) {
                if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition).trim();
                    if (t.length >= 2 && t.length <= 30) {
                        pairs.push({ term: t, definition: d });
                    }
                } else if (item.type === 'concept' && (item as any).content?.term && (item as any).content?.definition) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition).trim();
                    if (t.length >= 2 && t.length <= 30) {
                        pairs.push({ term: t, definition: d });
                    }
                } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).text || (item as any).question)) {
                    const t = String((item as any).correctAnswer).trim();
                    const d = String((item as any).text || (item as any).question).trim();
                    if (t.length >= 2 && t.length <= 30) {
                        pairs.push({ term: t, definition: d });
                    }
                }
            }
        }

        if (pairs.length < 2) {
            return { error: "Hedefi Vur oynamak için bu konuda en az 2 adet uygun kavram/tanım bulunmalıdır.", data: null };
        }
        
        const allTargetWords = [...new Set([...pairs.map(p => p.term), ...fallbackTerms])];
        const shuffled = [...pairs].sort(() => 0.5 - Math.random());
        const rounds: HitTheTargetRound[] = [];

        for (const targetDef of shuffled) {
            const targetWord = targetDef.term;
            const definition = targetDef.definition;
            
            const otherWords = allTargetWords
                .filter(w => w.toLocaleLowerCase('tr-TR') !== targetWord.toLocaleLowerCase('tr-TR'));
            
            const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());
            const decoys = shuffledOthers.slice(0, 4);

            const wordsForRound = [targetWord, ...decoys].sort(() => 0.5 - Math.random());

            rounds.push({
                definition: definition,
                target: targetWord,
                words: wordsForRound,
            });
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
