
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';


export async function getAcikUcluCevaplaAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        let allItems: ActivityItem[] = await getStaticQuestionsForGame({ courseId, unitId, topicId });

        if (allItems.length === 0) {
             return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: [] };
        }

        const allDefinitions = allItems
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        if (allDefinitions.length < 1) {
            return { error: "Açık Uçlu Cevaplama için bu konuda uygun tanım bulunamadı.", questions: [] };
        }
        
        const selectedDefinitions = allDefinitions.sort(() => 0.5 - Math.random());

        const gameQuestions: Question[] = selectedDefinitions.map((item, index) => ({
            id: `${topicId}-${index}`,
            text: item.content.definition!,
            type: 'Açık Uçlu',
            correctAnswer: item.content.term!,
            difficulty: 'Orta',
            courseId: item.courseId,
            unitId: item.unitId,
            topicId: item.topicId,
            topic: '', 
        }));

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };

    } catch (error: any) {
        console.error("Error getting Acik Uclu questions:", error);
        return { error: "Açık uçlu sorular alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitAcikUcluCevaplaScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Açık Uçlu Cevaplama'),
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
            gameType: 'Açık Uçlu Cevaplama',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Acik Uclu score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
