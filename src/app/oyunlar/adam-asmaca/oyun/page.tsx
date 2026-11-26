'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';
import { getAdamAsmacaAction } from '../actions';
import type { MiniGameQuestion } from '@/lib/types';

export default function HangmanPage() {
    return (
        <AtolyeGameView
            initialTemplate="adam-asmaca"
            gameTitle="Adam Asmaca"
            gamePath="adam-asmaca"
            fetchQuestions={async ({ courseId, unitId, topicId, searchParams }) => {
                const topicName = searchParams.get('topicName') || searchParams.get('title') || '';
                const res = await getAdamAsmacaAction({ courseId, unitId, topicId });
                if (res.error || !res.data || res.data.length === 0) {
                    return {
                        questions: [],
                        topicTitle: topicName || '',
                        error: res.error || "Bu konu için Kavram ve Notlar Stüdyosu'nda kayıtlı kavram ve tanım bulunamadı.",
                    };
                }

                const questions: MiniGameQuestion[] = res.data.map((item, idx) => ({
                    id: `hangman-${idx + 1}`,
                    question: item.hint,
                    options: [item.word],
                    correctAnswerIndex: 0,
                }));

                return {
                    questions: questions.slice(0, 30),
                    topicTitle: topicName || '',
                };
            }}
        />
    );
}
