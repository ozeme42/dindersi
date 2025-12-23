
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
import fs from 'fs/promises';
import path from 'path';

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
        if (!topicId || topicId === 'all') {
             return { error: "Lütfen 'Tüm Konular' yerine belirli bir konu seçerek devam edin.", questions: null };
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const allItems: ActivityItem[] = JSON.parse(fileContent);
            
            const allDefinitions = allItems.filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);
            const allConcepts = [...new Set(allItems.filter(item => item.content.term).map(item => item.content.term!))];

            if (allDefinitions.length < 1 || allConcepts.length < 8) {
                return { error: "Bu oyun için en az 1 tanım ve 8 farklı kavram gereklidir.", questions: null };
            }
            
            const gameQuestions: ConceptQuizQuestion[] = [];

            for (const item of allDefinitions) {
                const correctAnswer = item.content.term!;
                const definition = item.content.definition!;

                const distractors = allConcepts
                    .filter(concept => concept !== correctAnswer)
                    .sort(() => 0.5 - Math.random()) 
                    .slice(0, 7);

                if (distractors.length < 7) {
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
            
            const shuffledGameQuestions = gameQuestions.sort(() => 0.5 - Math.random());
            return { questions: JSON.parse(JSON.stringify(shuffledGameQuestions)) };

        } catch (fileError: any) {
            if (fileError.code === 'ENOENT') {
                return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: null };
            }
            throw fileError;
        }

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
