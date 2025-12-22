
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

export async function getConceptHuntAction({ 
    courseId, 
    unitId, 
    topicId,
    isStatic 
}: { 
    courseId?: string; 
    unitId?: string; 
    topicId?: string; 
    isStatic?: boolean;
}): Promise<{ questions: Anagram[] | null; error?: string }> {
    noStore();
    try {
        let allItems: Pick<ActivityItem, 'id' | 'content'>[] = [];
        
        if (isStatic && topicId && topicId !== 'all') {
             try {
                // IMPORTANT: We need to construct the absolute URL for server-side fetch
                const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                const res = await fetch(`${baseUrl}/curriculum/activities/${topicId}.json`);
                
                if (res.ok) {
                    const staticItems: ActivityItem[] = await res.json();
                    allItems = staticItems.filter(item => item.type === 'definition').map(item => ({ id: item.id, content: item.content }));
                } else if (res.status === 404) {
                    // This is not a critical error, we can fallback to firestore
                     console.warn(`Static activity file not found for topic ${topicId}, falling back to Firestore.`);
                } else {
                     throw new Error(`Failed to fetch static data: ${res.statusText}`);
                }
             } catch (e) {
                 console.warn("Could not fetch static activity file, will try Firestore.", e);
             }
        }
        
        if (allItems.length === 0) { // Fallback to Firestore if static fetch fails or not in static mode
            let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

            if (topicId && topicId !== 'all') {
                baseQuery = query(baseQuery, where("topicId", "==", topicId));
            } else if (unitId && unitId !== 'all') {
                baseQuery = query(baseQuery, where("unitId", "==", unitId));
            } else if (courseId && courseId !== 'all') {
                baseQuery = query(baseQuery, where("courseId", "==", courseId));
            }

            const querySnapshot = await getDocs(baseQuery);
            allItems = querySnapshot.docs.map(doc => ({ id: doc.id, content: doc.data().content as ActivityItem['content'] }));
        }

        const validItems = allItems.filter(item => 
            item.content?.term && 
            item.content?.definition &&
            item.content.term.trim().length > 2 &&
            !item.content.term.includes(' ')
        );

        if (validItems.length < 1) {
            return { error: "Kavram Avı oynamak için bu konuda en az 1 adet uygun kelime bulunmalıdır.", questions: null };
        }
        
        for (let i = validItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validItems[i], validItems[j]] = [validItems[j], validItems[i]];
        }
        
        const anagramQuestions: Anagram[] = validItems.map(item => {
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
