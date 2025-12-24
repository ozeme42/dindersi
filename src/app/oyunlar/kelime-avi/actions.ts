
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment,
} from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';

export async function getKelimeAviAction(
    { topicId }: { topicId?: string; }
): Promise<{ concepts: string[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Kelime Avı oynamak için bir konu seçmelisiniz.", concepts: null };
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const allItems: ActivityItem[] = JSON.parse(fileContent);

            const allConcepts = allItems
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
        
        } catch (fileError: any) {
            if (fileError.code === 'ENOENT') {
                return { error: "Bu konu için etkinlik verisi bulunamadı.", concepts: null };
            }
            throw fileError;
        }

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
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kelime Avı'),
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
            gameType: 'Kelime Avı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitKelimeAviScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
