'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank, getStaticGameData } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export async function getSiberSifreKiriciAction(params: GetQuizInput): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    try {
        const fetchParams: GetQuizInput = { 
            ...params, 
            questionCount: 30,
            questionTypes: ['mcq', 'tf', 'Çoktan Seçmeli', 'Doğru/Yanlış']
        };
        const result = await getQuestionsFromBank(fetchParams);
        let questions = (result.questions || []) as Question[];

        if (questions.length < 3) {
            try {
                const allItems = await getStaticGameData({ courseId: params.courseId, unitId: params.unitId, topicId: params.topicId });
                const definitions = allItems.filter(it => 'type' in it && it.type === 'definition' && (it as any).content?.term && (it as any).content?.definition);
                
                definitions.forEach((dItem, idx) => {
                    const term = (dItem as any).content.term.trim();
                    const def = (dItem as any).content.definition.trim();
                    const isTrue = idx % 2 === 0;
                    let statement = `${term}, ${def}`;
                    if (!isTrue && definitions.length > 1) {
                        const wrongTerm = (definitions[(idx + 1) % definitions.length] as any).content.term.trim();
                        statement = `${wrongTerm}, ${def}`;
                    }
                    if (!questions.some(q => q.text === statement)) {
                        questions.push({
                            id: `siber-tf-${idx}-${Date.now()}`,
                            type: 'Doğru/Yanlış',
                            text: statement,
                            correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
                            options: ['Doğru', 'Yanlış'],
                            difficulty: 'Orta',
                            topicId: params.topicId || ''
                        } as any);
                    }
                });
            } catch (fallbackErr) {}
        }

        if (questions.length < 2) {
            return { questions: [], error: "Bu konu için yeterli sayıda soru bulunamadı (En az 2 gerekli)." };
        }

        return { questions: JSON.parse(JSON.stringify(questions)) };
    } catch (e: any) {
        console.error("Error getting Siber Sifre Kirici questions:", e);
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function submitSiberSifreKiriciScoreAction(userId: string, points: number, context: string) {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || points <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Siber Şifre Kırıcı'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(points) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: points,
            timestamp: serverTimestamp(),
            gameType: 'Siber Şifre Kırıcı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Skor kaydetme hatası:", error);
        return { success: false, error: error.message };
    }
}
