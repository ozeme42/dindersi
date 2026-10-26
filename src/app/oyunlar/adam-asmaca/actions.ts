'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { db } from "@/lib/firebase";
import { 
  doc, 
  writeBatch, 
  serverTimestamp, 
  increment, 
  collection, 
  query, 
  where, 
  getCountFromServer,
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

export type HangmanData = {
    word: string;
    hint: string;
};

// Kavram ismini ve ek açıklamaları temizleme
const cleanConceptTerm = (raw: string) => {
    return raw
        // Parantez ve köşeli parantez içi ek açıklamaları temizle: "İhlas (Samimiyet)" -> "İhlas"
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        // Başındaki numara ve madde işaretlerini temizle: "1. ", "a) ", "- "
        .replace(/^[0-9]+[\.\-\)\s]+/, '')
        // Şapkalı harfleri standart harflere dönüştür
        .replace(/[âÂ]/g, 'A')
        .replace(/[îÎ]/g, 'İ')
        .replace(/[ûÛ]/g, 'U')
        .replace(/[êÊ]/g, 'E')
        // Tırnak, apostrof, tire ve noktaları temizle
        .replace(/['’"”`\-\.]/g, '')
        // Fazla boşlukları teke indir ve kenar boşluklarını sil
        .replace(/\s+/g, ' ')
        .trim();
};

export async function getAdamAsmacaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        // Sadece aktiviteler (kavram ve tanım kartları) çekiliyor
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' });
        
        // Eğer seçilen konuda 2'den az tanım varsa, aynı ünitedeki diğer konulardan da kavramları al
        if ((!allItems || allItems.length < 2) && unitId) {
            const unitItems = await getStaticQuestionsForGame({ courseId, unitId, dataType: 'activities' });
            allItems = [...(allItems || []), ...(unitItems || [])];
        }

        if (!allItems || allItems.length === 0) {
            return { error: "Bu konu için oynanabilir kavram tanımı bulunamadı.", data: null };
        }

        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/;
        const validWords: HangmanData[] = [];
        const seenWords = new Set<string>();

        for (const item of allItems || []) {
            if ('type' in item) {
                const itemType = (item as any).type;
                let rawTerm = '';
                let rawHint = '';

                // SADECE tanımı olan kavramlar (definition ve concept) dahil edilir
                if (itemType === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    rawTerm = String((item as any).content.term).trim();
                    rawHint = String((item as any).content.definition).trim();
                } else if (itemType === 'concept' && ((item as any).content?.term || (item as any).content?.text) && ((item as any).content?.definition || (item as any).content?.meaning)) {
                    rawTerm = String((item as any).content?.term || (item as any).content?.text).trim();
                    rawHint = String((item as any).content?.definition || (item as any).content?.meaning).trim();
                }

                if (rawTerm && rawHint) {
                    const cleaned = cleanConceptTerm(rawTerm);
                    const upperTerm = cleaned.toLocaleUpperCase('tr-TR');
                    const lettersOnly = upperTerm.replace(/\s+/g, '');
                    const wordCount = upperTerm.split(' ').length;

                    // Geçerli bir kavram: 3-25 harf uzunluğunda, en fazla 3 kelime, sadece Türkçe harf ve boşluk
                    // Asla kelimenin yarısı bölünmez; kavramın tamamı tam olarak dahil edilir
                    if (
                        lettersOnly.length >= 3 && 
                        lettersOnly.length <= 25 && 
                        wordCount <= 3 && 
                        turkishAlphabetRegex.test(upperTerm) && 
                        !seenWords.has(upperTerm)
                    ) {
                        seenWords.add(upperTerm);
                        validWords.push({ word: upperTerm, hint: rawHint });
                    }
                }
            }
        }
        
        if (validWords.length < 2) {
            return { error: "Adam Asmaca oynamak için bu konuda yeterli uygunlukta kavram tanımı bulunamadı (en az 2 adet).", data: null };
        }
        
        const shuffled = [...validWords].sort(() => 0.5 - Math.random());
        return { data: JSON.parse(JSON.stringify(shuffled.slice(0, 15))) };
        
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
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Adam Asmaca'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
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
            gameType: 'Adam Asmaca',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Adam Asmaca score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
