
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import type { Question } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export type BalloonHuntLevel = {
  q: string;
  a: string;
  wrongs: string[];
};

// Shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export async function getBalloonHuntQuestions(params: {
  topicId?: string;
}): Promise<{ levels: BalloonHuntLevel[]; error?: string }> {
  noStore();
  try {
    let q = query(
      collection(db, 'questions'),
      where('type', '==', 'Çoktan Seçmeli')
    );

    if (params.topicId) {
      q = query(q, where('topicId', '==', params.topicId));
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        levels: [],
        error:
          'Bu konu için balon avcısı oyununa uygun soru bulunamadı (en az 10 çoktan seçmeli soru gereklidir).',
      };
    }

    const allQuestions = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Question)
    );

    if (allQuestions.length < 1) {
       return {
        levels: [],
        error:
          'Bu konu için balon avcısı oyununa uygun soru bulunamadı (en az 1 çoktan seçmeli soru gereklidir).',
      };
    }

    const levels = allQuestions.map((q) => {
        const wrongs = q.options?.filter(opt => opt !== q.correctAnswer) || [];
        return {
            q: q.text,
            a: q.correctAnswer || '',
            wrongs: shuffleArray(wrongs),
        }
    }).filter(level => level.a && level.wrongs.length > 0);

    return { levels: shuffleArray(levels).slice(0, 10) };
  } catch (error: any) {
    console.error('Error fetching questions for Balloon Hunt:', error);
    return {
      levels: [],
      error: 'Sorular yüklenirken bir veritabanı hatası oluştu.',
    };
  }
}

export async function submitBalloonHuntScore(
  userId: string,
  score: number,
  context: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || score <= 0) {
    return { success: true };
  }

  try {
    const batch = writeBatch(db);

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { score: increment(score) });

    const eventRef = doc(collection(db, 'scoreEvents'));
    batch.set(eventRef, {
      userId: userId,
      points: score,
      timestamp: serverTimestamp(),
      gameType: 'Balon Avcısı',
      context: context,
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting balloon hunt score:', error);
    return { success: false, error: 'Skor kaydedilirken bir hata oluştu.' };
  }
}
