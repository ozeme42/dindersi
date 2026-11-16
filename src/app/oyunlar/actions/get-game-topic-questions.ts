'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { MiniGameQuestion, Question } from '@/lib/types';
import { getStaticQuestionsForGame, getQuestionsFromBank } from '@/lib/quiz-actions';
import { isDefinitionValidAndClean } from '@/lib/quiz-validation';
import { db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';

export type GetGameTopicQuestionsInput = {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    preferConceptsFirst?: boolean;
};

export type GetGameTopicQuestionsOutput = {
    questions: MiniGameQuestion[];
    topicTitle: string;
    error?: string;
};

// Kavram isimlerini temizleme
const cleanTerm = (raw: string) => {
    return String(raw || '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/^[0-9]+[\.\-\)\s]+/, '')
        .replace(/[âÂ]/g, 'A')
        .replace(/[îÎ]/g, 'İ')
        .replace(/[ûÛ]/g, 'U')
        .replace(/[êÊ]/g, 'E')
        .replace(/['’"”`\-\.]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

export async function getGameTopicQuestions(
    input: GetGameTopicQuestionsInput
): Promise<GetGameTopicQuestionsOutput> {
    noStore();
    const { courseId, unitId, topicId } = input;

    try {
        let topicTitle = 'Din Kültürü ve Ahlak Bilgisi';
        const rawPairs: { term: string; definition: string }[] = [];

        // 1. Statik dosyalardan veri çek
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
            for (const item of allItems || []) {
                if (!item) continue;
                if ('type' in item) {
                    let term = '';
                    let definition = '';

                    if (item.type === 'definition' || item.type === 'concept') {
                        term = String((item as any).content?.term || (item as any).content?.concept || (item as any).term || '').trim();
                        definition = String((item as any).content?.definition || (item as any).definition || '').trim();
                    } else if (item.type === 'conceptExplanation') {
                        term = String((item as any).concept || (item as any).term || '').trim();
                        definition = String((item as any).definition || '').trim();
                    } else if (item.type === 'flashcard') {
                        term = String((item as any).term || (item as any).correctAnswer || '').trim();
                        definition = String((item as any).definition || '').trim();
                    }

                    if (term && definition) {
                        const cleaned = cleanTerm(term);
                        if (cleaned.length >= 2 && cleaned.length <= 40 && isDefinitionValidAndClean(cleaned, definition)) {
                            rawPairs.push({ term: cleaned, definition });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Static items read warning:", e);
        }

        // 2. Firestore'dan konu başlığını ve ek kavramları çek
        if (topicId && topicId !== 'all') {
            try {
                let topicSnap = null;
                if (courseId && unitId) {
                    topicSnap = await getDoc(doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId));
                }
                if (!topicSnap || !topicSnap.exists()) {
                    topicSnap = await getDoc(doc(db, 'topics', topicId));
                }
                if (topicSnap && topicSnap.exists()) {
                    const topicData = topicSnap.data();
                    if (topicData.title) {
                        topicTitle = topicData.title;
                    }
                    if (Array.isArray(topicData.steps)) {
                        for (const step of topicData.steps) {
                            if (step.type === 'conceptExplanation' && Array.isArray(step.items)) {
                                for (const it of step.items) {
                                    const term = cleanTerm(it.concept || it.term || '');
                                    const definition = String(it.definition || '').trim();
                                    if (term && definition && isDefinitionValidAndClean(term, definition)) {
                                        rawPairs.push({ term, definition });
                                    }
                                }
                            } else if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    const term = cleanTerm(cd.term || cd.front || '');
                                    const definition = String(cd.definition || cd.back || '').trim();
                                    if (term && definition && isDefinitionValidAndClean(term, definition)) {
                                        rawPairs.push({ term, definition });
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Firestore topic doc read warning:", e);
            }
        }

        // Tekilleştir
        const seenTerms = new Set<string>();
        const uniquePairs: { term: string; definition: string }[] = [];
        for (const p of rawPairs) {
            const key = p.term.toLocaleLowerCase('tr-TR');
            if (!seenTerms.has(key)) {
                seenTerms.add(key);
                uniquePairs.push(p);
            }
        }

        const formattedQuestions: MiniGameQuestion[] = [];

        // Eğer en az 2 kavram-tanım çifti varsa bunları oyun formatına çevir
        if (uniquePairs.length >= 2) {
            const allTerms = uniquePairs.map(p => p.term);
            uniquePairs.forEach((pair, idx) => {
                // Diğer kavramlardan 3 çeldirici seç
                const otherTerms = allTerms.filter(t => t !== pair.term);
                const shuffledOthers = [...otherTerms].sort(() => 0.5 - Math.random());
                const distractors = shuffledOthers.slice(0, 3);
                while (distractors.length < 3) {
                    distractors.push(`Kavram ${distractors.length + 1}`);
                }

                formattedQuestions.push({
                    id: `concept-q-${idx + 1}`,
                    question: pair.definition,
                    options: [pair.term, ...distractors],
                    correctAnswerIndex: 0
                });
            });
        }

        // Eğer kavram azsa veya test soruları da eklemek istenirse soru bankasından çek
        if (formattedQuestions.length < 4) {
            try {
                const quizResult = await getQuestionsFromBank({
                    courseId,
                    unitId,
                    topicId,
                    questionTypes: ['mcq', 'tf'],
                    questionCount: 20
                });
                const mcqs = (quizResult.questions || []) as Question[];
                mcqs.forEach((q, idx) => {
                    if (q.question && Array.isArray(q.options) && q.options.length >= 2) {
                        const correctIdx = typeof q.correctAnswer === 'string'
                            ? Math.max(0, q.options.indexOf(q.correctAnswer))
                            : (typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0);

                        formattedQuestions.push({
                            id: `mcq-q-${idx + 1}`,
                            question: q.question,
                            options: q.options.slice(0, 4),
                            correctAnswerIndex: correctIdx
                        });
                    }
                });
            } catch (e) {
                console.warn("Question bank read warning:", e);
            }
        }

        // Eğer hiçbir veri bulunamadıysa Din Kültürü temel kavramlarından zenginleştirilmiş yedek set oluştur
        if (formattedQuestions.length === 0) {
            const FALLBACK_PAIRS = [
                { term: 'Tevhid', definition: 'Allah’ın bir ve tek olduğuna, eşi ve benzeri bulunmadığına inanmak.' },
                { term: 'İhsan', definition: 'Allah’ı görüyormuş gibi ibadet etmek; O’nu görmesek de O’nun bizi gördüğünün bilincinde olmak.' },
                { term: 'Zekat', definition: 'Dinen zengin sayılan Müslümanların yılda bir kez mallarının belirli bir kısmını ihtiyaç sahiplerine vermesi.' },
                { term: 'Sadaka', definition: 'Allah rızası için yapılan her türlü maddi ve manevi iyilik ve yardım.' },
                { term: 'Ahlak', definition: 'İnsanın iyi ve güzel davranışlar sergilemesini sağlayan manevi ve ruhi özelliklerin bütünü.' },
                { term: 'Siyer', definition: 'Hz. Muhammed’in (s.a.v.) hayatını, ahlakını ve mücadelesini inceleyen ilim dalı.' },
                { term: 'Tefsir', definition: 'Kur’an-ı Kerim ayetlerini açıklayan, yorumlayan ve anlamını derinlemesine inceleyen ilim.' },
                { term: 'Hadis', definition: 'Peygamber Efendimizin (s.a.v.) sözleri, fiilleri ve takrirleri (onayları).' },
                { term: 'Takva', definition: 'Allah’ın emir ve yasaklarına titizlikle uyarak O’nun sevgisini kaybetmekten sakınmak.' },
                { term: 'Adalet', definition: 'Her hak sahibine hakkını vermek, hak ve hukuka uygun davranmak.' }
            ];

            const allTerms = FALLBACK_PAIRS.map(p => p.term);
            FALLBACK_PAIRS.forEach((pair, idx) => {
                const distractors = allTerms.filter(t => t !== pair.term).sort(() => 0.5 - Math.random()).slice(0, 3);
                formattedQuestions.push({
                    id: `fallback-q-${idx + 1}`,
                    question: pair.definition,
                    options: [pair.term, ...distractors],
                    correctAnswerIndex: 0
                });
            });
        }

        return {
            questions: formattedQuestions.slice(0, 25),
            topicTitle: topicTitle || 'Din Kültürü ve Ahlak Bilgisi'
        };

    } catch (err: any) {
        console.error("getGameTopicQuestions Error:", err);
        return {
            questions: [],
            topicTitle: 'Oyun',
            error: err?.message || 'Sorular yüklenirken bir hata oluştu.'
        };
    }
}
