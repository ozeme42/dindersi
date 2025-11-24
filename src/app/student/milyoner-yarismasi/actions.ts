

'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Question } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

const shuffleArray = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export async function getMilyonerQuestionsAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'questions'), where('type', '==', 'Çoktan Seçmeli'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const easyQuery = query(baseQuery, where('difficulty', '==', 'Kolay'));
        const mediumQuery = query(baseQuery, where('difficulty', '==', 'Orta'));
        const hardQuery = query(baseQuery, where('difficulty', '==', 'Zor'));

        const [easySnap, mediumSnap, hardSnap] = await Promise.all([
            getDocs(easyQuery),
            getDocs(mediumQuery),
            getDocs(hardQuery)
        ]);

        const easyQuestions = easySnap.docs.map(d => ({id: d.id, ...d.data()} as Question));
        const mediumQuestions = mediumSnap.docs.map(d => ({id: d.id, ...d.data()} as Question));
        const hardQuestions = hardSnap.docs.map(d => ({id: d.id, ...d.data()} as Question));
        
        if (easyQuestions.length < 4 || mediumQuestions.length < 4 || hardQuestions.length < 2) {
            return { error: "Bu yarışma için yeterli sayıda soru bulunamadı (en az 4 kolay, 4 orta, 2 zor).", questions: [] };
        }

        const selectedEasy = shuffleArray(easyQuestions).slice(0, 4);
        const selectedMedium = shuffleArray(mediumQuestions).slice(0, 4);
        const selectedHard = shuffleArray(hardQuestions).slice(0, 2);

        // This should now correctly be 10 questions to match the 10 money levels.
        const allQuestions = [...selectedEasy, ...selectedMedium, ...selectedHard];

        return { questions: JSON.parse(JSON.stringify(allQuestions)) };
    } catch (error: any) {
        console.error("Error getting Milyoner questions:", error);
        if (error.code === 'failed-precondition') {
             return { error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${error.message}`, questions: [] };
        }
        return { error: "Milyoner yarışması soruları alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitMilyonerScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    // This action seems to be unused by the client-page, which uses a different action.
    // However, keeping it in case it's intended for other purposes.
    return { success: true };
}
