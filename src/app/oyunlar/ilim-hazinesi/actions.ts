
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
import { cleanForAnagram } from '@/lib/utils';

export type IlimHazinesiLevel = {
    letters: string[];
    mainWord: string;
    info: string; // This will now hold the definition
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

// This function now fetches definitions and prepares levels based on them.
export async function getIlimHazinesiAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ levels: IlimHazinesiLevel[] | null; error?: string }> {
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
        
        const allDefinitions = querySnapshot.docs.map(doc => doc.data() as ActivityItem)
             .filter(item => 
                item.content &&
                item.content.term &&
                item.content.definition &&
                cleanForAnagram(item.content.term).replace(/\s/g, '').length >= 3 &&
                cleanForAnagram(item.content.term).replace(/\s/g, '').length <= 12
            );

        if (allDefinitions.length === 0) {
            return { error: "İlim Hazinesi oynamak için bu konuda en az 1 adet tanımı olan kavram bulunmalıdır.", levels: null };
        }
        
        const shuffled = [...allDefinitions].sort(() => 0.5 - Math.random());
        
        const gameLevels: IlimHazinesiLevel[] = [];

        for (const item of shuffled) {
            const mainWord = cleanForAnagram(item.content.term!);
            const definition = item.content.definition!;
            
            // The letters will only be from the main word itself.
            const letters = mainWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5);
            
            gameLevels.push({
                mainWord,
                info: definition, // The definition is now the info
                letters,
            });
        }
        
        if (gameLevels.length === 0) {
             return { error: "Oyun seviyeleri oluşturulamadı.", levels: null };
        }

        return { levels: JSON.parse(JSON.stringify(gameLevels)) };

    } catch (error: any) {
        console.error("Server Action Error (getIlimHazinesiAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", levels: null };
    }
}


export async function submitIlimHazinesiScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'İlim Hazinesi'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;
        
        if (attemptCount >= MAX_ATTEMPTS_PER_CONTEXT) {
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
            gameType: 'İlim Hazinesi',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Ilim Hazinesi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
