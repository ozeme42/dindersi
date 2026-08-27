
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import { getStaticQuestionsForGame } from "@/lib/quiz-actions";

export type DogruYolQuestion = {
    q: string;
    correct: string;
    wrong: string;
}

export async function getDogruYolKosucusuAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: DogruYolQuestion[]; error?: string }> {
    noStore();
    try {
        const allItems = await getStaticQuestionsForGame({ topicId, courseId, unitId, dataType: 'all' });
        
        const pairs: { q: string, correct: string, wrong?: string }[] = [];
        
        for (const item of allItems || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term && (item as any).content?.definition) {
                    pairs.push({
                        q: (item as any).content.definition.trim(),
                        correct: (item as any).content.term.trim()
                    });
                } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).text || (item as any).question)) {
                    const wrongs = ((item as any).options || []).filter((o: any) => o !== (item as any).correctAnswer);
                    pairs.push({
                        q: ((item as any).text || (item as any).question).trim(),
                        correct: String((item as any).correctAnswer).trim(),
                        wrong: wrongs[0] ? String(wrongs[0]).trim() : undefined
                    });
                }
            }
        }

        if (pairs.length < 2) {
            return { error: "Bu oyun için en az 2 farklı tanım veya soru gereklidir.", questions: [] };
        }
            
        const gameQuestions: DogruYolQuestion[] = pairs.map((item, index, arr) => {
            let wrongAnswer = item.wrong;
            if (!wrongAnswer) {
                const otherOptions = arr.filter((_, i) => i !== index);
                wrongAnswer = otherOptions[Math.floor(Math.random() * otherOptions.length)]?.correct || 'İslam';
            }

            return {
                q: item.q,
                correct: item.correct,
                wrong: wrongAnswer
            };
        });

        const shuffled = [...gameQuestions].sort(() => 0.5 - Math.random());
        return { questions: JSON.parse(JSON.stringify(shuffled.slice(0, 20))) };

    } catch (error: any) {
        console.error("Error getting Dogru Yol Kosucusu questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitDogruYolKosucusuScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Doğru Yol Koşucusu'),
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
            gameType: 'Doğru Yol Koşucusu',
            context: context,
            attemptNumber: attemptsSnapshot.data().count + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
