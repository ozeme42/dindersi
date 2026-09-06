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
  increment,
  arrayUnion
} from "firebase/firestore";
import fs from 'fs/promises';
import path from 'path';
import type { Course, Unit, Topic, UserProgress } from "@/lib/types";

let MANIFEST_CACHE: any = null;

// 1. Öğrencinin sınıfına ait dersleri ve içeriklerini getir (STATİK MANIFEST ÖNCELİKLİ - 0 KOTA MALİYETİ)
export async function getStudentCurriculum(classId: string, className?: string) {
  try {
    // 1. Statik Manifest Önceliği (0 Firestore Okuması):
    try {
      if (!MANIFEST_CACHE) {
        const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        const content = await fs.readFile(manifestPath, 'utf-8');
        MANIFEST_CACHE = JSON.parse(content);
      }
      
      if (MANIFEST_CACHE && MANIFEST_CACHE.classGroups) {
        const cleanName = className ? className.replace(/[^0-9]/g, '') || className : '';
        const group = MANIFEST_CACHE.classGroups.find((g: any) => 
          (cleanName && g.name === cleanName) ||
          (className && g.name === className) || 
          (classId && g.id === classId)
        );
        if (group && group.courses && group.courses.length > 0) {
          return group.courses;
        }
      }
    } catch(e) {
      console.warn("Manifest okuma uyarısı:", e);
    }

    // 2. Fallback: Firestore (Sadece manifestte bulunamazsa)
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

    return courses;
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
      return docSnap.data() as UserProgress;
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
        
        return scores;
    } catch (error) {
        console.error("Skorlar çekilemedi", error);
        return {};
    }
}

// 4. Bölüm Sonu Ödülünü Al, Puanı İşle ve KONUYU TAMAMLANDI SAY (DÜZELTİLEN KISIM)
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

      // A: Kullanıcıya puanı ekle ve tamamlanan konuyu profile işle
      transaction.update(userRef, {
        score: increment(reward),
        completedTopics: arrayUnion(topicId)
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
      // Bu sayede bir sonraki konunun kilidi açılacak.
      transaction.set(userProgressRef, {
        [topicId]: {
            completionCount: increment(1), // Tamamlanma sayısını artır
            completed: true,
            lastCompletedAt: serverTimestamp()
        }
      }, { merge: true }); // Diğer konuların verisini silmemek için merge: true
    });

    return { success: true };

  } catch (error) {
    console.error("Ödül alma hatası:", error);
    return { success: false, error: "Ödül alınırken bir hata oluştu." };
  }
}