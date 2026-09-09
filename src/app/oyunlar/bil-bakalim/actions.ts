
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';
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
  getDocs,
  Query,
  and
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

export async function getBilBakalimAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        // Use the centralized, corrected function to get data
        const allItems: ActivityItem[] = (await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' }) as any);

        if (allItems.length === 0) {
             return { questions: [], error: "Bu konu için etkinlik verisi bulunamadı." };
        }
        
        const validDefinitions: Partial<Question>[] = [];

        for (const item of allItems || []) {
            if ('type' in item) {
                // Sadece definition ve concept tiplerini al — fitb/boşluk doldurma soruları
                // soru metninde cevabı açıkça gösterdiği için Bil Bakalım'a uygun değil
                if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    const term = (item as any).content.term.trim();
                    const definition = (item as any).content.definition.trim();
                    // Tanım, cevabın kendisi olamaz ve en az 10 karakter olmalı
                    if (definition.toLowerCase() === term.toLowerCase()) continue;
                    if (definition.length < 10) continue;
                    // Tanım metni içinde kavramın adı geçiyorsa eleniyor ("mevsimler ... mevsimler" gibi)
                    if (definition.toLowerCase().includes(term.toLowerCase())) continue;
                    validDefinitions.push({
                        id: item.id || `def-${Math.random()}`,
                        text: definition,
                        type: 'Bil Bakalım',
                        correctAnswer: term,
                        difficulty: 'Orta',
                    });
                } else if (item.type === 'concept' && ((item as any).content?.term || (item as any).content?.text) && ((item as any).content?.definition || (item as any).content?.meaning)) {
                    const answer = ((item as any).content?.term || (item as any).content?.text).trim();
                    const clue = ((item as any).content?.definition || (item as any).content?.meaning).trim();
                    // Tanım, cevabın kendisi olamaz ve en az 10 karakter olmalı
                    if (clue.toLowerCase() === answer.toLowerCase()) continue;
                    if (clue.length < 10) continue;
                    // Tanım metni içinde cevap kelimesi geçiyorsa eleniyor
                    if (clue.toLowerCase().includes(answer.toLowerCase())) continue;
                    validDefinitions.push({
                        id: item.id || `concept-${Math.random()}`,
                        text: clue,
                        type: 'Bil Bakalım',
                        correctAnswer: answer,
                        difficulty: 'Orta',
                    });
                }
            }
        }

        // Her correctAnswer için sadece 1 soru al (tekrar tekrar aynı soru önleme)
        const seenAnswers = new Set<string>();
        const uniqueDefinitions = validDefinitions.filter(q => {
            const key = (q.correctAnswer || '').toLowerCase().trim();
            if (!key || seenAnswers.has(key)) return false;
            seenAnswers.add(key);
            return true;
        });
        
        if (uniqueDefinitions.length < 2) {
            return { questions: [], error: "Bil Bakalım oynamak için bu konuda en az 2 farklı tanım veya soru bulunmalıdır." };
        }

        const shuffled = [...uniqueDefinitions].sort(() => 0.5 - Math.random());
        return { questions: JSON.parse(JSON.stringify(shuffled.slice(0, 20))) };

    } catch (error: any) {
        console.error("Error getting Bil Bakalım questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitBilBakalimScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Bil Bakalım'),
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
            gameType: 'Bil Bakalım',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Bil Bakalım score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
