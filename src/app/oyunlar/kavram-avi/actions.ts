
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
import type { ActivityItem, Anagram } from '@/lib/types';

const MAX_ATTEMPTS_PER_CONTEXT = 10;

// Renamed from getKavramAviAction to getConceptHuntAction
export async function getConceptHuntAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Anagram[] | null; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(baseQuery);
        
        const allItems = querySnapshot.docs.map(doc => doc.data() as ActivityItem)
            .filter(item => 
                item.content?.term && 
                item.content?.definition &&
                item.content.term.trim().length > 2 &&
                !item.content.term.includes(' ')
            );

        if (allItems.length < 3) {
            return { error: "Kavram Avı oynamak için bu konuda en az 3 adet uygun kelime bulunmalıdır.", questions: null };
        }
        
        // Fisher-Yates Shuffle
        for (let i = allItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
        }
        
        const anagramQuestions: Anagram[] = allItems.map(item => {
            const correctAnswer = item.content.term!.trim().toLocaleUpperCase('tr-TR');
            return {
                definition: item.content.definition!,
                scrambledWord: correctAnswer.split('').sort(() => 0.5 - Math.random()).join(''),
                correctAnswer: correctAnswer,
            }
        });

        return { questions: JSON.parse(JSON.stringify(anagramQuestions)) };

    } catch (error: any) {
        console.error("Server Action Error (getConceptHuntAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", questions: null };
    }
}

// Renamed from submitKavramAviScoreAction to submitConceptHuntScoreAction
export async function submitConceptHuntScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) return { success: true };
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kavram Avı'),
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
            gameType: 'Kavram Avı',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitConceptHuntScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
