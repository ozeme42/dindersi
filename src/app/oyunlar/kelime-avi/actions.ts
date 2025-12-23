
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment,
  getDocs
} from 'firebase/firestore';


export async function getKelimeAviAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ concepts: string[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId && !unitId && !courseId) {
            return { error: "Kelime Avı oynamak için bir ders, ünite veya konu seçmelisiniz.", concepts: null };
        }

        let q = query(collection(db, "activityItems"), where("type", "in", ["concept", "definition"]));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(q);

        const allConcepts = querySnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .map(item => item.content.text || item.content.term)
            .filter((text): text is string => 
                typeof text === 'string' && 
                text.trim().length > 2 &&
                text.trim().length <= 12 &&
                !text.includes(' ')
            )
            .map(text => text.toLocaleUpperCase('tr-TR'));

        const uniqueConcepts = [...new Set(allConcepts)];

        if (uniqueConcepts.length < 5) {
            return { error: "Kelime Avı oynamak için bu konuda en az 5 adet uygun kelime bulunmalıdır.", concepts: null };
        }
        
        for (let i = uniqueConcepts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueConcepts[i], uniqueConcepts[j]] = [uniqueConcepts[j], uniqueConcepts[i]];
        }

        return { concepts: JSON.parse(JSON.stringify(uniqueConcepts)) };

    } catch (error: any) {
        console.error("Server Action Error (getKelimeAviAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", concepts: null };
    }
}

export async function submitKelimeAviScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kelime Avı'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
            return { 
                success: false, 
                error: `Bu etkinlikten daha fazla puan kazanamazsınız. Lütfen farklı bir konu seçin.` 
            };
        }

        const batch = writeBatch(db);
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Kelime Avı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitKelimeAviScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
