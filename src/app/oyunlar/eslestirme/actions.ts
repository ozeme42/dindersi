
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

export type MatchingPair = {
    id: string;
    type: 'term' | 'definition';
    content: string;
    pairId: string;
};

export async function getEslestirmeAction(
    { topicId }: { topicId?: string; }
): Promise<{ pairs: MatchingPair[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Eşleştirme oynamak için belirli bir konu seçmelisiniz.", pairs: null };
        }

        const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/curriculum/activities/${topicId}.json`);
        
        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", pairs: null };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }
        
        const allItems: ActivityItem[] = await res.json();
        
        const validItems = allItems
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        if (validItems.length < 4) {
            return { error: "Eşleştirme oynamak için bu konuda en az 4 adet tanım ve kavram gereklidir.", pairs: null };
        }

        const selectedItems = validItems.sort(() => 0.5 - Math.random());

        const gamePairs: MatchingPair[] = [];
        selectedItems.forEach((item, index) => {
            const pairId = `pair-${index}`;
            gamePairs.push({ id: `term-${index}`, type: 'term', content: item.content.term!, pairId });
            gamePairs.push({ id: `def-${index}`, type: 'definition', content: item.content.definition!, pairId });
        });

        const shuffledPairs = gamePairs.sort(() => Math.random() - 0.5);

        return { pairs: JSON.parse(JSON.stringify(shuffledPairs)) };

    } catch (error: any) {
        console.error("Server Action Error (getEslestirmeAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", pairs: null };
    }
}

export async function submitEslestirmeScoreAction(
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
            where('gameType', '==', 'Eşleştirme'),
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
            gameType: 'Eşleştirme',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitEslestirmeScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
