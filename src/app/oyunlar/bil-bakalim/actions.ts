
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

// getStaticQuestionsForGame has been removed as it was causing issues.
// Direct file reading is more reliable here.

export async function getBilBakalimAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        const isAllTopics = topicId === 'all';
        
        let fileToRead;
        // Determine the correct file to read based on selection
        if (isAllTopics) {
            if (!unitId) return { error: "Tüm konuları getirmek için bir ünite seçilmelidir.", questions: [] };
            fileToRead = `${unitId}.json`;
        } else {
            if (!topicId) return { error: "Bir konu seçilmelidir.", questions: [] };
            fileToRead = `${topicId}.json`;
        }

        // CORRECTED: The path was pointing to 'activities' instead of 'activity-items'
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activity-items', fileToRead);
        
        let items: ActivityItem[];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            items = JSON.parse(fileContent);
        } catch (e: any) {
             if (e.code === 'ENOENT') {
                return { error: "Bu konu için oynanabilir veri bulunamadı.", questions: [] };
            }
            throw e;
        }

        if (!items || items.length === 0) {
            return { error: "Bu konu için oynanabilir veri bulunamadı.", questions: [] };
        }

        // Filter for valid definition items robustly
        const allDefinitions = items
            .filter((item): item is ActivityItem & { content: { term: string, definition: string } } => 
                item.type === 'definition' &&
                !!item.content?.term &&
                !!item.content?.definition
            );

        if (allDefinitions.length < 3) {
            return { error: "Bil Bakalım oynamak için bu konuda en az 3 farklı tanım bulunmalıdır.", questions: [] };
        }
        
        const gameQuestions: Partial<Question>[] = allDefinitions.map((item, index) => ({
            id: `${item.id || `item-${index}`}`,
            text: item.content.definition!,
            type: 'Bil Bakalım',
            correctAnswer: item.content.term!,
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
