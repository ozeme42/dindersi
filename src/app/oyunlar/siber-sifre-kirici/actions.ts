'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank, getStaticGameData } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export async function getSiberSifreKiriciAction(params: GetQuizInput): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const fetchParams: GetQuizInput = { 
            ...params, 
            questionCount: 30,
            questionTypes: ['mcq', 'tf'] // Yalnızca soru türlerini al
        };
        const result = await getQuestionsFromBank(fetchParams);
        const questions = result.questions || [];

        if (questions.length < 3) {
            return { questions: [], error: "Bu konu için yeterli sayıda soru bulunamadı (En az 3 gerekli)." };
        }

        return { questions: JSON.parse(JSON.stringify(questions)) };
    } catch (e: any) {
        console.error("Error getting Siber Sifre Kirici questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitSiberSifreKiriciScoreAction(userId: string, points: number, context: string) {
    if (!userId || points <= 0) return { success: false, error: "Geçersiz skor kaydı." };
    
    try {
        await addDoc(collection(db, 'scoreEvents'), {
            userId,
            points,
            type: 'game_siber_sifre_kirici',
            description: `Siber Şifre Kırıcı oyunundan kazandı. Konu: ${context}`,
            timestamp: serverTimestamp()
        });
        return { success: true };
    } catch (error: any) {
        console.error("Skor kaydetme hatası:", error);
        return { success: false, error: error.message };
    }
}
