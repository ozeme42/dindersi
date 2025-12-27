
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
  getDocs,
  Query,
  and
} from 'firebase/firestore';

export async function getBilBakalimAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        let q: Query = collection(db, "activityItems");
        
        const conditions = [where("type", "==", "definition")];

        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        if (conditions.length > 1) {
            q = query(q, and(...conditions));
        } else {
            q = query(q, conditions[0]);
        }

        const querySnapshot = await getDocs(q);

        const validDefinitions = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem))
            .filter((item): item is ActivityItem & { content: { term: string, definition: string } } => 
                !!item.content?.term && !!item.content?.definition
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
