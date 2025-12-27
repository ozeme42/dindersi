
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
        let allItems: ActivityItem[] = await getStaticQuestionsForGame({ courseId, unitId, topicId });

        if (allItems.length === 0) {
             return { error: "Oyun oynamak için veri bulunamadı.", questions: [] };
        }

        const allDefinitions = allItems
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        if (allDefinitions.length < 5) {
            return { error: "Bu oyun için en az 5 farklı tanım/kavram gereklidir.", questions: [] };
        }
        
        const allTerms = allDefinitions.map(item => item.content.term!);
        
        const gameQuestions: BalloonHunterQuestion[] = allDefinitions.map(item => {
            const correctAnswer = item.content.term!;
            const distractors = allTerms
                .filter(term => term !== correctAnswer)
                .sort(() => 0.5 - Math.random())
                .slice(0, 4);

            return {
                q: item.content.definition!,
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
