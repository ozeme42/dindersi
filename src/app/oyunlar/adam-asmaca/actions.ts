
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

export type HangmanData = {
    word: string;
    hint: string;
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

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
    // This function will not use the database as per the new requirement.
    // It can be left empty or log the action if needed for debugging.
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Static Mode] Score submission for Adam Asmaca:`, { userId, score, context });
    }
    return { success: true };
}
