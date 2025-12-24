
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
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
    if (!topicId) {
        return { error: "Geçerli bir konu ID'si gerekli.", questions: null };
    }

    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
        const allItemsForTopicPath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);

        const [fileContent, allItemsContent] = await Promise.all([
            fs.readFile(filePath, 'utf-8').catch(() => null),
            fs.readFile(allItemsForTopicPath, 'utf-8').catch(() => null)
        ]);

        if (!fileContent || !allItemsContent) {
            return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: null };
        }

        const allDefinitions: ActivityItem[] = JSON.parse(fileContent).filter((item: ActivityItem) => 
            item.type === 'definition' && item.content?.term && item.content?.definition
        );
        
        const allItems: ActivityItem[] = JSON.parse(allItemsContent);
        const allTermsInTopic = [...new Set(
            allItems
                .map(item => item.content?.term || item.content?.text)
                .filter(Boolean)
        )] as string[];

        if (allDefinitions.length < 1) {
            return { error: "Bu konu için oynanabilir tanım ('definition') verisi bulunamadı.", questions: null };
        }
        if (allTermsInTopic.length < 8) {
            return { error: "Bu oyun için en az 8 farklı kavram gereklidir. Lütfen veri bankasına daha fazla kavram ekleyin.", questions: null };
        }
        
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of allDefinitions) {
            const correctAnswer = item.content.term!;
            const definition = item.content.definition!;

            const distractors = allTermsInTopic
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
