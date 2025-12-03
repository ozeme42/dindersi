

'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { Question } from '@/lib/types';

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
        
        if (easyQuestions.length === 0 || mediumQuestions.length === 0 || hardQuestions.length === 0) {
            return { error: "Bu yarışma için her zorluk seviyesinden (Kolay, Orta, Zor) en az bir adet çoktan seçmeli soru bulunamadı.", questions: [] };
        }

        const selectedEasy = shuffleArray(easyQuestions).slice(0, 5);
        const selectedMedium = shuffleArray(mediumQuestions).slice(0, 5);
        const selectedHard = shuffleArray(hardQuestions).slice(0, 5);

        const allQuestions = [...selectedEasy, ...selectedMedium, ...selectedHard];

        return { questions: JSON.parse(JSON.stringify(allQuestions)) };
    } catch (error: any) {
        console.error("Error getting Milyoner questions:", error);
        return { error: "Milyoner yarışması soruları alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitMilyonerScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Milyoner'),
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
            gameType: 'Milyoner',
            context,
        });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Milyoner score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}

