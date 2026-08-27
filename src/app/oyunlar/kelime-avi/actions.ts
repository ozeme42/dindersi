
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
        let allItems = await getStaticQuestionsForGame({ 
            courseId, 
            unitId, 
            topicId, 
            dataType: 'all' 
        });
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;
        const validTerms: string[] = [];
        const fallbackTerms = ['İMAN', 'İSLAM', 'AHLAK', 'İBADET', 'TEVHİT', 'KURAN', 'SÜNNET', 'ADALET', 'MERHAMET', 'SABIR', 'ŞÜKÜR', 'İHLAS', 'TAKVA', 'FURKAN'];

        for (const item of allItems || []) {
            if ('type' in item) {
                let term = '';
                if ((item.type === 'concept' || item.type === 'definition') && (item as any).content?.term) {
                    term = String((item as any).content.term).trim();
                } else if ((item.type === 'concept' || item.type === 'definition') && (item as any).content?.text) {
                    term = String((item as any).content.text).trim();
                } else if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb' || item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer) {
                    term = String((item as any).correctAnswer).trim();
                }

                if (term && term.length > 2 && term.length <= 14 && !term.includes(' ') && turkishAlphabetRegex.test(term)) {
                    validTerms.push(term.toLocaleUpperCase('tr-TR'));
                }
            }
        }

        let uniqueConcepts = [...new Set(validTerms)];

        if (uniqueConcepts.length < 5) {
            for (const fb of fallbackTerms) {
                if (!uniqueConcepts.includes(fb)) uniqueConcepts.push(fb);
                if (uniqueConcepts.length >= 8) break;
            }
        }

        if (uniqueConcepts.length < 3) {
            return { error: "Kelime Avı oynamak için bu konuda en az 3 adet uygun kelime bulunmalıdır.", concepts: null };
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
