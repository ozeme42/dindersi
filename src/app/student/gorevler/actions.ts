import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import type { Course, Unit, Topic, UserProgress } from "@/lib/types";

// 1. Öğrencinin sınıfına ait dersleri ve içeriklerini getir
export async function getStudentCurriculum(classId: string) {
  try {
    // Sınıfa ait dersleri çek
    const q = query(
      collection(db, "courses"), 
      where("classId", "==", classId),
      orderBy("title", "asc")
    );
    const coursesSnap = await getDocs(q);
    
    const courses: (Course & { units: any[] })[] = [];

    for (const courseDoc of coursesSnap.docs) {
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      
      // Üniteleri çek
      const unitsRef = collection(db, `courses/${courseDoc.id}/units`);
      const unitsSnap = await getDocs(query(unitsRef, orderBy("title", "asc")));
      
      const units = [];
      for (const unitDoc of unitsSnap.docs) {
        const unitData = { id: unitDoc.id, ...unitDoc.data() } as Unit;
        
        // Konuları çek
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

// 2. EKSİK OLAN FONKSİYON: Öğrencinin genel konu ilerlemesini getir (Kilitleri açmak için)
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

// 3. Belirli bir konudaki oyun skorlarını getir (Modal içindeki oyun kilitleri için)
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
            // Eğer oyun tamamlandıysa (completed: true) veya puanı varsa en yüksek olanı al
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