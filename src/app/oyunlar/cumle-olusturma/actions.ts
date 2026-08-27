
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
import fs from 'fs/promises';
import path from 'path';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

export type ScrambledSentenceData = {
    correctSentence: string;
};

export async function getCumleOlusturmaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ data: ScrambledSentenceData[] | null; error?: string }> {
    noStore();
    try {
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
        
        if (!allItems || allItems.length === 0) {
            return { error: "Bu konu için oynanabilir veri bulunamadı.", data: null };
        }
        
        const extractedSentences: string[] = [];

        for (const item of allItems) {
            if ('type' in item) {
                if (item.type === 'sentence' && (item as any).content?.text) {
                    const txt = String((item as any).content.text).trim();
                    if (txt.split(' ').length >= 3) extractedSentences.push(txt);
                } else if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition).trim();
                    const s = `${t}, ${d}`;
                    if (s.split(' ').length >= 3 && s.length <= 150) extractedSentences.push(s);
                } else if ((item.type === 'Doğru/Yanlış' || item.type === 'tf') && ((item as any).text || (item as any).statement)) {
                    const txt = String((item as any).text || (item as any).statement).trim();
                    if (txt.split(' ').length >= 3 && txt.length <= 150) extractedSentences.push(txt);
                }
            }
        }

        const uniqueSentences = [...new Set(extractedSentences)];

        if (uniqueSentences.length < 1) {
            return { error: "Cümle Oluşturma oynamak için bu konuda yeterli uygunlukta cümle bulunamadı.", data: null };
        }
        
        for (let i = uniqueSentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueSentences[i], uniqueSentences[j]] = [uniqueSentences[j], uniqueSentences[i]];
        }

        const gameData: ScrambledSentenceData[] = uniqueSentences.slice(0, 15).map(sentence => ({
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
