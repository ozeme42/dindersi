
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question } from "@/lib/types";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string' && obj.type === 'Çoktan Seçmeli';
}

type BalloonHuntQuestion = {
    q: string;
    a: string;
    wrongs: string[];
};

// Centralized function to fetch questions
export async function getBalloonHuntQuestions(params: { topicId?: string }): Promise<{ questions: BalloonHuntQuestion[], error?: string }> {
    const { topicId } = params;

    try {
        let q: any = collection(db, "questions");
        const conditions = [where("type", "==", "Çoktan Seçmeli")];

        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        }

        q = query(q, ...conditions, firestoreLimit(50));
        
        const querySnapshot = await getDocs(q);
        
        const allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Question;
        });

        if (allQuestions.length < 1) {
            return { questions: [], error: "Bu konu için uygun çoktan seçmeli soru bulunamadı." };
        }

        const formattedQuestions: BalloonHuntQuestion[] = allQuestions
            .map(q => {
                if (!q.options || q.options.length < 2 || !q.correctAnswer) {
                    return null;
                }
                const wrongs = q.options.filter(opt => opt !== q.correctAnswer);
                return {
                    q: q.text,
                    a: q.correctAnswer,
                    wrongs: wrongs,
                };
            })
            .filter((q): q is BalloonHuntQuestion => q !== null);
        
        if (formattedQuestions.length === 0) {
             return { questions: [], error: "Oyun için geçerli formatta soru bulunamadı. Lütfen soruların en az 2 seçeneği ve bir doğru cevabı olduğundan emin olun." };
        }


        return { questions: JSON.parse(JSON.stringify(formattedQuestions)) };

    } catch (e: any) {
        console.error("Error fetching balloon hunt questions:", e);
        if (e.code === 'failed-precondition') {
            return { questions: [], error: `Veritabanı indeksi eksik. Geliştirici konsolundaki linki kullanarak indeksi oluşturun. Hata: ${e.message}` };
        }
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}


export async function submitBalloonHuntScore(userId: string, score: number, context: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !context) {
    return { success: false, error: 'Kullanıcı veya konu bilgisi eksik.' };
  }
  if (score <= 0) {
    return { success: true }; // No need to save zero or negative score
  }

  try {
    const scoreEventRef = collection(db, 'scoreEvents');
    await addDoc(scoreEventRef, {
      userId,
      points: score,
      gameType: 'Balon Avcısı',
      context,
      timestamp: new Date(),
    });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentScore = userDoc.data().score || 0;
      await updateDoc(userRef, {
        score: currentScore + score,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting score:', error);
    return { success: false, error: 'Skor kaydedilirken bir hata oluştu.' };
  }
}
