'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';

// Puan ekleme fonksiyonu
export async function addScore(
  userId: string,
  scoreToAdd: number,
  context: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !scoreToAdd) {
    return { success: false, error: 'Kullanıcı ID veya puan belirtilmedi.' };
  }

  const userRef = doc(db, 'users', userId);
  const scoreEventRef = doc(collection(db, 'scoreEvents'));

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('Kullanıcı bulunamadı.');
      }
      const currentScore = userDoc.data().score || 0;
      const newScore = currentScore + scoreToAdd;

      transaction.update(userRef, { score: newScore });

      transaction.set(scoreEventRef, {
        userId: userId,
        points: scoreToAdd,
        gameType: 'Milyoner',
        context: context,
        timestamp: serverTimestamp(),
      });
    });
    return { success: true };
  } catch (e: any) {
    console.error('Puan ekleme sırasında hata:', e);
    return { success: false, error: e.message };
  }
}

// Rozet kontrol ve ekleme fonksiyonu
export async function checkAndAwardMillionaireBadge(
  userId: string
): Promise<{ success: boolean; awarded?: boolean }> {
  if (!userId) {
    return { success: false, error: 'Kullanıcı ID belirtilmedi.' };
  }

  const userRef = doc(db, 'users', userId);
  const millionaireBadgeId = 'badge_crown';

  try {
    const userDoc = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(userRef);
      if (!docSnap.exists()) {
        throw new Error('Kullanıcı bulunamadı.');
      }
      const userData = docSnap.data();
      const ownedItems = userData.ownedItems || [];

      if (!ownedItems.includes(millionaireBadgeId)) {
        transaction.update(userRef, {
          ownedItems: arrayUnion(millionaireBadgeId),
        });
        return { changed: true };
      }
      return { changed: false };
    });

    return { success: true, awarded: userDoc.changed };
  } catch (e: any) {
    console.error('Milyoner rozeti verilirken hata:', e);
    return { success: false, error: e.message };
  }
}
