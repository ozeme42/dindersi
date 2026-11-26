'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  increment, 
  collection, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getCountFromServer,
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';
import { getQuestionsFromBank, getRegisteredStudioItemsForGame } from "@/lib/quiz-actions";
import { prepareStudioDefinitionPairs, shuffleArray } from '@/lib/studio-game-helpers';

export async function getKutuAcQuestionsAction(
  { courseId, unitId, topicId, questionCount }: { courseId?: string; unitId?: string; topicId?: string; questionCount?: number }
): Promise<{ questions: Question[]; error?: string }> {
  noStore();
  try {
    const requestedCount = questionCount || 999;

    const params = {
      courseId,
      unitId,
      topicId,
      questionCount: requestedCount,
      questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış', 'mcq', 'tf'],
    };

    let questions: Question[] = [];
    try {
      const result = await getQuestionsFromBank(params);
      questions = (result.questions || []) as Question[];
    } catch (err) {
      console.warn("Could not load from question bank, checking registered studio definitions:", err);
    }

    if (questions.length < 5) {
      try {
        const effectiveTopicId = (topicId && topicId !== unitId && topicId !== 'preview-topic' && topicId !== 'unit-flow' && topicId !== 'all')
          ? topicId
          : undefined;
        const studio = await getRegisteredStudioItemsForGame({ courseId, unitId, topicId: effectiveTopicId });
        const definitions = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
          minTermLength: 2,
          maxTermLength: 40,
          cleanClue: true,
        });

        if (definitions.length >= 2) {
          definitions.forEach((dItem, idx) => {
            const isTrue = idx % 2 === 0;
            const shownTerm = isTrue ? dItem.term : definitions[(idx + 1) % definitions.length].term;
            const statement = `${shownTerm}, ${dItem.definition}`;
            if (!questions.some(q => q.text === statement)) {
              questions.push({
                id: `kutu-tf-${idx}`,
                type: 'Doğru/Yanlış',
                text: statement,
                correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
                options: ['Doğru', 'Yanlış'],
                difficulty: 'Orta',
                topicId: effectiveTopicId || '',
              } as any);
            }
          });
        }
      } catch (studioErr) {
        console.warn("Could not load registered studio definitions for Kutu Aç:", studioErr);
      }
    }

    if (questions.length < 2) {
      return {
        questions: [],
        error: "Kutu Aç oyunu için bu konuda yeterli soru veya Kavram ve Notlar Stüdyosu tanımı bulunamadı.",
      };
    }

    return { questions: shuffleArray(questions) as Question[] };

  } catch (e: any) {
    console.error("Error getting Kutu Aç questions:", e);
    return { questions: [], error: "Sorular yüklenirken teknik bir hata oluştu." };
  }
}

export async function submitKutuAcScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || score <= 0) {
    return { success: true };
  }

  try {
    const attemptsQuery = query(
      collection(db, 'scoreEvents'),
      where('userId', '==', userId),
      where('gameType', '==', 'Kutu Aç'),
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
      gameType: 'Kutu Aç',
      context: context,
      attemptNumber: attemptsSnapshot.data().count + 1
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting Kutu Aç score:", error);
    return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
  }
}
