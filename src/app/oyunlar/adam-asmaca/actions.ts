
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

export async function getAdamAsmacaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
        
        if (!allItems || allItems.length === 0) {
            return { error: "Bu konu için oynanabilir veri bulunamadı.", data: null };
        }

        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;
        const validWords: HangmanData[] = [];
        const seenWords = new Set<string>();

        const cleanWord = (raw: string) => {
            return raw
                .replace(/[âÂ]/g, 'A')
                .replace(/[îÎ]/g, 'İ')
                .replace(/[ûÛ]/g, 'U')
                .replace(/['’\-]/g, '')
                .trim();
        };

        for (const item of allItems || []) {
            if ('type' in item) {
                const itemType = (item as any).type;
                let rawTerm = '';
                let hint = '';

                if (itemType === 'definition' && (item as any).content?.term) {
                    rawTerm = String((item as any).content.term).trim();
                    hint = String((item as any).content.definition || `${rawTerm} kavramı`).trim();
                } else if (itemType === 'concept') {
                    rawTerm = String((item as any).content?.term || (item as any).content?.text || (item as any).text || '').trim();
                    hint = String((item as any).content?.definition || (item as any).content?.meaning || `${rawTerm} kavramı`).trim();
                } else if ((itemType === 'Boşluk Doldurma' || itemType === 'fitb') && (item as any).correctAnswer) {
                    const ans = String((item as any).correctAnswer).trim();
                    // Yalnızca 1 veya 2 kelimelik net kavram cevaplarını al, cümleleri ASLA alma
                    if (ans.length >= 3 && ans.length <= 25 && ans.split(/\s+/).length <= 2) {
                        rawTerm = ans;
                        hint = String((item as any).sentenceWithBlank || (item as any).text || `${rawTerm} kavramı`).trim();
                    }
                }

                if (rawTerm) {
                    const cleaned = cleanWord(rawTerm);
                    const noSpace = cleaned.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
                    if (noSpace.length >= 3 && noSpace.length <= 16 && turkishAlphabetRegex.test(noSpace) && !seenWords.has(noSpace)) {
                        seenWords.add(noSpace);
                        validWords.push({ word: noSpace, hint });
                    }
                    // Eğer kavram 2 kelimeden oluşuyorsa parçaları da geçerli kabul et (örn: "Meddi Tabii" -> "MEDDİ", "TABİİ")
                    const parts = cleaned.split(/\s+/);
                    if (parts.length === 2) {
                        for (const part of parts) {
                            const upperPart = part.toLocaleUpperCase('tr-TR');
                            if (upperPart.length >= 3 && upperPart.length <= 16 && turkishAlphabetRegex.test(upperPart) && !seenWords.has(upperPart)) {
                                seenWords.add(upperPart);
                                validWords.push({ word: upperPart, hint: `${rawTerm}: ${hint}` });
                            }
                        }
                    }
                }
            }
        }
        
        if (validWords.length < 2) {
            return { error: "Adam Asmaca oynamak için bu konuda yeterli uygunlukta kelime bulunamadı (3-16 harf, boşluksuz, en az 2 adet).", data: null };
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
