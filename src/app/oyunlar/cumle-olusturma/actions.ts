
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
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
} from 'firebase/firestore';


export type ScrambledSentenceData = {
    correctSentence: string;
};

export async function getCumleOlusturmaAction(
    { topicId }: { topicId?: string; }
): Promise<{ data: ScrambledSentenceData[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
             return { error: "Cümle Oluşturma oynamak için belirli bir konu seçmelisiniz.", data: null };
        }
        
        const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/curriculum/activities/${topicId}.json`);

        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", data: null };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }

        const staticItems: ActivityItem[] = await res.json();
        const allSentences = staticItems.filter(item => item.type === 'sentence' && item.content?.text)
            .map(item => item.content.text!)
            .filter(text => text.trim().length > 0 && text.trim().split(' ').length > 2);

        if (allSentences.length < 1) {
            return { error: "Cümle Oluşturma oynamak için bu konuda yeterli uygunlukta cümle bulunamadı.", data: null };
        }
        
        // Fisher-Yates Shuffle
        for (let i = allSentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSentences[i], allSentences[j]] = [allSentences[j], allSentences[i]];
        }

        const gameData: ScrambledSentenceData[] = allSentences.map(sentence => ({
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
        
        if (attemptsSnapshot.data().count >= 10) {
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
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitCumleOlusturmaScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
