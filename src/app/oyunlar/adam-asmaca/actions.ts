
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { db } from "@/lib/firebase";
import { 
  doc, 
  writeBatch, 
  serverTimestamp, 
  increment, 
  collection, 
  query, 
  where, 
  getCountFromServer 
} from 'firebase/firestore';


export type HangmanData = {
    word: string;
    hint: string;
};

export async function getAdamAsmacaAction(
    { topicId }: { topicId?: string; }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Adam Asmaca oynamak için belirli bir konu seçmelisiniz.", data: null };
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
        
        let allItems: ActivityItem[] = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            allItems = JSON.parse(fileContent);
        } catch (fileError: any) {
             if (fileError.code === 'ENOENT') {
                return { error: "Bu konu için etkinlik verisi bulunamadı. Lütfen farklı bir konu seçin veya bu konu için veri oluşturun.", data: null };
            }
            throw fileError;
        }
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

        const suitableItems = allItems.filter(item => 
            item.type === 'definition' &&
            item.content &&
            item.content.term && 
            item.content.definition &&
            item.content.term.trim().length >= 4 && 
            item.content.term.trim().length <= 14 && 
            !item.content.term.includes(' ') && 
            turkishAlphabetRegex.test(item.content.term.trim())
        );

        if (suitableItems.length < 3) {
            return { error: "Adam Asmaca oynamak için bu konuda yeterli uygunlukta kelime bulunamadı (4-14 harf, boşluksuz, en az 3 adet).", data: null };
        }
        
        const shuffled = [...suitableItems].sort(() => 0.5 - Math.random());
        
        const gameData: HangmanData[] = shuffled.map(item => ({
            word: item.content.term!.trim().toLocaleUpperCase('tr-TR'),
            hint: item.content.definition!,
        }));

        return { data: JSON.parse(JSON.stringify(gameData)) };

    } catch (error: any) {
        console.error("Server Action Error (getAdamAsmacaAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", data: null };
    }
}

export async function submitAdamAsmacaScoreAction(
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
            where('gameType', '==', 'Adam Asmaca'),
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
            gameType: 'Adam Asmaca',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Adam Asmaca score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
