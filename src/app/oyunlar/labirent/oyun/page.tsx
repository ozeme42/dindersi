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
                                options = [q.correctAnswer, 'A', 'B', 'C'];
                                correctIdx = 0;
                            }
                        }
                    }

                    while (options.length < 4) {
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
                    const DEFAULT_MCQS: MiniGameQuestion[] = [
                        {
                            id: 'sample-lab-1',
                            question: "İslam'ın beş şartından biri olan ve yılda bir kez zengin Müslümanların verdiği ibadet hangisidir?",
                            options: ['Zekât', 'Oruç', 'Namaz', 'Hac'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-lab-2',
                            question: "Kur'an-ı Kerim'in ilk indirilen suresi hangisidir?",
                            options: ['Alak', 'Fâtiha', 'Bakara', 'İhlas'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-lab-3',
                            question: "Allah'ın varlığı ve birliği inancına ne ad verilir?",
                            options: ['Tevhid', 'Şirk', 'Nifak', 'Riya'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-lab-4',
                            question: "Peygamber Efendimiz Hz. Muhammed'e (s.a.v.) güvenilirliğinden dolayı verilen lakap nedir?",
                            options: ['Muhammedü’l-Emin', 'Ebu’l-Kasım', 'Habibullah', 'Hatemü’l-Enbiya'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-lab-5',
                            question: "Müslümanların kıblesi olan Kâbe hangi şehirdedir?",
                            options: ['Mekke', 'Medine', 'Kudüs', 'Şam'],
                            correctAnswerIndex: 0
                        }
                    ];
                    return {
                        questions: DEFAULT_MCQS,
                        topicTitle: topicName || 'Din Kültürü ve Ahlak Bilgisi',
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
