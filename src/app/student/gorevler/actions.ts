'use server';

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  runTransaction, 
  serverTimestamp, 
  increment 
} from "firebase/firestore";
import type { Course, Unit, Topic, UserProgress } from "@/lib/types";

// --- SUNUCU TARAFLI SERİLEŞTİRİCİ ---
// Firebase Timestamp objelerini ve diğer karmaşık yapıları Client'a geçmeden önce 
// Next.js'in kabul edeceği saf (plain) string veya objelere dönüştürür.
function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  // Aktif Firestore Timestamp objesi ise
  if (typeof data === 'object' && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  
  // Raw Timestamp formatında gelmişse
  if (typeof data === 'object' && 'seconds' in data && 'nanoseconds' in data) {
    return new Date(data.seconds * 1000).toISOString();
  }

  // JS Date objesi ise
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Array ise içindeki tüm elemanları gez
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  // Obje ise içindeki tüm key'leri gez
  if (typeof data === 'object') {
    const newData: any = {};
    for (const key of Object.keys(data)) {
      newData[key] = serializeData(data[key]);
    }
    return newData;
  }
  
  return data;
}

// 1. Öğrencinin sınıfına ait dersleri ve içeriklerini getir
export async function getStudentCurriculum(classId: string) {
  try {
    const q = query(
      collection(db, "courses"), 
      where("classId", "==", classId),
      orderBy("title", "asc")
    );
    const coursesSnap = await getDocs(q);
    
    const courses: (Course & { units: any[] })[] = [];

    for (const courseDoc of coursesSnap.docs) {
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      
      const unitsRef = collection(db, `courses/${courseDoc.id}/units`);
      const unitsSnap = await getDocs(query(unitsRef, orderBy("title", "asc")));
      
      const units = [];
      for (const unitDoc of unitsSnap.docs) {
        const unitData = { id: unitDoc.id, ...unitDoc.data() } as Unit;
        
        const topicsRef = collection(db, `courses/${courseDoc.id}/units/${unitDoc.id}/topics`);
        const topicsSnap = await getDocs(query(topicsRef, orderBy("title", "asc")));
        const topics = topicsSnap.docs.map(t => ({ id: t.id, ...t.data() } as Topic));
        
        units.push({ ...unitData, topics });
      }
      
      courses.push({ ...courseData, units });
    }

    // KRİTİK NOKTA: Veriyi Client'a göndermeden önce serileştiriyoruz.
    return serializeData(courses);
  } catch (error) {
    console.error("Müfredat hatası:", error);
    return [];
  }
}

// 2. Öğrencinin genel konu ilerlemesini getir
export async function getUserTopicProgress(userId: string) {
  try {
    const docRef = doc(db, "userProgress", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // KRİTİK NOKTA: İlerleme verisini de serileştiriyoruz.
      return serializeData(docSnap.data() as UserProgress);
    }
    return {};
  } catch (error) {
    console.error("İlerleme verisi çekilemedi:", error);
    return {};
  }
}

// 3. Belirli bir konudaki oyun skorlarını getir
export async function getUserTopicGameScores(userId: string, topicId: string) {
    try {
        const q = query(
            collection(db, "scoreEvents"),
            where("userId", "==", userId),
            where("context", "==", topicId)
        );
        const snapshot = await getDocs(q);
        
        const scores: Record<string, number> = {};
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!scores[data.gameType] || data.points > scores[data.gameType]) {
                scores[data.gameType] = data.points;
            }
        });
        
        // Puanlar sadece sayı olduğu için burada serileştirmeye gerek yok
        return scores;
    } catch (error) {
        console.error("Skorlar çekilemedi", error);
        return {};
    }
}

// 4. Bölüm Sonu Ödülünü Al, Puanı İşle ve KONUYU TAMAMLANDI SAY
export async function claimTopicRewardAction(userId: string, topicId: string, reward: number, topicTitle: string) {
  try {
    // 1. Kontrol: Bu ödül daha önce alınmış mı?
    const eventsRef = collection(db, 'scoreEvents');
    const q = query(
      eventsRef,
      where('userId', '==', userId),
      where('context', '==', topicId),
      where('gameType', '==', 'topic-completion-reward')
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { success: false, error: "Bu ödülü zaten aldınız." };
    }

    // 2. Transaction ile tüm işlemleri yap
    await runTransaction(db, async (transaction) => {
      // Referanslar
      const userRef = doc(db, 'users', userId);
      const userProgressRef = doc(db, 'userProgress', userId); // İlerleme tablosu
      const newEventRef = doc(collection(db, 'scoreEvents'));

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");

      // A: Kullanıcıya puanı ekle
      transaction.update(userRef, {
        score: increment(reward)
      });

      // B: ScoreEvents'e kayıt at (Log)
      transaction.set(newEventRef, {
        userId,
        points: reward,
        context: topicId,
        gameType: 'topic-completion-reward',
        timestamp: serverTimestamp(),
        isMission: true,
        description: `${topicTitle} Konu Tamamlama Ödülü`,
        completed: true
      });

      // C: KRİTİK KISIM - Konuyu 'Tamamlandı' olarak işaretle
      transaction.set(userProgressRef, {
        [topicId]: {
            completionCount: increment(1), 
            completed: true,
            lastCompletedAt: serverTimestamp()
        }
      }, { merge: true }); 
    });

    return { success: true };

  } catch (error) {
    console.error("Ödül alma hatası:", error);
    return { success: false, error: "Ödül alınırken bir hata oluştu." };
  }
}