'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

// Bu tip, oyun component'inin beklediği basit kelime dizisini döndürmek için.
export type AnagramWallWord = string;

export async function getAnagramWallWords(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ words: AnagramWallWord[]; error?: string }> {
    noStore();
    try {
        // Hem 'concept' hem de 'definition' tipli verileri çekelim, 
        // çünkü her ikisinin de 'term' alanı bizim için kelime olabilir.
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
            .map(item => item.content?.term || item.content?.text) // Hem 'term' hem de 'text' alanlarını kontrol et
            .filter((word): word is string => 
                typeof word === 'string' &&
                word.trim().length > 2 && // En az 3 harfli
                word.trim().length < 15 && // En fazla 14 harfli
                !word.includes(' ') // Boşluk içermeyen
            )
            .map(word => word.toLocaleUpperCase('tr-TR')); // Büyük harfe çevir

        if (allWords.length < 5) {
            return { error: "Anagram Duvarı oynamak için bu konuda en az 5 adet uygun kelime bulunmalıdır.", words: [] };
        }
        
        // Tekrarları temizle
        const uniqueWords = [...new Set(allWords)];

        return { words: JSON.parse(JSON.stringify(uniqueWords)) };

    } catch (error: any) {
        console.error("Error getting Anagram Duvarı words:", error);
        return { error: "Oyun için kelimeler alınırken bir hata oluştu.", words: [] };
    