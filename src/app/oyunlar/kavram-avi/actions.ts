
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
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });

        const validItems: { term: string; definition: string }[] = [];
        const seenTerms = new Set<string>();

        for (const item of allItems || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition || (item as any).content.text || `${t} kavramı`).trim();
                    const upper = t.toLocaleUpperCase('tr-TR');
                    if (t.length > 2 && t.length < 16 && !t.includes(' ') && !seenTerms.has(upper)) {
                        seenTerms.add(upper);
                        validItems.push({ term: t, definition: d });
                    }
                } else if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb' || item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer) {
                    const t = String((item as any).correctAnswer).trim();
                    const d = String((item as any).text || (item as any).question || (item as any).sentenceWithBlank || `${t} kavramı`).trim();
                    const upper = t.toLocaleUpperCase('tr-TR');
                    if (t.length > 2 && t.length < 16 && !t.includes(' ') && !seenTerms.has(upper)) {
                        seenTerms.add(upper);
                        validItems.push({ term: t, definition: d });
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
