'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';
import { getMazeQuestionsAction } from '../actions';
import type { MiniGameQuestion, Question } from '@/lib/types';

export default function LabirentOyunPage() {
    return (
        <AtolyeGameView
            initialTemplate="labirent"
            gameTitle="Labirent"
            gamePath="labirent"
            defaultSubtitle="Soru Bankası Labirent Oyunu"
            fetchQuestions={async ({ courseId, unitId, topicId, searchParams }) => {
                const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Labirent';

                // Veri kaynağı: Soru Bankası (getMazeQuestionsAction)
                const res = await getMazeQuestionsAction({
                    courseId,
                    unitId,
                    topicId,
                });

                const rawQuestions: Question[] = res.questions || [];
                const formattedQuestions: MiniGameQuestion[] = [];

                for (let idx = 0; idx < rawQuestions.length; idx++) {
                    const q = rawQuestions[idx];
                    const qText = q.question || (q as any).text || '';
                    if (!qText) continue;

                    let options = Array.isArray(q.options) ? [...q.options] : [];
                    let correctIdx = 0;

                    if (q.type === 'Doğru/Yanlış' || q.type === 'tf') {
                        options = ['Doğru', 'Yanlış'];
                        const isWrong = String(q.correctAnswer).toLowerCase().includes('yanlış') || String(q.correctAnswer).toLowerCase() === 'false';
                        correctIdx = isWrong ? 1 : 0;
                    } else {
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
                    }

                    while (options.length < 2) {
                        options.push(`Seçenek ${options.length + 1}`);
                    }

                    formattedQuestions.push({
                        id: q.id || `lab-q-${idx + 1}`,
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
