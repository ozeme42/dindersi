'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { Question, GetQuizInput } from "@/lib/types";
import { getQuestionsFromBank, getRegisteredStudioItemsForGame } from "@/lib/quiz-actions";
import { filterStudioWordList, prepareStudioDefinitionPairs } from '@/lib/studio-game-helpers';
import { unstable_noStore as noStore } from 'next/cache';

export async function getSiberSifreKiriciAction(
    params: GetQuizInput
): Promise<{ questions: Question[]; concepts?: string[]; error?: string }> {
    noStore();
    try {
        const fetchParams: GetQuizInput = {
            ...params,
            questionCount: 30,
            questionTypes: ['mcq', 'tf', 'Çoktan Seçmeli', 'Doğru/Yanlış']
        };
        const result = await getQuestionsFromBank(fetchParams);
        const questions = (result.questions || []) as Question[];

        const effectiveTopicId = (params.topicId && params.topicId !== params.unitId && params.topicId !== 'preview-topic' && params.topicId !== 'unit-flow' && params.topicId !== 'all')
            ? params.topicId
            : undefined;

        let studioConcepts: string[] = [];
        try {
            const studio = await getRegisteredStudioItemsForGame({
                courseId: params.courseId,
                unitId: params.unitId,
                topicId: effectiveTopicId,
            });
            studioConcepts = filterStudioWordList(studio.concepts, {
                removeSpaces: true,
                minLength: 4,
                maxLength: 14,
            });

            if (questions.length < 3) {
                const definitions = prepareStudioDefinitionPairs(studio.conceptDefinitions, {
                    minTermLength: 2,
                    maxTermLength: 40,
                    cleanClue: true,
                });
                if (definitions.length >= 2) {
                    definitions.forEach((dItem, idx) => {
                        const isTrue = idx % 2 === 0;
                        const shownTerm = isTrue ? dItem.term : definitions[(idx + 1) % definitions.length].term;
                        const statement = `${shownTerm}, ${dItem.definition}`;
                        if (!questions.some(q => q.text === statement)) {
                            questions.push({
                                id: `siber-tf-${idx}`,
                                type: 'Doğru/Yanlış',
                                text: statement,
                                correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
                                options: ['Doğru', 'Yanlış'],
                                difficulty: 'Orta',
                                topicId: effectiveTopicId || '',
                            } as any);
                        }
                    });
                }
            }
        } catch (studioErr) {
            console.warn("Could not load studio concepts for Siber Sifre Kirici:", studioErr);
        }

        if (questions.length < 2) {
            return { questions: [], concepts: studioConcepts, error: "Bu konu için yeterli sayıda soru bulunamadı (En az 2 gerekli)." };
        }

        return { questions: JSON.parse(JSON.stringify(questions)), concepts: studioConcepts };
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
