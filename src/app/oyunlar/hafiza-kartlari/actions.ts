
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

export type MatchingPair = {
    id: string;
    type: 'term' | 'definition';
    content: string;
    pairId: string;
};

export async function getHafizaKartlariAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ pairs: MatchingPair[] | null; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }
        
        const limitedQuery = query(baseQuery, limit(50));
        const querySnapshot = await getDocs(limitedQuery);
        
        const allItems = querySnapshot.docs.map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allItems.length < 4) {
            return { error: "Hafıza Kartları oynamak için bu konuda en az 4 adet tanım ve kavram gereklidir.", pairs: null };
        }

        // Shuffle and pick up to 8 pairs for the game
        const selectedItems = allItems.sort(() => 0.5 - Math.random()).slice(0, 8);

        const gamePairs: MatchingPair[] = [];
        selectedItems.forEach((item, index) => {
            const pairId = `pair-${index}`;
            gamePairs.push({ id: `term-${index}`, type: 'term', content: item.content.term!, pairId });
            gamePairs.push({ id: `def-${index}`, type: 'definition', content: item.content.definition!, pairId });
        });

        // Shuffle the final array so terms and definitions are mixed
        const shuffledPairs = gamePairs.sort(() => Math.random() - 0.5);

        return { pairs: JSON.parse(JSON.stringify(shuffledPairs)) };

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
    if (!userId || score <= 0) return { success: true };
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Hafıza Kartları'),
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
            gameType: 'Hafıza Kartları',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitHafizaKartlariScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
