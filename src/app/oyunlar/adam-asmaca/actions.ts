
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
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
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';


export type HangmanData = {
    word: string;
    hint: string;
};

export async function getAdamAsmacaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
        
        if (!allItems || allItems.length === 0) {
            return { error: "Bu konu için oynanabilir veri bulunamadı.", data: null };
        }

        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;
        const validWords: HangmanData[] = [];
        const seenWords = new Set<string>();

        for (const item of allItems || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term) {
                    const w = String((item as any).content.term).trim();
                    const hint = String((item as any).content.definition || (item as any).content.text || `${w} kavramı`).trim();
                    const upper = w.toLocaleUpperCase('tr-TR');
                    if (w.length >= 3 && w.length <= 16 && !w.includes(' ') && turkishAlphabetRegex.test(w) && !seenWords.has(upper)) {
                        seenWords.add(upper);
                        validWords.push({ word: upper, hint });
                    }
                } else if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb' || item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer) {
                    const w = String((item as any).correctAnswer).trim();
                    const hint = String((item as any).text || (item as any).question || (item as any).sentenceWithBlank || `${w} kavramı`).trim();
                    const upper = w.toLocaleUpperCase('tr-TR');
                    if (w.length >= 3 && w.length <= 16 && !w.includes(' ') && turkishAlphabetRegex.test(w) && !seenWords.has(upper)) {
                        seenWords.add(upper);
                        validWords.push({ word: upper, hint });
                    }
                }
            }
        }
        
        if (validWords.length < 2) {
            return { error: "Adam Asmaca oynamak için bu konuda yeterli uygunlukta kelime bulunamadı (3-16 harf, boşluksuz, en az 2 adet).", data: null };
        }
        
        const shuffled = [...validWords].sort(() => 0.5 - Math.random());
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
