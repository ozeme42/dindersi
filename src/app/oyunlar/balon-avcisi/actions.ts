
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type BalloonHunterQuestion = {
    q: string; // The definition
    a: string; // The correct term
    wrongs: string[]; // Distractor terms
}

export async function getBalloonHunterDataAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: BalloonHunterQuestion[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        const conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        const finalQuery = query(baseQuery, ...conditions);
        const snapshot = await getDocs(finalQuery);
        
        const allDefinitions = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

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
            gameType: 'Balon Avcısı',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
