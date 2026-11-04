'use server';

import type { ActivityItem } from "@/lib/types";
import { getStaticQuestionsForGame, isDefinitionValidAndClean } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type KavramDuellosuQuestion = {
    q: string; // The definition
    a: string; // The correct term
    options: string[]; // All options including correct one
};

const FALLBACK_POOL = [
    'İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 
    'Adalet', 'Merhamet', 'Sabır', 'Şükür', 'İhlas', 'Takva', 'Furkan', 
    'İhsan', 'Hidayet', 'Sıdk', 'Emanet', 'Fetanet', 'İsmet', 'Tebliğ',
    'Kıyam', 'Rükû', 'Secde', 'Kıraat', 'Zekât', 'Sadaka', 'Hicret', 'Tevekkül'
];

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

export async function getKavramDuellosuQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: KavramDuellosuQuestion[]; error?: string }> {
    noStore();
    try {
        const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' });
        
        const pairs: { term: string; definition: string }[] = [];

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

                if (t.length >= 2 && t.length <= 40 && isDefinitionValidAndClean(t, d)) {
                    pairs.push({ term: t, definition: d });
                }
            }
        }

        if (pairs.length < 1) {
            pairs.push(...DEFAULT_PAIRS);
        }

        // Tekilleştir
        const uniquePairs: { term: string; definition: string }[] = [];
        const seenTerms = new Set<string>();

        for (const pair of pairs) {
            const termKey = pair.term.trim().toLocaleLowerCase('tr-TR');
            if (!seenTerms.has(termKey)) {
                seenTerms.add(termKey);
                uniquePairs.push(pair);
            }
        }

        const allTerms = [...new Set([...uniquePairs.map(p => p.term), ...FALLBACK_POOL])];
        
        const gameQuestions: KavramDuellosuQuestion[] = uniquePairs.map(item => {
            const correctAnswer = item.term;
            const normCorrect = correctAnswer.trim().toLocaleLowerCase('tr-TR');

            const candidateDistractors = allTerms.filter(term => {
                const normTerm = term.trim().toLocaleLowerCase('tr-TR');
                return normTerm !== normCorrect;
            });

            const shuffledDistractors = candidateDistractors.sort(() => 0.5 - Math.random());
            const selectedDistractors: string[] = [];
            const selectedNorms = new Set<string>();

            for (const d of shuffledDistractors) {
                const normD = d.trim().toLocaleLowerCase('tr-TR');
                if (!selectedNorms.has(normD)) {
                    selectedNorms.add(normD);
                    selectedDistractors.push(d);
                    if (selectedDistractors.length === 3) break;
                }
            }

            let fbIdx = 0;
            while (selectedDistractors.length < 3 && fbIdx < FALLBACK_POOL.length) {
                const candidate = FALLBACK_POOL[fbIdx++];
                const normCandidate = candidate.trim().toLocaleLowerCase('tr-TR');
                if (normCandidate !== normCorrect && !selectedNorms.has(normCandidate)) {
                    selectedNorms.add(normCandidate);
                    selectedDistractors.push(candidate);
                }
            }

            const options = [correctAnswer, ...selectedDistractors].sort(() => 0.5 - Math.random());

            return {
                q: item.definition,
                a: correctAnswer,
                options: options,
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions.sort(() => 0.5 - Math.random()))) };
    } catch (error: any) {
        console.error("Error getting Kavram Düellosu data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
