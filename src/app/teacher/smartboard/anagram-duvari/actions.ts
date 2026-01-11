'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type AnagramWallWord = string;

export async function getAnagramWallWords(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ words: AnagramWallWord[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', 'in', ['concept', 'definition']));
        
        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }
        
        const snapshot = await getDocs(baseQuery);
        
        const allWords = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .map(item => item.content?.term || item.content?.text)
            .filter((word): word is string => 
                typeof word === 'string' &&
                word.trim().length > 2 &&
                word.trim().length < 15 && 
                !word.includes(' ') 
            )
            .map(word => word.toLocaleUpperCase('tr-TR'));

        if (allWords.length < 5) {
            return { error: "Anagram Duvarı oynamak için en az 5 kelime gereklidir.", words: [] };
        }
        
        const uniqueWords = [...new Set(allWords)];

        return { words: JSON.parse(JSON.stringify(uniqueWords)) };

    } catch (error: any) {
        console.error("Error getting Anagram words:", error);
        return { error: "Veri alınırken hata oluştu.", words: [] };
    }
}