

'use server';

import { db } from "@/lib/firebase";
import { doc, runTransaction, arrayUnion, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import type { Question } from '@/lib/types';

const MAX_ATTEMPTS_PER_CONTEXT = 5; 

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
      where('gameType', '==', 'Kim 1000 Puan İster?'),
      where('context', '==', context) // Use the dynamic context here
    );
    const attemptsSnapshot = await getCountFromServer(attemptsQuery);
    if (attemptsSnapshot.data().count >= MAX_ATTEMPTS_PER_CONTEXT) {
      return { success: false, error: "Bu konudan daha fazla puan kazanamazsınız." };
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
          gameType: 'Kim 1000 Puan İster?',
          context: context, // Use the provided context parameter
          timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding score:", error);
    if (error.code === 'failed-precondition') {
        return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${error.message}`};
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


export async function getMillionaireQuestions({ courseId, unitId, topicId }: { courseId?: string, unitId?: string, topicId?: string }): Promise<{ questions: Question[], error?: string}> {
    noStore();
    
    const difficulties: ('Kolay' | 'Orta' | 'Zor')[] = ['Kolay', 'Kolay', 'Kolay', 'Orta', 'Orta', 'Orta', 'Orta', 'Zor', 'Zor', 'Zor'];
    
    try {
        const questionPromises = difficulties.map(difficulty => 
            getQuestionsFromBank({
                courseId,
                unitId,
                topicId,
                questionCount: 5, // Fetch a small pool for each difficulty to pick one from
                difficulty: [difficulty],
                questionTypes: ['mcq']
            })
        );

        const results = await Promise.all(questionPromises);

        const finalQuestions: Question[] = [];
        const usedQuestionIds = new Set<string>();

        for (const result of results) {
            if (result.error || result.questions.length === 0) {
                // If a specific difficulty is missing, we can try to get another question from a different difficulty
                // For simplicity now, we will just have fewer questions.
                continue;
            }
            // Find a question that hasn't been used yet
            const unusedQuestion = result.questions.find(q => q && q.id && !usedQuestionIds.has(q.id));
            
            if(unusedQuestion) {
                finalQuestions.push(unusedQuestion as Question);
                usedQuestionIds.add(unusedQuestion.id!);
            }
        }
        
        if (finalQuestions.length < 5) {
            return { questions: [], error: "Bu yarışma için yeterli sayıda (en az 5) farklı zorlukta soru bulunamadı." };
        }

        return { questions: JSON.parse(JSON.stringify(finalQuestions.slice(0, 10))) };

    } catch (e: any) {
        console.error("Error getting millionaire questions:", e);
        return { questions: [], error: "Sorular getirilirken bir hata oluştu." };
    }
}
