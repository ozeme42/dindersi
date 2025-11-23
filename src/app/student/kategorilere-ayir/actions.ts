
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { CategorizationGameData, ActivityItem } from '@/lib/types';


export async function getKategorilereAyirAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: CategorizationGameData | null; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'categorization'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { error: "Kategorilere Ayır oyunu için bu konuda veri bulunamadı.", data: null };
        }
        
        // Pick a random categorization game if multiple exist for the filter
        const randomIndex = Math.floor(Math.random() * querySnapshot.docs.length);
        const gameDoc = querySnapshot.docs[randomIndex];
        const gameData = gameDoc.data().content as CategorizationGameData;

        return { data: gameData };

    } catch (error: any) {
        console.error("Error getting categorization game data:", error);
        return { error: "Oyun verileri alınırken bir hata oluştu.", data: null };
    }
}


export async function submitKategorilereAyirScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kategorilere Ayır'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);

        // 1. Increment user's total score
        const userDocRef = doc(db, 'users', userId);
        batch.update(userDocRef, {
            score: increment(score)
        });

        // 2. Log the score event
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Kategorilere Ayır',
            context: context,
        });
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
