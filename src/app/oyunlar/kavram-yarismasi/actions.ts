
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
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';


export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

export async function getConceptQuizAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string; unitId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
    noStore();
    try {
        let itemsForTopic = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });

        const pairs: { term: string; definition: string }[] = [];
        const fallbackTerms = ['İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 'Adalet', 'Merhamet', 'Sabır', 'Şükür', 'İhlas', 'Takva', 'Furkan'];

        for (const item of itemsForTopic || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term && (item as any).content?.definition) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition).trim();
                    if (t.length >= 2 && t.length <= 35) pairs.push({ term: t, definition: d });
                } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).text || (item as any).question)) {
                    const t = String((item as any).correctAnswer).trim();
                    const d = String((item as any).text || (item as any).question).trim();
                    if (t.length >= 2 && t.length <= 35) pairs.push({ term: t, definition: d });
                }
            }
        }

        if (pairs.length < 1) {
            return { error: "Bu konu için oynanabilir tanım veya soru verisi bulunamadı.", questions: null };
        }

        const allTermsFromDefinitions = [...new Set([...pairs.map(p => p.term), ...fallbackTerms])];
        
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of pairs) {
            const correctAnswer = item.term;
            const definition = item.definition;

            let distractors = allTermsFromDefinitions
                .filter(term => term.toLocaleLowerCase('tr-TR') !== correctAnswer.toLocaleLowerCase('tr-TR'))
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            while (distractors.length < 3) {
                distractors.push(['İhlas', 'Takva', 'Furkan'][distractors.length]);
            }

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

            gameQuestions.push({
                definition: definition,
                options: options,
                correctAnswer: correctAnswer
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
        console.error("Error submitting Kavram Yarışması score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
