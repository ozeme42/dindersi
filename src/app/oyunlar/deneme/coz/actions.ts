
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, getCountFromServer, getDoc } from "firebase/firestore";
import type { Question } from "@/lib/types";

export async function getDenemeQuestionsAction({ questionIds }: { questionIds: string[] }): Promise<{ questions: Question[], error?: string }> {
    if (!questionIds || questionIds.length === 0) {
        return { questions: [], error: 'Soru IDleri bulunamadı.' };
    }

    try {
        const questions: Question[] = [];
        // Firestore 'in' query limit is 30. We need to chunk the requests.
        const chunks: string[][] = [];
        for (let i = 0; i < questionIds.length; i += 30) {
            chunks.push(questionIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            if (chunk.length === 0) continue;
            const q = query(collection(db, 'examQuestions'), where('__name__', 'in', chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                questions.push({ id: doc.id, ...doc.data() } as Question);
            });
        }
        
        // Re-order questions based on the original questionIds array
        const questionMap = new Map(questions.map(q => [q.id, q]));
        const orderedQuestions = questionIds.map(id => questionMap.get(id)).filter(Boolean) as Question[];

        return { questions: JSON.parse(JSON.stringify(orderedQuestions)) };
    } catch (e: any) {
        console.error("Error getting deneme questions:", e);
        return { questions: [], error: 'Sorular getirilirken bir hata oluştu.' };
    }
}

export async function submitDenemeScoreAction(userId: string | null, score: number, context: string, answers: (string|boolean|null)[]): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Kullanıcı bulunamadı.' };
    }
    
    // Deneme sınavları için puan kazanma limiti genellikle olmaz.
    // Ancak istenirse, buraya benzer bir kontrol eklenebilir.
    // Şimdilik limiti kaldırıyoruz.

    try {
        const batch = writeBatch(db);
        
        if (score > 0) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, { score: increment(score) });
        }

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'deneme', // use a consistent gameType
            context: {
                assignmentId: context.replace('Deneme ID: ', ''),
                // other context if needed
            },
            answers: answers, // save the student's answers
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting deneme score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
