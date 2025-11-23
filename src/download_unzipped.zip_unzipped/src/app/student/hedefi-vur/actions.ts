
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

// New type for a single round of the game
export type HitTheTargetRound = {
    definition: string;
    target: string;
    words: string[]; // A shuffled array of the target word and several trap words
};

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export async function getHitTheTargetAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: HitTheTargetRound[] | null; error?: string }> {
    noStore();
    try {
        // A specific topic is required.
        if (!topicId || topicId === 'all') {
             return { error: "Lütfen oynamak için belirli bir konu seçin.", data: null };
        }
        // A unit or course context is needed for distractors.
        if (!unitId && !courseId) {
             return { error: "Oyun için yeterli bağlam (ünite veya ders) bulunamadı.", data: null };
        }
        
        // 1. Fetch all definition items for the selected TOPIC.
        const definitionsQuery = query(
            collection(db, 'activityItems'),
            where('type', '==', 'definition'),
            where('topicId', '==', topicId)
        );
        
        const definitionsSnapshot = await getDocs(definitionsQuery);
        const topicDefinitions = definitionsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (topicDefinitions.length < 1) {
            return { error: "Hedefi Vur oyunu için bu konuda uygun tanım-kavram çifti bulunamadı.", data: null };
        }

        // 2. Fetch all concepts from the entire UNIT (or COURSE as fallback) to use as traps.
        let conceptsQuery = query(collection(db, 'activityItems'), where('type', '==', 'concept'));
        if (unitId && unitId !== 'all') {
            conceptsQuery = query(conceptsQuery, where('unitId', '==', unitId));
        } else if (courseId) { // Fallback to course if unitId is 'all' or missing
            conceptsQuery = query(conceptsQuery, where('courseId', '==', courseId));
        }

        const conceptsSnapshot = await getDocs(conceptsQuery);
        const distractorPool = conceptsSnapshot.docs.map(doc => (doc.data() as ActivityItem).content.text!).filter(Boolean);
        const uniqueDistractors = [...new Set(distractorPool)];

        // 3. Use all available definitions from the topic and sort them for consistent order.
        const selectedDefinitions = topicDefinitions.sort((a, b) => (a.content.term || '').localeCompare(b.content.term || ''));

        // 4. Build the game rounds.
        const gameRounds: HitTheTargetRound[] = [];
        for (const item of selectedDefinitions) {
            const target = item.content.term!;
            
            // Get 5 unique distractors that are not the target word.
            const traps = shuffleArray(uniqueDistractors.filter(d => d !== target)).slice(0, 5);
            
            if (traps.length < 3) {
                // Not enough distractors for a fun round, so we skip it.
                continue;
            }

            const singleWords = [target, ...traps];
            const wordsForRound = shuffleArray([...singleWords, ...singleWords]); // Duplicate each word

            gameRounds.push({
                definition: item.content.definition!,
                target: target,
                words: wordsForRound,
            });
        }
        
        if (gameRounds.length === 0) {
            return { error: "Oyun için yeterli sayıda seçenek/tuzak kelime bulunamadı. Lütfen veri bankasına daha fazla kavram ekleyin.", data: null };
        }

        return { data: JSON.parse(JSON.stringify(gameRounds)) };

    } catch (error: any) {
        console.error("Error getting Hit The Target data:", error);
        return { error: "Oyun verileri alınırken bir hata oluştu.", data: null };
    }
}

export async function submitHitTheTargetScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Hedefi Vur'),
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
            userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Hedefi Vur',
            context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
