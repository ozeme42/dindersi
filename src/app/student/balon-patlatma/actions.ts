'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type BalloonPoppingRound = {
    question: string;
    answer: string;
    decoys: string[];
};

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export async function getBalloonPoppingAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: BalloonPoppingRound[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
             return { error: "Lütfen oynamak için belirli bir konu seçin.", data: null };
        }
        
        // 1. Fetch all definition items and concept items for the selected TOPIC.
        const itemsQuery = query(
            collection(db, 'activityItems'),
            where('topicId', '==', topicId),
            where('type', 'in', ['definition', 'concept'])
        );
        
        const itemsSnapshot = await getDocs(itemsQuery);
        
        const definitions = itemsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

        const concepts = itemsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.type === 'concept' && item.content?.text)
            .map(item => item.content.text!);

        if (definitions.length < 1) {
            return { error: "Balon Patlatma oyunu için bu konuda uygun tanım-kavram çifti bulunamadı.", data: null };
        }
        
        // The pool for decoy words will be all concepts from the topic, including the correct answers themselves.
        const decoyPool = [...new Set([...concepts, ...definitions.map(d => d.content.term!)])];

        if (decoyPool.length < 3) {
            return { error: "Yeterli sayıda çeldirici kelime bulunamadı (en az 3 farklı kavram gerekir).", data: null };
        }
        
        const gameRounds: BalloonPoppingRound[] = [];
        for (const item of definitions) {
            const answer = item.content.term!;
            const question = item.content.definition!;
            
            // Get up to 5 unique decoys that are not the answer word.
            const decoys = shuffleArray(decoyPool.filter(d => d !== answer)).slice(0, 5);
            
            if (decoys.length === 0) {
                // Not enough distractors for a fun round, so we skip it.
                continue;
            }

            gameRounds.push({
                question,
                answer,
                decoys,
            });
        }
        
        if (gameRounds.length === 0) {
            return { error: "Oyun için uygun soru/cevap çifti oluşturulamadı.", data: null };
        }

        return { data: JSON.parse(JSON.stringify(shuffleArray(gameRounds))) };

    } catch (error: any) {
        console.error("Error getting Balloon Popping data:", error);
        return { error: "Oyun verileri alınırken bir hata oluştu.", data: null };
    }
}


export async function submitBalloonPoppingScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Balon Patlatma'),
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
            gameType: 'Balon Patlatma',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Balon Patlatma score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}