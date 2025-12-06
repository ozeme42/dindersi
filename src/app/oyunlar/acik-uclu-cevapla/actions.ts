
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';

// Re-using the Question type for the output, as it fits the structure.
export async function getAcikUcluCevaplaAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const definitionsQuery = query(baseQuery, where('type', '==', 'definition'));
        const definitionsSnapshot = await getDocs(definitionsQuery);
        
        const allDefinitions = definitionsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 1) {
            return { error: "Açık Uçlu Cevaplama için bu konuda uygun tanım bulunamadı.", questions: [] };
        }
        
        // Shuffle and pick all definitions for the game
        const selectedDefinitions = allDefinitions.sort(() => 0.5 - Math.random());

        const gameQuestions: Question[] = selectedDefinitions.map((item, index) => {
            return {
                id: `${item.courseId}-${item.unitId}-${item.topicId}-${index}`, // Temporary ID for client-side key
                text: item.content.definition!,
                type: 'Açık Uçlu',
                correctAnswer: item.content.term!,
                difficulty: 'Orta', // Assign a default difficulty
                courseId: item.courseId,
                unitId: item.unitId,
                topicId: item.topicId,
                topic: '', // Not needed for this game type
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
    } catch (error: any) {
        console.error("Error getting Acik Uclu questions:", error);
        return { error: "Açık uçlu sorular alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitAcikUcluCevaplaScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Açık Uçlu Cevapla'),
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
            gameType: 'Açık Uçlu Cevapla',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Acik Uclu score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
