

'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, setDoc, getCountFromServer, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import type { ActivityItem, Question } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export type ConceptQuizQuestion = {
    id: string;
    definition: string;
    options: string[];
    correctAnswer: string;
};

export async function getConceptQuizAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: ConceptQuizQuestion[]; error?: string }> {
    noStore();
    try {
        let baseQuery = collection(db, 'activityItems');
        let conditions = [];

        if (topicId && topicId !== 'all') {
            conditions.push(where('topicId', '==', topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where('unitId', '==', unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where('courseId', '==', courseId));
        }
        
        const q = query(baseQuery, ...conditions);
        const snapshot = await getDocs(q);

        const definitions = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem))
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        const concepts = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.type === 'concept' && item.content?.text)
            .map(item => item.content.text!);

        const allTermsInScope = [...new Set([...definitions.map(d => d.content.term!), ...concepts])];

        if (definitions.length === 0) {
            return { questions: [], error: 'Bu konu için uygun kavram/tanım çifti bulunamadı.' };
        }

        if (allTermsInScope.length < 8) {
             return { questions: [], error: `Bu yarışma için en az 8 farklı kavram gereklidir. Bulunan: ${allTermsInScope.length}` };
        }

        const gameQuestions: ConceptQuizQuestion[] = [];
        const shuffledDefinitions = shuffleArray(definitions);

        for (const item of shuffledDefinitions) {
            const correctAnswer = item.content.term!;
            
            const distractors = shuffleArray(allTermsInScope.filter(d => d !== correctAnswer)).slice(0, 7);
            
            if (distractors.length < 7) {
                // This case should be rare now with the check above, but as a safeguard.
                continue; 
            }

            const options = shuffleArray([correctAnswer, ...distractors]);
            
            gameQuestions.push({
                id: item.id,
                definition: item.content.definition!,
                correctAnswer: correctAnswer,
                options: options,
            });
        }
        
        if (gameQuestions.length === 0) {
            return { questions: [], error: 'Bu seçim için yeterli sayıda çeldirici kavram bulunamadığından oyun oluşturulamadı.' };
        }

        return { questions: gameQuestions.slice(0, 20) };

    } catch (error: any) {
        console.error("Error getting Concept Quiz questions:", error);
        return { error: 'Kavram Yarışması soruları alınırken bir hata oluştu.', questions: [] };
    }
}


export async function submitConceptQuizScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
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
            return { success: false, error: 'Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız.' };
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
        console.error("Error submitting Concept Quiz score:", error);
        return { success: false, error: 'Skor kaydedilirken bir hata oluştu.' };
    }
}
