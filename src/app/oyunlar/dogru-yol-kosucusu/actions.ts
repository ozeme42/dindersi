
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

export type DogruYolQuestion = {
    q: string;
    correct: string;
    wrong: string;
}

export async function getDogruYolKosucusuAction(
    { topicId }: { topicId?: string; }
): Promise<{ questions: DogruYolQuestion[]; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
             return { error: "Oyun oynamak için bir konu seçmelisiniz.", questions: [] };
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const allItems: ActivityItem[] = JSON.parse(fileContent);

            const allDefinitions = allItems
                .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition);

            if (allDefinitions.length < 2) {
                return { error: "Bu oyun için en az 2 farklı tanım/kavram gereklidir.", questions: [] };
            }
            
            const gameQuestions: DogruYolQuestion[] = allDefinitions.map((item, index, arr) => {
                const wrongOptions = arr.filter((_, i) => i !== index);
                const wrongAnswerItem = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

                return {
                    q: item.content.definition!,
                    correct: item.content.term!,
                    wrong: wrongAnswerItem.content.term!
                };
            });

            return { questions: JSON.parse(JSON.stringify(gameQuestions)) };

        } catch (fileError: any) {
            if (fileError.code === 'ENOENT') {
                return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: [] };
            }
            throw fileError;
        }

    } catch (error: any) {
        console.error("Error getting Dogru Yol Kosucusu questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitDogruYolKosucusuScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Doğru Yol Koşucusu'),
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
            gameType: 'Doğru Yol Koşucusu',
            context: context,
            attemptNumber: attemptsSnapshot.data().count + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
