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
import { getQuestionsFromBank } from "@/lib/quiz-actions";

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
    
    const result = await getQuestionsFromBank(params);
    let questions = (result.questions || []) as Question[];

    if (questions.length < 5) {
      try {
        const { getStaticGameData } = await import('@/lib/quiz-actions');
        const allItems = await getStaticGameData({ courseId, unitId, topicId });
        const definitions = allItems.filter(it => 'type' in it && it.type === 'definition' && (it as any).content?.term && (it as any).content?.definition);
        
        definitions.forEach((dItem, idx) => {
          const term = (dItem as any).content.term.trim();
          const def = (dItem as any).content.definition.trim();
          const isTrue = idx % 2 === 0;
          let statement = `${term}, ${def}`;
          if (!isTrue && definitions.length > 1) {
            const wrongTerm = (definitions[(idx + 1) % definitions.length] as any).content.term.trim();
            statement = `${wrongTerm}, ${def}`;
          }
          if (!questions.some(q => q.text === statement)) {
            questions.push({
              id: `kutu-tf-${idx}-${Date.now()}`,
              type: 'Doğru/Yanlış',
              text: statement,
              correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
              options: ['Doğru', 'Yanlış'],
              difficulty: 'Orta',
              topicId: topicId || ''
            } as any);
          }
        });
      } catch (fallbackErr) {}
    }
    
    if (questions.length < 2) {
       return { questions: [], error: "Bu oyun için yeterli soru bulunamadı (En az 2 soru gereklidir)." };
    }
    
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

    return { questions: shuffledQuestions as Question[] };
    
  } catch (e: any) {
    console.error("Error getting Kutu Aç questions:", e);
    return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
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