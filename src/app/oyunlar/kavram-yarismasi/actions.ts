
'use server';

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
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        let allItems: ActivityItem[] = [];
        
        // This game needs a broader pool of terms for distractors, so we might need to fetch more than one topic.
        // For simplicity with static files, we'll try to get data from topic, then unit, then course.
        
        let urlToFetch = '';
        if (topicId && topicId !== 'all') {
            urlToFetch = `${baseUrl}/curriculum/activities/${topicId}.json`;
        } else {
             // In a static setup, fetching by unit or course is complex without a full manifest.
             // We'll return an error to guide the user to select a specific topic.
             return { error: "Lütfen 'Tüm Konular' yerine belirli bir konu seçerek devam edin.", questions: null };
        }
        
        const res = await fetch(urlToFetch);
        if (res.ok) {
            allItems = await res.json();
        } else if (res.status === 404) {
             return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: null };
        } else {
            throw new Error(`Static data failed to load from ${urlToFetch}`);
        }
        
        const allDefinitions = allItems.filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);
        const allConcepts = [...new Set(allDefinitions.map(item => item.content.term!))];

        if (allDefinitions.length < 1 || allConcepts.length < 8) {
            return { error: "Bu oyun için en az 1 tanım ve 8 farklı kavram gereklidir.", questions: null };
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
     if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
        console.log("Static mode: Score submission is disabled.");
        return { success: true };
    }
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    // Lazy-load server-only imports
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, getCountFromServer, writeBatch, doc, serverTimestamp, increment } = await import('firebase/firestore');

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
