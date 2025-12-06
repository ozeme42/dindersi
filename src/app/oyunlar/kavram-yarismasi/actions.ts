
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer, limit } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';

export async function getKavramYarismasiAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
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

        const finalQuery = query(baseQuery, ...conditions, limit(30));
        const definitionsSnapshot = await getDocs(finalQuery);
        
        const allDefinitions = definitionsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 3) {
            return { error: "Bu oyun için bu konuda en az 3 farklı tanım bulunmalıdır.", questions: [] };
        }
        
        const gameQuestions: Partial<Question>[] = allDefinitions.map((item, index) => {
            return {
                id: `${item.courseId}-${item.unitId}-${item.topicId}-${index}`,
                text: item.content.definition!,
                type: 'Kavram Yarışması',
                correctAnswer: item.content.term!,
                difficulty: 'Orta',
            };
        });

        // Shuffle questions
        for (let i = gameQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameQuestions[i], gameQuestions[j]] = [gameQuestions[j], gameQuestions[i]];
        }

        return { questions: JSON.parse(JSON.stringify(gameQuestions.slice(0, 15))) };

    } catch (error: any) {
        console.error("Error getting Kavram Yarışması questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitKavramYarismasiScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kavram Yarışması'),
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
            gameType: 'Kavram Yarışması',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
