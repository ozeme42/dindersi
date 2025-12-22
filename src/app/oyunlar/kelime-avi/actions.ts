
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

const MAX_ATTEMPTS_PER_CONTEXT = 10;

export async function getKelimeAviAction(
    { topicId }: { topicId?: string; }
): Promise<{ concepts: string[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Kelime Avı oynamak için belirli bir konu seçmelisiniz.", concepts: null };
        }

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/curriculum/activities/${topicId}.json`);
        
        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", concepts: null };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }

        const allItems: ActivityItem[] = await res.json();
        
        const allConcepts = allItems
            .filter(item => item.type === 'concept' || (item.type === 'definition' && item.content.term))
            .map(item => item.content.text || item.content.term)
            .filter((text): text is string => 
                typeof text === 'string' && 
                text.trim().length > 2 &&
                text.trim().length <= 12 &&
                !text.includes(' ')
            )
            .map(text => text.toLocaleUpperCase('tr-TR'));

        const uniqueConcepts = [...new Set(allConcepts)];

        if (uniqueConcepts.length < 5) {
            return { error: "Kelime Avı oynamak için bu konuda en az 5 adet uygun kelime bulunmalıdır.", concepts: null };
        }
        
        for (let i = uniqueConcepts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueConcepts[i], uniqueConcepts[j]] = [uniqueConcepts[j], uniqueConcepts[i]];
        }

        return { concepts: JSON.parse(JSON.stringify(uniqueConcepts)) };

    } catch (error: any) {
        console.error("Server Action Error (getKelimeAviAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", concepts: null };
    }
}

export async function submitKelimeAviScoreAction(
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
            where('gameType', '==', 'Kelime Avı'),
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
            gameType: 'Kelime Avı',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitKelimeAviScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
