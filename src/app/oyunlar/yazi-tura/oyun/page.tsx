'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';
import { getYaziTuraQuestionsAction } from '../actions';
import type { MiniGameQuestion, Question } from '@/lib/types';

export default function GolKraliOyunPage() {
    return (
        <AtolyeGameView
            initialTemplate="penalti"
            gameTitle="Gol Kralı"
            gamePath="yazi-tura"
            defaultSubtitle="Soru Bankası Penaltı Oyunu"
            fetchQuestions={async ({ courseId, unitId, topicId, searchParams }) => {
                const topicName = searchParams.get('topicName') || searchParams.get('title') || searchParams.get('courseName') || 'Gol Kralı';

                // Veri kaynağı: Soru Bankası (getYaziTuraQuestionsAction)
                const res = await getYaziTuraQuestionsAction({
                    courseId,
                    unitId,
                    topicId,
                });

                const rawQuestions: Question[] = [
                    ...(res.questions?.easy || []),
                    ...(res.questions?.hard || []),
                ];

                const formattedQuestions: MiniGameQuestion[] = [];
                for (let idx = 0; idx < rawQuestions.length; idx++) {
                    const q = rawQuestions[idx];
                    const qText = q.question || (q as any).text || '';
                    if (!qText) continue;

                    let options = Array.isArray(q.options) ? [...q.options] : [];
                    let correctIdx = 0;

                    if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < options.length) {
                        correctIdx = q.correctAnswerIndex;
                    } else if (typeof q.correctAnswer === 'string') {
                        const found = options.indexOf(q.correctAnswer);
                        if (found !== -1) {
                            correctIdx = found;
                        } else if (options.length > 0) {
                            options[0] = q.correctAnswer;
                            correctIdx = 0;
                        } else {
                            continue;
                        }
                    }

                    while (options.length < 2) {
                        options.push(`Seçenek ${options.length + 1}`);
                    }

                    formattedQuestions.push({
                        id: q.id || `gk-q-${idx + 1}`,
                        question: qText,
                        options: options.slice(0, 4),
                        correctAnswerIndex: correctIdx,
                    });
                }

                if (formattedQuestions.length === 0) {
                    return {
                        questions: [],
                        topicTitle: topicName || '',
                        error: res.error || 'Bu konu için kayıtlı soru bulunamadı.',
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
