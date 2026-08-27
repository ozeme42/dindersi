
'use server';

import { db } from "@/lib/firebase";
import { doc, increment, writeBatch, collection, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { getQuestionsFromBank, getStaticGameData } from '@/lib/quiz-actions';

export async function getDogruYanlisZinciriAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId,
            unitId,
            topicId,
            questionTypes: ['Doğru/Yanlış', 'tf'],
            questionCount: 50
        });
        
        let questions = (result.questions || []) as Question[];
        
        if (questions.length < 5) {
            try {
                const allItems = await getStaticGameData({ courseId, unitId, topicId });
                const definitions = allItems.filter(it => 'type' in it && it.type === 'definition' && (it as any).content?.term && (it as any).content?.definition);
                
                definitions.forEach((dItem, idx) => {
                    const term = (dItem as any).content.term.trim();
                    const def = (dItem as any).content.definition.trim();
                    const isTrue = idx % 2 === 0;
                    let statement = `${term}, ${def}`;
                    if (!isTrue && definitions.length > 1) {
                        const wrongTerm = (definitions[(idx + 1) % definitions.length] as any).content.term.trim();
                        statement = `${wrongTerm}, ${def}`;
                    }
                    if (!questions.some(q => q.text === statement)) {
                        questions.push({
                            id: `gen-tf-${idx}-${Date.now()}`,
                            type: 'Doğru/Yanlış',
                            text: statement,
                            correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
                            options: ['Doğru', 'Yanlış'],
                            difficulty: 'Orta',
                            topicId: topicId || ''
                        } as any);
                    }
                });
            } catch (fallbackErr) {}
        }

        if (questions.length < 3) {
            return { questions: [], error: "Bu oyun için en az 3 Doğru/Yanlış sorusu veya kavram gereklidir." };
        }
        
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        
        return { questions: JSON.parse(JSON.stringify(questions.slice(0, 20))) };

    } catch (e: any) {
        console.error("Error getting D/Y Zinciri questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitDogruYanlisZinciriScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Doğru/Yanlış Zinciri'),
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
            gameType: 'Doğru/Yanlış Zinciri',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting D/Y Zinciri score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
