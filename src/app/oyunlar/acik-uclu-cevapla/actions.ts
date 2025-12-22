
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';

// Re-using the Question type for the output, as it fits the structure.
export async function getAcikUcluCevaplaAction(
    { topicId }: { topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
             return { error: "Açık Uçlu Cevaplama oynamak için belirli bir konu seçmelisiniz.", questions: [] };
        }
        
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/curriculum/activities/${topicId}.json`);

        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: [] };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }

        const staticItems: ActivityItem[] = await res.json();
        
        const allDefinitions = staticItems
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        if (allDefinitions.length < 1) {
            return { error: "Açık Uçlu Cevaplama için bu konuda uygun tanım bulunamadı.", questions: [] };
        }
        
        // Shuffle and pick all definitions for the game
        const selectedDefinitions = allDefinitions.sort(() => 0.5 - Math.random());

        const gameQuestions: Question[] = selectedDefinitions.map((item, index) => {
            return {
                id: `${topicId}-${index}`, // Temporary ID for client-side key
                text: item.content.definition!,
                type: 'Açık Uçlu',
                correctAnswer: item.content.term!,
                difficulty: 'Orta', // Assign a default difficulty
                courseId: item.courseId,
                unitId: item.unitId,
                topicId: item.topicId,
                topic: '', // Not needed for this game type
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
    } catch (error: any) {
        console.error("Error getting Acik Uclu questions:", error);
        return { error: "Açık uçlu sorular alınırken bir hata oluştu.", questions: [] };
    }
}


// Puan kaydetme işlemleri veritabanı gerektirdiğinden bu kısım sadece dinamik modda çalışır.
// Statik modda bu fonksiyonlar çağrılsa bile bir işlem yapmaz.
export async function submitAcikUcluCevaplaScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
        console.log("Static mode: Score submission is disabled.");
        return { success: true };
    }

    if (!userId || score <= 0) {
        return { success: true };
    }
    
    // Lazy-load server-only imports
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, getCountFromServer, writeBatch, doc, serverTimestamp, increment } = await import('firebase/firestore');

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Açık Uçlu Cevapla'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
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
            gameType: 'Açık Uçlu Cevapla',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Acik Uclu score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
