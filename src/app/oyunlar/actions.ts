
'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  limit 
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';


export async function getBilBakalimAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'));

        const conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        conditions.push(where('type', '==', 'definition'));

        const finalQuery = query(baseQuery, ...conditions);
        const definitionsSnapshot = await getDocs(finalQuery);
        
        const allDefinitions = definitionsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 3) {
            return { error: "Bil Bakalım oynamak için bu konuda en az 3 farklı tanım bulunmalıdır.", questions: [] };
        }
        
        const gameQuestions: Partial<Question>[] = allDefinitions.map((item, index) => {
            return {
                id: `${item.courseId}-${item.unitId}-${item.topicId}-${index}`,
                text: item.content.definition!,
                type: 'Bil Bakalım', // Custom type for this game
                correctAnswer: item.content.term!,
                difficulty: 'Orta',
                courseId: item.courseId,
                unitId: item.unitId,
                topicId: item.topicId,
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
    } catch (error: any) {
        console.error("Error getting Bil Bakalım questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
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
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

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

export type ScrambledSentenceData = {
    correctSentence: string;
};

export async function getCumleOlusturmaAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: ScrambledSentenceData[] | null; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'sentence'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const limitedQuery = query(baseQuery, limit(50));
        const querySnapshot = await getDocs(limitedQuery);
        
        const allSentences = querySnapshot.docs.map(doc => (doc.data() as ActivityItem).content?.text)
            .filter((text): text is string => typeof text === 'string' && text.trim().length > 0 && text.trim().split(' ').length > 2);

        if (allSentences.length < 1) {
            return { error: "Cümle Oluşturma oynamak için bu konuda yeterli uygunlukta cümle bulunamadı.", data: null };
        }
        
        // Fisher-Yates Shuffle
        for (let i = allSentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSentences[i], allSentences[j]] = [allSentences[j], allSentences[i]];
        }

        const gameData: ScrambledSentenceData[] = allSentences.slice(0, 10).map(sentence => ({
            correctSentence: sentence.trim(),
        }));

        return { data: JSON.parse(JSON.stringify(gameData)) };

    } catch (error: any) {
        console.error("Server Action Error (getCumleOlusturmaAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", data: null };
    }
}

export async function submitCumleOlusturmaScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) return { success: true };
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Cümle Oluşturma'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        
        if (attemptsSnapshot.data().count >= 10) {
            return { 
                success: false, 
                error: `Günlük etkinlik limitine ulaştınız. Yarın tekrar deneyin!` 
            };
        }

        const batch = writeBatch(db);
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Cümle Oluşturma',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitCumleOlusturmaScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}

export async function getDogruYanlisZinciriAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, "questions"), where("type", "==", "Doğru/Yanlış"));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }
        
        const querySnapshot = await getDocs(q);
        let questions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        
        // Shuffle the array
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        
        // Take up to 50 questions
        const selectedQuestions = questions.slice(0, 50);

        if (selectedQuestions.length < 5) {
            return { questions: [], error: "Bu zincir oyunu için en az 5 Doğru/Yanlış sorusu gereklidir." };
        }

        return { questions: JSON.parse(JSON.stringify(selectedQuestions)) };

    } catch (e: any) {
        console.error("Error getting D/Y Zinciri questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitDogruYanlisZinciriScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Doğru/Yanlış Zinciri'),
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
            gameType: 'Doğru/Yanlış Zinciri',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting D/Y Zinciri score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
