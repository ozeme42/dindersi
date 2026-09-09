
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Anagram } from '@/lib/types';
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
  getDocs
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';


export async function getConceptHuntAction({ 
    courseId,
    unitId,
    topicId
}: { 
    courseId?: string;
    unitId?: string;
    topicId?: string; 
}): Promise<{ questions: Anagram[] | null; error?: string }> {
    noStore();
    try {
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' });

        const validItems: { term: string; definition: string }[] = [];
        const seenTerms = new Set<string>();

        const cleanWord = (raw: string) => {
            return raw
                .replace(/[âÂ]/g, 'A')
                .replace(/[îÎ]/g, 'İ')
                .replace(/[ûÛ]/g, 'U')
                .replace(/[''\\-]/g, '')
                .trim();
        };

        for (const item of allItems || []) {
            if ('type' in item) {
                let rawTerm = '';
                let definition = '';

                if (item.type === 'definition' && (item as any).content?.term) {
                    rawTerm = String((item as any).content.term).trim();
                    definition = String((item as any).content.definition || '').trim();
                    // Definition yoksa bu item'ı atla
                    if (!definition) continue;
                } else if (item.type === 'concept') {
                    rawTerm = String((item as any).content?.term || (item as any).content?.text || (item as any).text || '').trim();
                    definition = String((item as any).content?.definition || (item as any).content?.meaning || '').trim();
                    // Definition yoksa concept item'ını Kavram Avı'na ekleme
                    if (!definition) continue;
                }

                if (rawTerm) {
                    const cleaned = cleanWord(rawTerm);
                    const noSpace = cleaned.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
                    const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;
                    if (noSpace.length > 2 && noSpace.length < 16 && turkishAlphabetRegex.test(noSpace) && !seenTerms.has(noSpace)) {
                        seenTerms.add(noSpace);
                        validItems.push({ term: noSpace, definition });
                    }
                }
            }
        }

        if (validItems.length < 1) {
            return { error: "Kavram Avı oynamak için bu konuda en az 1 adet uygun kelime bulunmalıdır.", questions: null };
        }
        
        for (let i = validItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validItems[i], validItems[j]] = [validItems[j], validItems[i]];
        }
        
        const anagramQuestions: Anagram[] = validItems.map(item => {
            const correctAnswer = item.term.trim().toLocaleUpperCase('tr-TR');
            return {
                definition: item.definition,
                scrambledWord: correctAnswer.split('').sort(() => 0.5 - Math.random()).join(''),
                correctAnswer: correctAnswer,
            }
        });

        return { questions: JSON.parse(JSON.stringify(anagramQuestions.slice(0, 20))) };

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
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kavram Avı'),
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
            gameType: 'Kavram Avı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitConceptHuntScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
