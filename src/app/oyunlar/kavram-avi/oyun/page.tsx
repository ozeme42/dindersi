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
                    const DEFAULT_CONCEPTS: MiniGameQuestion[] = [
                        {
                            id: 'sample-ag-1',
                            question: "Allah'ın bir ve tek olduğuna, eşi ve benzeri bulunmadığına inanmak.",
                            options: ['TEVHİD'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-2',
                            question: "Allah'ı görüyormuş gibi ibadet etmek; O'nun her an bizi gördüğünün bilincinde olmak.",
                            options: ['İHSAN'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-3',
                            question: "Dinen zengin sayılan Müslümanların yılda bir kez mallarının belirli bir kısmını vermesi.",
                            options: ['ZEKÂT'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-4',
                            question: "Allah rızası için yapılan her türlü maddi ve manevi iyilik ve yardım.",
                            options: ['SADAKA'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-5',
                            question: "Peygamber Efendimiz Hz. Muhammed'in hayatını, ahlakını ve mücadelesini inceleyen ilim dalı.",
                            options: ['SİYER'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-6',
                            question: "Kur'an-ı Kerim ayetlerini açıklayan, yorumlayan ve anlamını derinlemesine inceleyen ilim.",
                            options: ['TEFSİR'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-7',
                            question: "Peygamber Efendimizin (s.a.v.) sözleri, fiilleri ve takrirleri.",
                            options: ['HADİS'],
                            correctAnswerIndex: 0
                        },
                        {
                            id: 'sample-ag-8',
                            question: "Allah’ın emir ve yasaklarına titizlikle uyarak O’nun sevgisini kaybetmekten sakınmak.",
                            options: ['TAKVA'],
                            correctAnswerIndex: 0
                        }
                    ];
                    return {
                        questions: DEFAULT_CONCEPTS,
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
