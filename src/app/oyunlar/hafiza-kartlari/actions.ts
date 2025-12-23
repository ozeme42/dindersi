
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
import fs from 'fs/promises';
import path from 'path';


export type MatchingPair = {
    id: string;
    type: 'term' | 'definition';
    content: string;
    pairId: string;
};

export async function getHafizaKartlariAction(
    { topicId }: { topicId?: string; }
): Promise<{ pairs: MatchingPair[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Hafıza Kartları oynamak için belirli bir konu seçmelisiniz.", pairs: null };
        }
        
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const allItems: ActivityItem[] = JSON.parse(fileContent);
            
            const validItems = allItems.filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

            if (validItems.length < 4) {
                return { error: "Hafıza Kartları oynamak için bu konuda en az 4 adet tanım ve kavram gereklidir.", pairs: null };
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

        } catch (fileError: any) {
            if (fileError.code === 'ENOENT') {
                return { error: "Bu konu için etkinlik verisi bulunamadı.", pairs: null };
            }
            throw fileError;
        }

    } catch (error: any) {
        console.error("Server Action Error (getHafizaKartlariAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", pairs: null };
    }
}

export async function submitHafizaKartlariScoreAction(
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
            where('gameType', '==', 'Hafıza Kartları'),
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
            gameType: 'Hafıza Kartları',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitHafizaKartlariScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
