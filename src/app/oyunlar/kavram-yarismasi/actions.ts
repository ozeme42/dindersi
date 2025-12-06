
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

// Renamed and completely re-written to fit the new game logic
export async function getConceptQuizAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
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

        const finalQuery = query(baseQuery, ...conditions);
        const snapshot = await getDocs(finalQuery);
        
        const allDefinitions = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        const allConcepts = allDefinitions.map(item => item.content.term!);

        if (allDefinitions.length < 8) {
            return { error: "Bu oyun için en az 8 farklı kavram/tanım gereklidir.", questions: null };
        }
        
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of allDefinitions) {
            const correctAnswer = item.content.term!;
            const definition = item.content.definition!;

            // Get 7 random distractor concepts, excluding the correct answer
            const distractors = allConcepts
                .filter(concept => concept !== correctAnswer)
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 7);

            if (distractors.length < 7) {
                // Not enough unique concepts to create a full 8-option question, skip this one
                continue;
            }

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
            
            gameQuestions.push({
                definition,
                options,
                correctAnswer,
            });
        }
        
        if (gameQuestions.length === 0) {
             return { error: "Oyun için uygun soru oluşturulamadı. Konuda yeterli çeşitlilikte kavram olmayabilir.", questions: null };
        }
        
        // Shuffle the final question list
        const shuffledGameQuestions = gameQuestions.sort(() => 0.5 - Math.random());

        return { questions: JSON.parse(JSON.stringify(shuffledGameQuestions)) };

    } catch (error: any) {
        console.error("Error getting Kavram Yarışması questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: null };
    }
}

// Renamed to be more specific
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
