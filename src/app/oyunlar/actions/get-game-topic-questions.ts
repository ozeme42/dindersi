'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { MiniGameQuestion, Question } from '@/lib/types';
import { getStaticQuestionsForGame, getQuestionsFromBank } from '@/lib/quiz-actions';
import { isDefinitionValidAndClean, cleanClueForTerm } from '@/lib/quiz-validation';
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
    const effectiveTopicId = (topicId && topicId !== 'all' && topicId !== 'unit-flow' && topicId !== 'preview-topic' && topicId !== unitId) 
        ? topicId 
        : undefined;

    try {
        let topicTitle = 'Din Kültürü ve Ahlak Bilgisi';
        const rawPairs: { term: string; definition: string }[] = [];
        const mcqQuestions: MiniGameQuestion[] = [];

        // 1. Statik dosyalardan ve üniteden veri çek
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId: effectiveTopicId, dataType: 'all' });
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
                        const cleanClue = cleanClueForTerm(cleaned, definition);
                        if (cleaned.length >= 2 && cleaned.length <= 40 && isDefinitionValidAndClean(cleaned, cleanClue)) {
                            rawPairs.push({ term: cleaned, definition: cleanClue });
                        }
                    }

                    // Ünitedeki çoktan seçmeli soruları da doğrudan oyuna aktar
                    if ((item.type === 'mcq' || item.type === 'Çoktan Seçmeli') && Array.isArray((item as any).options) && (item as any).options.length >= 2) {
                        const qText = String((item as any).text || (item as any).question || '').trim();
                        if (qText && !/bu konuyla ilgili \d/i.test(qText)) {
                            const correct = String((item as any).correctAnswer || (item as any).options[0]).trim();
                            let correctIdx = (item as any).options.findIndex((o: any) => String(o).trim() === correct);
                            if (correctIdx < 0) correctIdx = typeof (item as any).correctAnswerIndex === 'number' ? (item as any).correctAnswerIndex : 0;
                            mcqQuestions.push({
                                id: item.id || `mcq-${mcqQuestions.length + 1}`,
                                question: qText,
                                options: ((item as any).options as any[]).map(o => String(o).trim()).slice(0, 4),
                                correctAnswerIndex: correctIdx
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Static items read warning:", e);
        }

        // 2. Firestore'dan konu veya ünite başlığını ve ek kavramları çek
        if (effectiveTopicId) {
            try {
                let topicSnap = null;
                if (courseId && unitId) {
                    topicSnap = await getDoc(doc(db, 'courses', courseId, 'units', unitId, 'topics', effectiveTopicId));
                }
                if (!topicSnap || !topicSnap.exists()) {
                    topicSnap = await getDoc(doc(db, 'topics', effectiveTopicId));
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
                                    const definition = cleanClueForTerm(term, String(it.definition || ''));
                                    if (term && definition && isDefinitionValidAndClean(term, definition)) {
                                        rawPairs.push({ term, definition });
                                    }
                                }
                            } else if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    const term = cleanTerm(cd.term || cd.front || '');
                                    const definition = cleanClueForTerm(term, String(cd.definition || cd.back || ''));
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
        } else if (unitId && courseId) {
            try {
                const uSnap = await getDoc(doc(db, 'courses', courseId, 'units', unitId));
                if (uSnap.exists()) {
                    const uData = uSnap.data();
                    if (uData.title) topicTitle = uData.title;
                }
            } catch {}
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

        // Eğer kavram-tanım çifti varsa bunları oyun formatına çevir
        if (uniquePairs.length >= 2) {
            const allTerms = uniquePairs.map(p => p.term);
            uniquePairs.forEach((pair, idx) => {
                // Diğer kavramlardan 3 çeldirici seç (asla harici kavram enjekte etme)
                const otherTerms = allTerms.filter(t => t.toLocaleLowerCase('tr-TR') !== pair.term.toLocaleLowerCase('tr-TR'));
                const shuffledOthers = [...otherTerms].sort(() => 0.5 - Math.random());
                const distractors = shuffledOthers.slice(0, 3);
                while (distractors.length < 3) {
                    distractors.push(`Kavram ${distractors.length + 1}`);
                }

                const allOpts = [pair.term, ...distractors].sort(() => 0.5 - Math.random());
                const correctIdx = allOpts.indexOf(pair.term);
                formattedQuestions.push({
                    id: `concept-q-${idx + 1}`,
                    question: pair.definition,
                    options: allOpts,
                    correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0
                });
            });
        }

        // Test sorularını da ekle
        mcqQuestions.forEach((mq) => {
            if (!formattedQuestions.some(fq => fq.question === mq.question)) {
                // Şıkları karıştır ve doğru cevabı takip et
                const correctText = mq.options[mq.correctAnswerIndex] || mq.options[0];
                const shuffledOpts = [...mq.options].sort(() => 0.5 - Math.random());
                const correctIdx = shuffledOpts.indexOf(correctText);
                formattedQuestions.push({
                    ...mq,
                    options: shuffledOpts,
                    correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0
                });
            }
        });

        // Eğer soru sayısı azsa soru bankasından çek
        if (formattedQuestions.length < 4) {
            try {
                const quizResult = await getQuestionsFromBank({
                    courseId,
                    unitId,
                    topicId: effectiveTopicId,
                    questionTypes: ['mcq', 'tf'],
                    questionCount: 20
                });
                const mcqs = (quizResult.questions || []) as Question[];
                mcqs.forEach((q, idx) => {
                    if (q.question && Array.isArray(q.options) && q.options.length >= 2) {
                        const correctText = typeof q.correctAnswer === 'string'
                            ? q.correctAnswer
                            : (typeof q.correctAnswerIndex === 'number' && q.options[q.correctAnswerIndex] ? q.options[q.correctAnswerIndex] : q.options[0]);
                        const slicedOpts = q.options.slice(0, 4);
                        const shuffledOpts = [...slicedOpts].sort(() => 0.5 - Math.random());
                        const correctIdx = shuffledOpts.indexOf(correctText);

                        formattedQuestions.push({
                            id: `bank-mcq-q-${idx + 1}`,
                            question: q.question,
                            options: shuffledOpts,
                            correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0
                        });
                    }
                });
            } catch (e) {
                console.warn("Question bank read warning:", e);
            }
        }

        // SADECE HİÇBİR parametre (courseId, unitId, topicId) verilmemişse demo set sun
        if (formattedQuestions.length === 0 && !courseId && !unitId && !effectiveTopicId) {
            const DEMO_PAIRS = [
                { term: 'Tevhid', definition: 'Allah’ın bir ve tek olduğuna kalpten inanmak.' },
                { term: 'Ahlak', definition: 'İnsanın iyi ve güzel davranışlar sergilemesini sağlayan manevi özellikler.' },
                { term: 'İbadet', definition: 'Allah rızası için yapılan her türlü güzel amel ve kulluk vazifesi.' },
                { term: 'Merhamet', definition: 'Bir canlının karşılaştığı kötü durumdan dolayı duyulan acıma ve yardım etme duygusu.' }
            ];
            const allTerms = DEMO_PAIRS.map(p => p.term);
            DEMO_PAIRS.forEach((pair, idx) => {
                const distractors = allTerms.filter(t => t !== pair.term).sort(() => 0.5 - Math.random()).slice(0, 3);
                const allOpts = [pair.term, ...distractors].sort(() => 0.5 - Math.random());
                const correctIdx = allOpts.indexOf(pair.term);
                formattedQuestions.push({
                    id: `demo-q-${idx + 1}`,
                    question: pair.definition,
                    options: allOpts,
                    correctAnswerIndex: correctIdx >= 0 ? correctIdx : 0
                });
            });
        }

        // Karıştır ve döndür
        const shuffled = [...formattedQuestions].sort(() => 0.5 - Math.random());

        return {
            questions: shuffled.slice(0, 30),
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
