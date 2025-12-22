
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
    { topicId }: { topicId?: string; }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
            return { error: "Lütfen oynamak için belirli bir konu seçin.", questions: [] };
        }

        // Use relative path for fetch, which works on both server and client side in Next.js
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/curriculum/activities/${topicId}.json`);

        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için 'Bil Bakalım' oyun verisi bulunamadı. Lütfen farklı bir konu seçin veya bu konu için veri oluşturun.", questions: [] };
            }
            throw new Error(`Veri dosyası yüklenemedi: ${res.statusText}`);
        }

        const staticItems: ActivityItem[] = await res.json();
        
        const allDefinitions = staticItems
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition)
            .map(item => ({ id: item.id, content: item.content }));

        if (allDefinitions.length < 3) {
            return { error: "Bil Bakalım oynamak için bu konuda en az 3 farklı tanım bulunmalıdır.", questions: [] };
        }
        
        const gameQuestions: Partial<Question>[] = allDefinitions.map((item, index) => {
            return {
                id: `${item.id}-${index}`,
                text: item.content.definition!,
                type: 'Bil Bakalım',
                correctAnswer: item.content.term!,
                difficulty: 'Orta',
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
    } catch (error: any) {
        console.error("Error getting Bil Bakalım questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu. Dosya formatı veya erişim sorunu olabilir.", questions: [] };
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
    { topicId }: { topicId?: string; }
): Promise<{ data: ScrambledSentenceData[] | null; error?: string }> {
    noStore();
    try {
        if (!topicId || topicId === 'all') {
             return { error: "Cümle Oluşturma oynamak için belirli bir konu seçmelisiniz.", data: null };
        }
        
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/curriculum/activities/${topicId}.json`);

        if (!res.ok) {
            if (res.status === 404) {
                 return { error: "Bu konu için etkinlik verisi bulunamadı.", data: null };
            }
            throw new Error(`Static data for topic ${topicId} failed to load.`);
        }

        const staticItems: ActivityItem[] = await res.json();
        const allSentences = staticItems.map(item => item.content?.text)
            .filter((text): text is string => typeof text === 'string' && text.trim().length > 0 && text.trim().split(' ').length > 2);

        if (allSentences.length < 1) {
            return { error: "Cümle Oluşturma oynamak için bu konuda yeterli uygunlukta cümle bulunamadı.", data: null };
        }
        
        // Fisher-Yates Shuffle
        for (let i = allSentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSentences[i], allSentences[j]] = [allSentences[j], allSentences[i]];
        }

        const gameData: ScrambledSentenceData[] = allSentences.map(sentence => ({
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
                error: `Bu etkinlikten daha fazla puan kazanamazsınız. Lütfen farklı bir konu seçin.` 
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
        
        if (questions.length < 5) {
            return { questions: [], error: "Bu zincir oyunu için en az 5 Doğru/Yanlış sorusu gereklidir." };
        }
        
        // Shuffle the array
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        
        return { questions: JSON.parse(JSON.stringify(questions)) };

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
