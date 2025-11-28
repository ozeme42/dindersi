
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { ActivityItem, Question } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export type TermData = {
    id: string;
    term: string;       // Kavram (Cevap)
    definition: string; // Tanım (Soru)
};


export async function getBilBakalimAction({ courseId, unitId, topicId }: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
}): Promise<{ data: TermData[]; allTerms: string[]; error?: string }> {
    noStore();
    try {
        let baseQuery;
        
        if (topicId && topicId !== 'all') {
            baseQuery = query(collection(db, 'activityItems'), where('topicId', '==', topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(collection(db, 'activityItems'), where('unitId', '==', unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(collection(db, 'activityItems'), where('courseId', '==', courseId));
        } else {
            return { data: [], allTerms: [], error: 'Lütfen bir ders, ünite veya konu seçin.' };
        }
        
        const snapshot = await getDocs(baseQuery);
        
        const definitions: TermData[] = [];
        const concepts = new Set<string>();

        snapshot.docs.forEach(doc => {
            const item = doc.data() as ActivityItem;
            if (item.type === 'definition' && item.content.term && item.content.definition) {
                definitions.push({
                    id: doc.id,
                    term: item.content.term,
                    definition: item.content.definition,
                });
                concepts.add(item.content.term); // Also add the term to the concept pool
            } else if (item.type === 'concept' && item.content.text) {
                concepts.add(item.content.text);
            }
        });

        if (definitions.length === 0) {
            return { data: [], allTerms: [], error: 'Bu konu için uygun tanım bulunamadı.' };
        }

        return { 
            data: JSON.parse(JSON.stringify(definitions)),
            allTerms: Array.from(concepts)
        };

    } catch (error: any) {
        console.error("Error getting Bil Bakalım data:", error);
        return { data: [], allTerms: [], error: 'Oyun verileri alınırken bir hata oluştu.' };
    }
}


export async function submitBilBakalimScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Bil Bakalım'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);
        
        // 1. Increment the user's total score
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        // 2. Log the score event
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Bil Bakalım',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Bil Bakalım score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
