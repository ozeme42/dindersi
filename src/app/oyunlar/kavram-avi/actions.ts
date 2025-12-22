
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Anagram } from '@/lib/types';

const MAX_ATTEMPTS_PER_CONTEXT = 10;

export async function getConceptHuntAction({ 
    topicId
}: { 
    topicId?: string; 
}): Promise<{ questions: Anagram[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Kavram Avı oynamak için belirli bir konu seçmelisiniz.", questions: null };
        }

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/curriculum/activities/${topicId}.json`);
        
        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: null };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }
        
        const allItems: ActivityItem[] = await res.json();
        
        const validItems = allItems.filter(item => 
            item.type === 'definition' &&
            item.content?.term && 
            item.content?.definition &&
            item.content.term.trim().length > 2 &&
            !item.content.term.includes(' ')
        );

        if (validItems.length < 1) {
            return { error: "Kavram Avı oynamak için bu konuda en az 1 adet uygun kelime bulunmalıdır.", questions: null };
        }
        
        for (let i = validItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validItems[i], validItems[j]] = [validItems[j], validItems[i]];
        }
        
        const anagramQuestions: Anagram[] = validItems.map(item => {
            const correctAnswer = item.content.term!.trim().toLocaleUpperCase('tr-TR');
            return {
                definition: item.content.definition!,
                scrambledWord: correctAnswer.split('').sort(() => 0.5 - Math.random()).join(''),
                correctAnswer: correctAnswer,
            }
        });

        return { questions: JSON.parse(JSON.stringify(anagramQuestions)) };

    } catch (error: any) {
        console.error("Server Action Error (getConceptHuntAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", questions: null };
    }
}

export async function submitConceptHuntScoreAction(
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
            where('gameType', '==', 'Kavram Avı'),
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
            gameType: 'Kavram Avı',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitConceptHuntScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
