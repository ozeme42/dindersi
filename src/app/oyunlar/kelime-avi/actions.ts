
'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  limit 
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

const MAX_ATTEMPTS_PER_CONTEXT = 10;
const POOL_SIZE_LIMIT = 50; 

export async function getKelimeAviAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ concepts: string[] | null; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'concept'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const limitedQuery = query(baseQuery, limit(POOL_SIZE_LIMIT));
        const querySnapshot = await getDocs(limitedQuery);
        
        const allConcepts = querySnapshot.docs
            .map(doc => (doc.data() as ActivityItem).content?.text)
            .filter((text): text is string => 
                typeof text === 'string' && 
                text.trim().length > 2 &&
                text.trim().length <= 12 &&
                !text.includes(' ')
            )
            .map(text => text.toLocaleUpperCase('tr-TR'));

        if (allConcepts.length < 5) {
            return { error: "Kelime Avı oynamak için bu konuda en az 5 adet uygun kelime bulunmalıdır.", concepts: null };
        }
        
        // Fisher-Yates Shuffle
        for (let i = allConcepts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allConcepts[i], allConcepts[j]] = [allConcepts[j], allConcepts[i]];
        }

        return { concepts: JSON.parse(JSON.stringify(allConcepts.slice(0, 15))) };

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
    if (!userId || score <= 0) return { success: true };
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kelime Avı'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        
        if (attemptsSnapshot.data().count >= MAX_ATTEMPTS_PER_CONTEXT) {
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
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitKelimeAviScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
