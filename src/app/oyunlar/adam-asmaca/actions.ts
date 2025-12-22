
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

export type HangmanData = {
    word: string;
    hint: string;
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

export async function getAdamAsmacaAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        let allItems: Pick<ActivityItem, 'id' | 'content'>[] = [];

        if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' && topicId && topicId !== 'all') {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/curriculum/activities/${topicId}.json`);
                if (res.ok) {
                    const staticItems: ActivityItem[] = await res.json();
                    allItems = staticItems.filter(item => item.type === 'definition').map(item => ({ id: item.id, content: item.content }));
                }
            } catch (e) {
                console.warn("Could not fetch static activity file, will try Firestore.", e);
            }
        }
        
        if (allItems.length === 0) {
            let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));
            if (topicId && topicId !== 'all') baseQuery = query(baseQuery, where("topicId", "==", topicId));
            else if (unitId && unitId !== 'all') baseQuery = query(baseQuery, where("unitId", "==", unitId));
            else if (courseId && courseId !== 'all') baseQuery = query(baseQuery, where("courseId", "==", courseId));

            const querySnapshot = await getDocs(baseQuery);
            allItems = querySnapshot.docs.map(doc => ({ id: doc.id, content: doc.data().content as ActivityItem['content'] }));
        }
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

        const suitableItems = allItems.filter(item => 
            item.content &&
            item.content.term && 
            item.content.definition &&
            item.content.term.trim().length >= 4 && 
            item.content.term.trim().length <= 14 && 
            !item.content.term.includes(' ') && 
            turkishAlphabetRegex.test(item.content.term.trim())
        );

        if (suitableItems.length < 3) {
            return { error: "Adam Asmaca oynamak için bu konuda yeterli uygunlukta kelime bulunamadı.", data: null };
        }
        
        const shuffled = [...suitableItems].sort(() => 0.5 - Math.random());
        
        const gameData: HangmanData[] = shuffled.map(item => ({
            word: item.content.term!.trim().toLocaleUpperCase('tr-TR'),
            hint: item.content.definition!,
        }));

        return { data: JSON.parse(JSON.stringify(gameData)) };

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
    if (!userId || score <= 0) return { success: true };
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Adam Asmaca'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        
        if (attemptsSnapshot.data().count >= MAX_ATTEMPTS_PER_CONTEXT) {
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
            gameType: 'Adam Asmaca',
            context: context,
            metadata: { platform: 'web', version: '2.0' }
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitAdamAsmacaScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
