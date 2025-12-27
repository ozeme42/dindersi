
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
  getDocs
} from 'firebase/firestore';
import { getQuestionsFromBank } from '@/lib/quiz-actions'; // Use the robust DB fetching function

export async function getBilBakalimAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        const result = await getQuestionsFromBank({
            courseId: courseId,
            unitId: unitId,
            topicId: topicId,
            questionTypes: ['definition', 'concept'], // Fetch both to be safe
            questionCount: 200, 
        });

        if (result.error) {
            return { questions: [], error: result.error };
        }

        // Filter for valid definitions *after* fetching
        const validDefinitions = (result.questions as ActivityItem[]).filter(
            (item): item is ActivityItem & { content: { term: string, definition: string } } => 
            item.type === 'definition' &&
            !!item.content?.term &&
            !!item.content?.definition
        );
        
        if (validDefinitions.length < 3) {
            return { questions: [], error: "Bil Bakalım oynamak için bu konuda en az 3 farklı tanım bulunmalıdır." };
        }
        
        const gameQuestions: Partial<Question>[] = validDefinitions.map((item: any) => ({
            id: item.id,
            text: item.content.definition,
            type: 'Bil Bakalım',
            correctAnswer: item.content.term,
            difficulty: 'Orta',
        }));

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };

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
