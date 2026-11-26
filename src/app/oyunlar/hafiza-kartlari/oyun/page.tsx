'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';
import { getHafizaKartlariAction } from '../actions';
import type { MiniGameQuestion } from '@/lib/types';

export default function HafizaKartlariOyunPage() {
    return (
        <AtolyeGameView
            initialTemplate="eslesen-ciftler"
            gameTitle="Hafıza Kartları"
            gamePath="hafiza-kartlari"
            fetchQuestions={async ({ courseId, unitId, topicId, searchParams }) => {
                const topicName = searchParams.get('topicName') || searchParams.get('title') || '';
                const res = await getHafizaKartlariAction({ courseId, unitId, topicId });
                if (res.error || !res.pairs || res.pairs.length === 0) {
                    return {
                        questions: [],
                        topicTitle: topicName || '',
                        error: res.error || "Bu konu için Kavram ve Notlar Stüdyosu'nda kayıtlı kavram ve tanım bulunamadı.",
                    };
                }

                const grouped = new Map<string, { term?: string; definition?: string }>();
                for (const item of res.pairs) {
                    const entry = grouped.get(item.pairId) || {};
                    if (item.type === 'term') entry.term = item.content;
                    else entry.definition = item.content;
                    grouped.set(item.pairId, entry);
                }

                const questions: MiniGameQuestion[] = [];
                grouped.forEach((pair, pairId) => {
                    if (pair.term && pair.definition) {
                        questions.push({
                            id: pairId,
                            question: pair.definition,
                            options: [pair.term],
                            correctAnswerIndex: 0,
                        });
                    }
                });

                if (questions.length < 2) {
                    return {
                        questions: [],
                        topicTitle: topicName || '',
                        error: "Hafıza Kartları oynamak için bu konuda Kavram ve Notlar Stüdyosu'na kayıtlı en az 2 kavram ve tanım bulunmalıdır.",
                    };
                }

                return {
                    questions: questions.slice(0, 30),
                    topicTitle: topicName || '',
                };
            }}
        />
    );
}
