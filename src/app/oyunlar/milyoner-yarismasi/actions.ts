'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, arrayUnion, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';

const MAX_ATTEMPTS_PER_CONTEXT = 10; // Allow 10 wins/withdraws per day for the same context

export async function addScore(userId: string, score: number, context: string): Promise<{ success: boolean; error?: string }> {
  noStore();
  if (!userId || score <= 0) {
    return { success: true };
  }

  const userRef = doc(db, 'users', userId);
  const scoreEventsRef = collection(db, 'scoreEvents');

  try {
     // Check attempt limit
    const attemptsQuery = query(
      scoreEventsRef,
      where('userId', '==', userId),
      where('gameType', '==', 'Milyoner'),
      where('context', '==', context)
    );
    const attemptsSnapshot = await getCountFromServer(attemptsQuery);
    if (attemptsSnapshot.data().count >= MAX_ATTEMPTS_PER_CONTEXT) {
      return { success: false, error: "Günlük puan kazanma limitine ulaştınız." };
    }

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("Kullanıcı bulunamadı.");
      }
      const newScore = (userDoc.data().score || 0) + score;
      transaction.update(userRef, { score: newScore });

      const newScoreEventRef = doc(scoreEventsRef);
      transaction.set(newScoreEventRef, {
          userId: userId,
          points: score,
          gameType: 'Milyoner',
          context: context,
          timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding score:", error);
    return { success: false, error: "Puan eklenirken bir hata oluştu." };
  }
}

export async function checkAndAwardMillionaireBadge(userId: string): Promise<{ success: boolean; error?: string }> {
  noStore();
  if (!userId) {
    return { success: false, error: "Kullanıcı ID'si eksik." };
  }

  const userRef = doc(db, 'users', userId);
  const millionaireBadgeId = 'badge_millionaire';

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        throw new Error("Kullanıcı bulunamadı.");
    }
    const userData = userDoc.data();
    
    if (!userData.ownedItems?.includes(millionaireBadgeId)) {
        await updateDoc(userRef, {
            ownedItems: arrayUnion(millionaireBadgeId)
        });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error awarding badge:", error);
    return { success: false, error: "Rozet verilirken bir hata oluştu." };
  }
}
