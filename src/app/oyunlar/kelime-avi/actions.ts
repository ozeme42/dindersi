
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
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

export async function getKelimeAviAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ concepts: string[] | null; error?: string }> {
    noStore();
    try {
        // Sadece 'concept' türündeki verileri almak için dataType'ı 'activities' olarak belirleyip sonrasında filtreliyoruz.
        let allItems: ActivityItem[] = await getStaticQuestionsForGame({ 
            courseId, 
            unitId, 
            topicId, 
            dataType: 'activities' 
        });
        
        // Sadece 'concept' tipindeki öğeleri filtrele
        const validItems = allItems.filter(item => item.type === 'concept');

        if (validItems.length === 0) {
            return { error: "Bu konu için oynanabilir 'kavram' verisi bulunamadı.", concepts: null };
        }
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;
        
        const allConcepts = validItems
            .map(item => item.content.text) // Sadece concept tipinden text'i al
            .filter((text): text is string => 
                typeof text === 'string' && 
                text.trim().length > 2 &&
                text.trim().length <= 12 &&
                !text.trim().includes(' ') && // Sadece tek kelime olanları al
                turkishAlphabetRegex.test(text.trim())
            )
            .map(text => text.trim().toLocaleUpperCase('tr-TR'));

        const uniqueConcepts = [...new Set(allConcepts)];

        if (uniqueConcepts.length < 5) {
            return { error: "Kelime Avı oynamak için bu konuda en az 5 adet uygun kelime (3-12 harf arası, tek kelime, sadece harf içeren) bulunmalıdır.", concepts: null };
        }
        
        // Karıştır
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
