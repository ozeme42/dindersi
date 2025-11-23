
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type IlimHazinesiLevel = {
    id: number;
    letters: string[];
    words: string[];
    mainWord: string;
    info: string;
};

// Simple shuffle function
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export async function getIlimHazinesiAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ levels: IlimHazinesiLevel[]; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }
        
        const querySnapshot = await getDocs(q);
        const allDefinitions = querySnapshot.docs.map(doc => doc.data() as ActivityItem);
        
        const turkishAlphabetRegex = /^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$/i;

        const suitableItems = allDefinitions.filter(item => 
            item.content &&
            item.content.term && 
            item.content.term.trim().length >= 3 && // At least 3 letters
            item.content.term.trim().length <= 7 && // At most 7 letters
            !item.content.term.includes(' ') && // Single word
            turkishAlphabetRegex.test(item.content.term) &&
            item.content.definition
        );
        
        if (suitableItems.length < 1) {
            return { error: "İlim Hazinesi için bu konuda uygun kelime bulunamadı.", levels: [] };
        }

        const gameLevels: IlimHazinesiLevel[] = shuffleArray(suitableItems).map((item, index) => {
            const mainWord = item.content.term!.toLocaleUpperCase('tr-TR');
            const letters = mainWord.split('');
            // Sub-word generation is complex, so we'll just include the main word for now.
            // A more advanced version could query a dictionary or use an algorithm.
            const words = [mainWord];

            return {
                id: index + 1,
                letters,
                words,
                mainWord,
                info: item.content.definition!,
            };
        });

        return { levels: gameLevels };

    } catch (error: any) {
        console.error("Error getting Ilim Hazinesi data:", error);
        return { error: "Oyun verileri alınırken bir hata oluştu.", levels: [] };
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
            gameType: 'İlim Hazinesi',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Ilim Hazinesi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
