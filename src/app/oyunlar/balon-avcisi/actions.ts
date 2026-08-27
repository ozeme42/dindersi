
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

export type BalloonHunterQuestion = {
    q: string; // The definition
    a: string; // The correct term
    wrongs: string[]; // Distractor terms
}

export async function getBalloonHunterDataAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: BalloonHunterQuestion[]; error?: string }> {
    noStore();
    try {
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });

        if (!allItems || allItems.length === 0) {
             return { error: "Oyun oynamak için veri bulunamadı.", questions: [] };
        }

        const pairs: { term: string; definition: string }[] = [];
        const termsPool: string[] = ['İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 'Adalet', 'Merhamet', 'Sabır', 'Şükür'];

        for (const item of allItems) {
            if ('type' in item) {
                if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    const t = (item as any).content.term.trim();
                    const d = (item as any).content.definition.trim();
                    pairs.push({ term: t, definition: d });
                    termsPool.push(t);
                } else if (item.type === 'concept' && (item as any).content?.term && (item as any).content?.definition) {
                    const t = (item as any).content.term.trim();
                    const d = (item as any).content.definition.trim();
                    pairs.push({ term: t, definition: d });
                    termsPool.push(t);
                } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).text || (item as any).question)) {
                    const t = String((item as any).correctAnswer).trim();
                    const d = String((item as any).text || (item as any).question).trim();
                    if (t.length <= 25) {
                        pairs.push({ term: t, definition: d });
                        termsPool.push(t);
                    }
                    if (Array.isArray((item as any).options)) {
                        termsPool.push(...(item as any).options.map((o: any) => String(o).trim()));
                    }
                }
            }
        }

        if (pairs.length < 2) {
            return { error: "Bu oyun için en az 2 adet kavram veya soru gereklidir.", questions: [] };
        }

        const uniqueTerms = [...new Set(termsPool.filter(t => t.length > 1 && t.length <= 25))];

        const gameQuestions: BalloonHunterQuestion[] = pairs.map(item => {
            const correctAnswer = item.term;
            let distractors = uniqueTerms
                .filter(term => term !== correctAnswer)
                .sort(() => 0.5 - Math.random())
                .slice(0, 4);

            while (distractors.length < 3) {
                distractors.push(['İhlas', 'Takva', 'Furkan', 'Mizan', 'Kıyamet'][distractors.length]);
            }

            return {
                q: item.definition,
                a: correctAnswer,
                wrongs: distractors,
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions.sort(() => 0.5 - Math.random()))) };

    } catch (error: any) {
        console.error("Error getting Balloon Hunter data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitBalloonHunterScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Balon Avcısı'),
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
            gameType: 'Balon Avcısı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
