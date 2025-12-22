
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
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


export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

// Renamed and completely re-written to fit the new game logic
export async function getConceptQuizAction(
    { topicId }: { topicId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
             return { error: "Lütfen 'Tüm Konular' yerine belirli bir konu seçerek devam edin.", questions: null };
        }

        const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/curriculum/activities/${topicId}.json`);
        
        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: null };
            }
            throw new Error(`Static data failed to load from ${topicId}.json`);
        }
        
        const allItems: ActivityItem[] = await res.json();
        
        const allDefinitions = allItems.filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);
        const allConcepts = [...new Set(allItems.filter(item => item.content.term).map(item => item.content.term!))];

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
     if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
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
