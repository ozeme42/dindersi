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

const DEFAULT_FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'kutu-default-1',
    text: "İslam'ın ilk ve en temel şartı aşağıdakilerden hangisidir?",
    correctAnswer: "Kelime-i Şehadet getirmek",
    options: ["Kelime-i Şehadet getirmek", "Namaz kılmak", "Oruç tutmak", "Zekat vermek"],
    type: "Çoktan Seçmeli",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-2',
    text: "Kur'an-ı Kerim'in ilk indirilen suresi hangisidir?",
    correctAnswer: "Alak Suresi",
    options: ["Alak Suresi", "Fatiha Suresi", "İhlas Suresi", "Bakara Suresi"],
    type: "Çoktan Seçmeli",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-3',
    text: "Peygamber Efendimiz Hz. Muhammed (s.a.v.) hangi şehirde dünyaya gelmiştir?",
    correctAnswer: "Mekke",
    options: ["Mekke", "Medine", "Kudüs", "Taif"],
    type: "Çoktan Seçmeli",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-4',
    text: "İslam'da farz olan oruç ibadeti hangi ayda tutulur?",
    correctAnswer: "Ramazan",
    options: ["Ramazan", "Şaban", "Recep", "Muharrem"],
    type: "Çoktan Seçmeli",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-5',
    text: "Kur'an-ı Kerim'in en kısa suresi hangisidir?",
    correctAnswer: "Kevser Suresi",
    options: ["Kevser Suresi", "İhlas Suresi", "Felak Suresi", "Nas Suresi"],
    type: "Çoktan Seçmeli",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-6',
    text: "Müslümanların kıblesi olan Kâbe hangi kutsal şehirde yer alır?",
    correctAnswer: "Mekke",
    options: ["Mekke", "Medine", "Şam", "Kudüs"],
    type: "Çoktan Seçmeli",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-7',
    text: "İslam dini paylaşma, yardımlaşma ve dürüstlüğe büyük önem verir.",
    correctAnswer: "Doğru",
    options: ["Doğru", "Yanlış"],
    type: "Doğru/Yanlış",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-8',
    text: "Hz. Muhammed (s.a.v.) güvenilirliği nedeniyle gençliğinde 'el-Emin' lakabıyla anılmıştır.",
    correctAnswer: "Doğru",
    options: ["Doğru", "Yanlış"],
    type: "Doğru/Yanlış",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-9',
    text: "Namaz kılmadan önce temizlenmek amacıyla abdest almak farzdır.",
    correctAnswer: "Doğru",
    options: ["Doğru", "Yanlış"],
    type: "Doğru/Yanlış",
    difficulty: "Kolay",
    topicId: ""
  },
  {
    id: 'kutu-default-10',
    text: "Zekât, maddi durumu yeterli olan Müslümanların yılda bir kez vermesi gereken bir ibadettir.",
    correctAnswer: "Doğru",
    options: ["Doğru", "Yanlış"],
    type: "Doğru/Yanlış",
    difficulty: "Kolay",
    topicId: ""
  }
];

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
      console.warn("Could not load from question bank, falling back:", err);
    }

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
    
    // Eğer hala soru bulunamazsa varsayılan müfredat sorularını ekle
    if (questions.length < 2) {
      questions = [...DEFAULT_FALLBACK_QUESTIONS];
    }
    
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

    return { questions: shuffledQuestions as Question[] };
    
  } catch (e: any) {
    console.error("Error getting Kutu Aç questions:", e);
    return { questions: [...DEFAULT_FALLBACK_QUESTIONS] };
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
