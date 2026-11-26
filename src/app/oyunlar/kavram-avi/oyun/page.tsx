'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';
import { getConceptHuntAction } from '../actions';
import type { MiniGameQuestion, Anagram } from '@/lib/types';

export default function KavramAviOyunPage() {
    return (
        <AtolyeGameView
            initialTemplate="anagram"
            gameTitle="Karışık Harfler (Kavram Avı)"
            gamePath="kavram-avi"
            defaultSubtitle="Karışık Harfler Kavram Etkinliği"
            fetchQuestions={async ({ courseId, unitId, topicId, searchParams }) => {
                const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Karışık Harfler';

                // Veri kaynağı: getConceptHuntAction (Statik müfredat & Firestore)
                const res = await getConceptHuntAction({
                    courseId,
                    unitId,
                    topicId,
                });

                const rawQuestions: Anagram[] = res.questions || [];
                const formattedQuestions: MiniGameQuestion[] = [];

                for (let idx = 0; idx < rawQuestions.length; idx++) {
                    const item = rawQuestions[idx];
                    const concept = (item.correctAnswer || '').trim();
                    const clue = ((item as any).definition || (item as any).clue || (item as any).question || '').trim();
                    if (!concept) continue;

                    formattedQuestions.push({
                        id: (item as any).id || `anagram-${idx + 1}`,
                        question: clue || 'Harfleri düzenleyerek kavramı bulunuz.',
                        options: [concept],
                        correctAnswerIndex: 0,
                    });
                }

                if (formattedQuestions.length === 0) {
                    return {
                        questions: [],
                        topicTitle: topicName || '',
                        error: res.error || "Bu konu için Kavram ve Notlar Stüdyosu'nda kayıtlı kavram ve tanım bulunamadı.",
                    };
                }

                return {
                    questions: formattedQuestions.slice(0, 30),
                    topicTitle: topicName,
                };
            }}
        />
    );
}
