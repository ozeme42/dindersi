'use server';

import { db } from "@/lib/firebase";
import { doc, runTransaction, arrayUnion, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, getCountFromServer, getDoc } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import type { Question } from '@/lib/types';

const MAX_ATTEMPTS_PER_CONTEXT = 10; // Veritabanı spam koruması için üst limit
const POINT_EARN_LIMIT = 2; // Puan kazanma limiti

// --- EKSİK OLAN FONKSİYON EKLENDİ ---
export async function checkGamePlayLimitAction(userId: string, context: string): Promise<boolean> {
  noStore();
  try {
    const scoreEventsRef = collection(db, 'scoreEvents');
    // Bu kullanıcı bu dersten/konudan bu oyunu kaç kere oynamış?
    const q = query(
      scoreEventsRef,
      where('userId', '==', userId),
      where('gameType', '==', 'milyoner-yarismasi'), // Standart ID kullanıyoruz
      where('context', '==', context)
    );
    
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;
    
    // Eğer oynama sayısı 2'den azsa (0 veya 1), puan kazanabilir (true).
    return count < POINT_EARN_LIMIT;
  } catch (error) {
    console.error("Limit kontrol hatası:", error);
    return true; // Hata durumunda engellememek için
  }
}

export async function addScore(userId: string, score: number, context: string): Promise<{ success: boolean; error?: string }> {
  noStore();
  if (!userId || score <= 0) {
    return { success: true };
  }

  const userRef = doc(db, 'users', userId);
  const scoreEventsRef = collection(db, 'scoreEvents');

  try {
    // Spam/Hard limit kontrolü
    const attemptsQuery = query(
      scoreEventsRef,
      where('userId', '==', userId),
      where('gameType', '==', 'milyoner-yarismasi'),
      where('context', '==', context) 
    );
    const attemptsSnapshot = await getCountFromServer(attemptsQuery);
    const attemptCount = attemptsSnapshot.data().count;

    if (attemptCount >= MAX_ATTEMPTS_PER_CONTEXT) {
      return { success: false, error: "Bu konudan daha fazla puan kazanamazsınız (Maksimum deneme limiti)." };
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
          gameType: 'milyoner-yarismasi', // Page.tsx ile uyumlu olması için ID güncellendi
          context: context, 
          timestamp: serverTimestamp(),
          attemptNumber: attemptCount + 1,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding score:", error);
    if (error.code === 'failed-precondition') {
        return { success: false, error: `Veritabanı indeksi eksik. Lütfen konsolu kontrol edin.`};
    }
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
    
    // Eğer ownedItems dizisi yoksa veya rozeti içermiyorsa ekle
    const ownedItems = userData.ownedItems || [];
    if (!ownedItems.includes(millionaireBadgeId)) {
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

export async function getMillionaireQuestions({ courseId, unitId, topicId }: { courseId?: string, unitId?: string, topicId?: string }): Promise<{ questions: Question[], error?: string}> {
    noStore();
    
    // Milyoner formatı için kolaydan zora sıralama
    const difficulties: ('Kolay' | 'Orta' | 'Zor')[] = ['Kolay', 'Kolay', 'Kolay', 'Orta', 'Orta', 'Orta', 'Orta', 'Zor', 'Zor', 'Zor'];
    
    try {
        const questionPromises = difficulties.map(difficulty => 
            getQuestionsFromBank({
                courseId,
                unitId,
                topicId,
                questionCount: 5, // Havuzdan rastgele çekmek için her zorluktan 5 tane istiyoruz
                difficulty: [difficulty],
                questionTypes: ['mcq']
            })
        );

        const results = await Promise.all(questionPromises);

        const finalQuestions: Question[] = [];
        const usedQuestionIds = new Set<string>();

        for (const result of results) {
            if (result.error || result.questions.length === 0) {
                continue;
            }
            // Daha önce kullanılmamış bir soru bul
            const unusedQuestion = result.questions.find(q => q && q.id && !usedQuestionIds.has(q.id));
            
            if(unusedQuestion) {
                finalQuestions.push(unusedQuestion as Question);
                usedQuestionIds.add(unusedQuestion.id!);
            }
        }
        
        if (finalQuestions.length < 10) {
            // Yeterli soru yoksa hata döndürme, eldekini ver (veya doldur)
             if (finalQuestions.length < 5) {
                return { questions: [], error: "Yarışma için yeterli soru bulunamadı." };
             }
        }

        // Deep copy ve dilimleme
        return { questions: JSON.parse(JSON.stringify(finalQuestions.slice(0, 10))) };

    } catch (e: any) {
        console.error("Error getting millionaire questions:", e);
        return { questions: [], error: "Sorular getirilirken bir hata oluştu." };
    }
}