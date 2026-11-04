'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { getStaticQuestionsForGame, isDefinitionValidAndClean } from '@/lib/quiz-actions';

export type BalloonHunterQuestion = {
    q: string; // The definition
    a: string; // The correct term
    wrongs: string[]; // Distractor terms
};

const DEFAULT_PAIRS = [
    { term: 'Tevhit', definition: 'Allah’ın bir ve tek olduğuna, eşi ve benzeri bulunmadığına kalpten inanmak.' },
    { term: 'İman', definition: 'Allah’ın varlığına, meleklerine, kitaplarına ve peygamberlerine yürekten inanıp güvenmek.' },
    { term: 'İbadet', definition: 'Yüce Allah’ın rızasını ve sevgisini kazanmak amacıyla yapılan her türlü güzel amel ve kulluk vazifesi.' },
    { term: 'Ahlak', definition: 'İnsanın iyi veya kötü olarak nitelendirilmesine yol açan manevi nitelikleri, huyları ve davranışları.' },
    { term: 'Nübüvvet', definition: 'Peygamberlik müessesesi; Yüce Allah’ın insanlara emir ve yasaklarını bildirmek üzere elçi göndermesi.' },
    { term: 'Kuran', definition: 'Allah tarafından Hz. Muhammed’e vahiy yoluyla indirilen, okunmasıyla ibadet edilen son ilahi kitap.' },
    { term: 'Sünnet', definition: 'Hz. Peygamber’in sözleri, uygulamaları ve sahabilerin güzel davranışlarını onaylaması.' },
    { term: 'Takva', definition: 'Allah’a karşı derin bir sorumluluk bilinciyle günahlardan sakınma ve emirlerine titizlikle uyma hali.' },
    { term: 'Adalet', definition: 'Her hak sahibine hakkını vermek, hak ve hukuka uygun davranarak haksızlıktan kaçınmak.' },
    { term: 'İhlas', definition: 'Yapılan her türlü ibadet ve güzel davranışı sadece ve sadece Allah rızası için yerine getirmek.' }
];

const FALLBACK_TERMS = ['İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 'Adalet', 'Merhamet', 'Sabır', 'Şükür', 'İhlas', 'Takva', 'Furkan', 'Mizan', 'Kıyamet', 'Ahiret', 'Hicret', 'Tevekkül'];

export async function getBalloonHunterDataAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: BalloonHunterQuestion[]; error?: string }> {
    noStore();
    try {
        let allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' });

        const pairs: { term: string; definition: string }[] = [];
        const seenAnswers = new Set<string>();

        for (const item of allItems || []) {
            if ('type' in item) {
                let t = '';
                let d = '';
                if (item.type === 'definition') {
                    t = String((item as any).content?.term || (item as any).term || '').trim();
                    d = String((item as any).content?.definition || (item as any).definition || '').trim();
                } else if (item.type === 'concept') {
                    t = String((item as any).content?.term || (item as any).content?.text || (item as any).term || '').trim();
                    d = String((item as any).content?.definition || (item as any).content?.meaning || (item as any).definition || '').trim();
                } else if (item.type === 'conceptExplanation') {
                    t = String((item as any).concept || (item as any).term || '').trim();
                    d = String((item as any).definition || '').trim();
                }

                if (t.length >= 2 && t.length <= 30 && isDefinitionValidAndClean(t, d)) {
                    const key = t.toLocaleLowerCase('tr-TR');
                    if (!seenAnswers.has(key)) {
                        seenAnswers.add(key);
                        pairs.push({ term: t, definition: d });
                    }
                }
            }
        }

        if (pairs.length < 2) {
            pairs.push(...DEFAULT_PAIRS);
        }

        const termsPool = [...new Set([...pairs.map(p => p.term), ...FALLBACK_TERMS])];

        const gameQuestions: BalloonHunterQuestion[] = pairs.map(item => {
            const correctAnswer = item.term;
            const normCorrect = correctAnswer.toLocaleLowerCase('tr-TR');

            const distractors = termsPool
                .filter(term => term.toLocaleLowerCase('tr-TR') !== normCorrect)
                .sort(() => 0.5 - Math.random())
                .slice(0, 4);

            let fbIdx = 0;
            while (distractors.length < 3 && fbIdx < FALLBACK_TERMS.length) {
                const candidate = FALLBACK_TERMS[fbIdx++];
                if (candidate.toLocaleLowerCase('tr-TR') !== normCorrect && !distractors.includes(candidate)) {
                    distractors.push(candidate);
                }
            }

            return {
                q: item.definition,
                a: correctAnswer,
                wrongs: distractors,
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions.sort(() => 0.5 - Math.random()))) };

    } catch (error: any) {
        console.error("Error getting Balloon Hunter data:", error);
        return { error: "Oyun verileri alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitBalloonHunterScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Balon Avcısı'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
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
            gameType: 'Balon Avcısı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Balloon Hunter score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
