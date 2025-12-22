
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type HangmanData = {
    word: string;
    hint: string;
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

export async function getAdamAsmacaAction(
    { topicId }: { topicId?: string; }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Adam Asmaca oynamak için belirli bir konu seçmelisiniz.", data: null };
        }

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/curriculum/activities/${topicId}.json`);
        
        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", data: null };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }
        
        const allItems: ActivityItem[] = await res.json();
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

        const suitableItems = allItems.filter(item => 
            item.type === 'definition' &&
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
     if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
        console.log("Static mode: Score submission is disabled.");
        return { success: true };
    }
    if (!userId || score <= 0) return { success: true };
    
    // Lazy-load server-only imports
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, getCountFromServer, writeBatch, doc, serverTimestamp, increment } = await import('firebase/firestore');

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
