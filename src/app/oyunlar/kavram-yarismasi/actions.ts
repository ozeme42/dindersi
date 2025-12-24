
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

export async function getConceptQuizAction(
    { topicId }: { topicId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
    noStore();
    if (!topicId) {
        return { error: "Geçerli bir konu ID'si gerekli.", questions: null };
    }

    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
        
        const fileContent = await fs.readFile(filePath, 'utf-8').catch(() => null);

        if (!fileContent) {
            return { error: "Bu konu için etkinlik verisi bulunamadı.", questions: null };
        }

        const itemsForTopic: ActivityItem[] = JSON.parse(fileContent);

        // Sadece 'definition' tipindeki verileri al
        const allDefinitions = itemsForTopic.filter((item): item is ActivityItem & { content: { term: string, definition: string } } => 
            item.type === 'definition' && !!item.content?.term && !!item.content?.definition
        );
        
        const allTermsFromDefinitions = allDefinitions.map(item => item.content.term);

        if (allDefinitions.length < 1) {
            return { error: "Bu konu için oynanabilir tanım ('definition') verisi bulunamadı.", questions: null };
        }
        if (allTermsFromDefinitions.length < 8) {
            return { error: "Bu oyun için en az 8 farklı kavram/tanım çifti gereklidir.", questions: null };
        }
        
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of allDefinitions) {
            const correctAnswer = item.content.term;
            const definition = item.content.definition;

            // Çeldiricileri, doğru cevap dışındaki diğer tanımların terimlerinden seç
            const distractors = allTermsFromDefinitions
                .filter(term => term !== correctAnswer)
                .sort(() => 0.5 - Math.random())
                .slice(0, 7);

            // Eğer yeterli çeldirici yoksa bu soruyu atla
            if (distractors.length < 7) {
                continue; 
            }

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
            
            gameQuestions.push({
                definition,
                options,
                correctAnswer,
            });
        }
        
        if (gameQuestions.length === 0) {
             return { error: "Oyun için uygun soru oluşturulamadı. Konuda yeterli çeşitlilikte kavram olmayabilir.", questions: null };
        }
        
        const shuffledGameQuestions = gameQuestions.sort(() => 0.5 - Math.random());
        return { questions: JSON.parse(JSON.stringify(shuffledGameQuestions)) };

    } catch (error: any) {
        console.error("Error getting Kavram Yarışması questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: null };
    }
}
