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
                            options = [q.correctAnswer, 'A', 'B', 'C'];
                            correctIdx = 0;
                        }
                    }

                    while (options.length < 4) {
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
                    const DEFAULT_MCQS: MiniGameQuestion[] = [
                        {
                            id: 'sample-gk-1',
                            question: "İslam'ın beş şartından biri olan ve yılda bir kez zengin Müslümanların verdiği ibadet hangisidir?",
                            options: ['Zekât', 'Oruç', 'Namaz', 'Hac'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-gk-2',
                            question: "Kur'an-ı Kerim'in ilk indirilen suresi hangisidir?",
                            options: ['Alak', 'Fâtiha', 'Bakara', 'İhlas'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-gk-3',
                            question: "Allah'ın varlığı ve birliği inancına ne ad verilir?",
                            options: ['Tevhid', 'Şirk', 'Nifak', 'Riya'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-gk-4',
                            question: "Peygamber Efendimiz Hz. Muhammed'e (s.a.v.) güvenilirliğinden dolayı verilen lakap nedir?",
                            options: ['Muhammedü’l-Emin', 'Ebu’l-Kasım', 'Habibullah', 'Hatemü’l-Enbiya'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-gk-5',
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
