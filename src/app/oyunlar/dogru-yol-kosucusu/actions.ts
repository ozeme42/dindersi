
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type DogruYolQuestion = {
    q: string;
    correct: string;
    wrong: string;
}

export async function getDogruYolKosucusuAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: DogruYolQuestion[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'));

        const conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        conditions.push(where('type', '==', 'definition'));

        const finalQuery = query(baseQuery, ...conditions);
        const snapshot = await getDocs(finalQuery);
        
        const allDefinitions = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 2) {
            return { error: "Bu oyun için en az 2 farklı tanım/kavram gereklidir.", questions: [] };
        }
        
        // Create question-answer pairs
        const gameQuestions: DogruYolQuestion[] = allDefinitions.map((item, index, arr) => {
            const wrongOptions = arr.filter((_, i) => i !== index);
            const wrongAnswerItem = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

            return {
                q: item.content.definition!,
                correct: item.content.term!,
                wrong: wrongAnswerItem.content.term!
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
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
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
