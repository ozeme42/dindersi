
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

export async function getConceptQuizAction(
    { topicId }: { topicId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId) {
             return { error: "Lütfen bir konu seçerek devam edin.", questions: null };
        }

        // Get all definitions for the selected topic
        const definitionsQuery = query(
            collection(db, "activityItems"), 
            where("topicId", "==", topicId), 
            where("type", "==", "definition")
        );
        
        // Get ALL concepts for the same topic to use as distractors
        const allConceptsQuery = query(
            collection(db, "activityItems"), 
            where("topicId", "==", topicId),
            where("type", "in", ["concept", "definition"])
        );

        const [definitionsSnapshot, allItemsSnapshot] = await Promise.all([
            getDocs(definitionsQuery),
            getDocs(allConceptsQuery),
        ]);
        
        const allDefinitions = definitionsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        // Create a unique set of all terms (concepts) within the topic
        const allTermsInTopic = [...new Set(
            allItemsSnapshot.docs.map(doc => (doc.data() as ActivityItem).content.term).filter(Boolean)
        )] as string[];

        if (allDefinitions.length < 1) {
            return { error: "Bu konu için oynanabilir tanım ('definition') verisi bulunamadı.", questions: null };
        }
        if (allTermsInTopic.length < 4) {
             return { error: "Bu oyun için en az 4 farklı kavram gereklidir. Lütfen veri bankasına daha fazla kavram ekleyin.", questions: null };
        }
        
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of allDefinitions) {
            const correctAnswer = item.content.term!;
            const definition = item.content.definition!;

            // Get 3 other random terms from the topic to use as distractors
            const distractors = allTermsInTopic
                .filter(concept => concept !== correctAnswer) // Exclude the correct answer
                .sort(() => 0.5 - Math.random()) // Shuffle the rest
                .slice(0, 3); // Get the first 3

            // Ensure we have enough distractors
            if (distractors.length < 3) {
                continue; // Skip this question if not enough distractors can be found
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
        
        const shuffledGameQuestions = gameQuestions.sort(() => 0.5 - Math.random());
        return { questions: JSON.parse(JSON.stringify(shuffledGameQuestions)) };

    } catch (error: any) {
        console.error("Error getting Kavram Yarışması questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: null };
    }
}

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
            gameType: 'Kavram Yarışması',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
