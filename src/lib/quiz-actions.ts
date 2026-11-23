

'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
export type { GetQuizOutput };
import path from 'path';
import fs from 'fs/promises';
import { db } from "@/lib/firebase"; 
import { collection, doc, getDoc, query, where, getDocs, limit as firestoreLimit, Query, and, collectionGroup } from "firebase/firestore";
import { normalizeTr, isDefinitionValidAndClean } from "./quiz-validation";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}




// In-Memory Cache with 15-minute TTL to reduce Firestore reads to near zero
interface CacheEntry {
    data: (Question | ActivityItem)[];
    timestamp: number;
}
const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getFromCache(key: string): (Question | ActivityItem)[] | null {
    const entry = MEMORY_CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        MEMORY_CACHE.delete(key);
        return null;
    }
    return entry.data;
}

function setInCache(key: string, data: (Question | ActivityItem)[]) {
    if (MEMORY_CACHE.size > 500) {
        const oldestKey = MEMORY_CACHE.keys().next().value;
        if (oldestKey) MEMORY_CACHE.delete(oldestKey);
    }
    MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
}

// Helper to filter and shuffle questions
function filterAndShuffleQuestions(
    items: (Question | ActivityItem)[],
    questionCount: number,
    difficulty?: Question['difficulty'][],
    questionTypes?: string[]
): (Question | ActivityItem)[] {
    let filtered = items;

    if (questionTypes && questionTypes.length > 0) {
        const typeSet = new Set<string>();
        for (const qt of questionTypes) {
            typeSet.add(qt);
            if (qt === 'mcq') typeSet.add('Çoktan Seçmeli');
            if (qt === 'Çoktan Seçmeli') typeSet.add('mcq');
            if (qt === 'tf') typeSet.add('Doğru/Yanlış');
            if (qt === 'Doğru/Yanlış') typeSet.add('tf');
            if (qt === 'fitb') typeSet.add('Boşluk Doldurma');
            if (qt === 'Boşluk Doldurma') typeSet.add('fitb');
            if (qt === 'definition') typeSet.add('concept');
            if (qt === 'concept') typeSet.add('definition');
        }

        filtered = filtered.filter(item => {
            if ('type' in item && item.type) {
                return typeSet.has(item.type);
            }
            return false;
        });
    }

    if (difficulty && difficulty.length > 0) {
        const withDifficulty = filtered.filter(item => {
            if ('difficulty' in item && item.difficulty) {
                return difficulty.includes(item.difficulty);
            }
            return false;
        });
        // İstenen zorlukta soru varsa filtrele, yoksa mevcut soruları koru
        if (withDifficulty.length > 0) {
            filtered = withDifficulty;
        }
    }

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, questionCount);

    return selected.map(question => {
        if ('type' in question && (question.type === 'Çoktan Seçmeli' || question.type === 'mcq' || question.type === 'Boşluk Doldurma' || question.type === 'fitb') && 'options' in question && question.options) {
            const newOptions = [...question.options];
            newOptions.sort(() => Math.random() - 0.5);
            return { ...question, options: newOptions };
        }
        return question;
    });
}

// Centralized function to fetch questions - CACHED & STATIC-FIRST
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 100, difficulty, questionTypes, isStatic } = params;
    const typedDifficulty = difficulty as ('Kolay' | 'Orta' | 'Zor')[] | undefined;

    // 1. STATİK ÖNCELİK (0 FIRESTORE READS):
    // Önce yerel JSON dosyalarını kontrol et. Eğer yerel veri varsa Firestore'a HİÇ gitme!
    try {
        const staticItems = await getStaticGameData({ topicId, unitId, courseId });
        if (staticItems && staticItems.length > 0) {
            const selectedItems = filterAndShuffleQuestions(staticItems, questionCount, typedDifficulty, questionTypes);
            if (selectedItems.length > 0) {
                return { questions: JSON.parse(JSON.stringify(selectedItems)) };
            }
            // Fallback: Belirtilen zorluk uymadıysa diğer zorluklardaki soruları dön
            const fallbackAnyDiff = filterAndShuffleQuestions(staticItems, questionCount, undefined, questionTypes);
            if (fallbackAnyDiff.length > 0) {
                return { questions: JSON.parse(JSON.stringify(fallbackAnyDiff)) };
            }
        }
    } catch (err) {
        console.warn("Static data fetch warning, falling back to cache/DB:", err);
    }

    // 2. IN-MEMORY CACHE (0 FIRESTORE READS):
    // Eğer aynı konu için son 15 dakika içinde veritabanından çekilmiş veri varsa doğrudan bellekten dön!
    const cacheKey = `${courseId || 'all'}_${unitId || 'all'}_${topicId || 'all'}_${(questionTypes || []).join('-')}`;
    const cachedItems = getFromCache(cacheKey);
    if (cachedItems && cachedItems.length > 0) {
        const selectedItems = filterAndShuffleQuestions(cachedItems, questionCount, typedDifficulty, questionTypes);
        if (selectedItems.length > 0) {
            return { questions: JSON.parse(JSON.stringify(selectedItems)) };
        }
    }

    // 3. GÜVENLİ FIRESTORE SORGUSU (GÜVENLİ LIMIT İLE KOTA KORUMASI):
    try {
        const isActivity = questionTypes && (questionTypes.includes('definition') || questionTypes.includes('concept') || questionTypes.includes('sentence'));
        const collectionName = isActivity ? "activityItems" : "questions";

        let q: Query = collection(db, collectionName);
        let conditions: any[] = [];

        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        if (difficulty && difficulty.length > 0) {
            conditions.push(where("difficulty", "in", difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            conditions.push(where("type", "in", mappedTypes));
        }
        
        // KOTA KORUMASI: Asla limitsiz sorgu atma! İhtiyaç olanın en fazla 2 katını veya max 40 belge çek.
        const safeLimit = Math.min(Math.max(questionCount * 2, 20), 40);
        conditions.push(firestoreLimit(safeLimit));

        if (conditions.length > 0) {
            q = query(q, and(...conditions));
        }
        
        const querySnapshot = await getDocs(q);
        const allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Question | ActivityItem;
        });

        // Belleğe kaydet ki sonraki 15 dakika gelen öğrenciler veritabanını tüketmesin
        if (allQuestions.length > 0) {
            setInCache(cacheKey, allQuestions);
        }

        const selectedQuestions = filterAndShuffleQuestions(allQuestions, questionCount, typedDifficulty, questionTypes);

        if (selectedQuestions.length === 0) {
            return { questions: [], error: "Belirtilen kriterlere uygun soru/veri bulunamadı." };
        }

        return { questions: JSON.parse(JSON.stringify(selectedQuestions)) };

    } catch (e: any) {
        console.error("Error fetching questions from DB:", e);
        if (e.code === 'failed-precondition') {
             return { questions: [], error: `Veritabanı indeksi eksik veya oluşturuluyor. Hata: ${e.message}` };
        }
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

// Global module-level in-memory caches for ultra-fast response times (0ms on warm reads)
const STATIC_FILE_CACHE = new Map<string, any[]>();
const STATIC_TOPIC_CACHE = new Map<string, (ActivityItem | Question)[]>();
let CACHED_MANIFEST: any = null;

export async function clearStaticGameCache() {
    STATIC_FILE_CACHE.clear();
    STATIC_TOPIC_CACHE.clear();
    CACHED_MANIFEST = null;
    MEMORY_CACHE.clear();
}

const readJsonFile = async (filePath: string): Promise<any[] | null> => {
    if (STATIC_FILE_CACHE.has(filePath)) {
        return STATIC_FILE_CACHE.get(filePath) || null;
    }
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        STATIC_FILE_CACHE.set(filePath, parsed);
        return parsed;
    } catch (e: any) {
        if (e.code !== 'ENOENT') console.error(`Error reading ${filePath}:`, e);
        return null;
    }
};

const readDataForTopic = async (topicIdToFetch: string): Promise<(ActivityItem | Question)[]> => {
    if (STATIC_TOPIC_CACHE.has(topicIdToFetch)) {
        return STATIC_TOPIC_CACHE.get(topicIdToFetch)!;
    }

    const activityPath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicIdToFetch}.json`);
    const activityItemsPath = path.join(process.cwd(), 'public', 'curriculum', 'activityItems', `${topicIdToFetch}.json`);
    const activityItemsDashPath = path.join(process.cwd(), 'public', 'curriculum', 'activity-items', `${topicIdToFetch}.json`);
    const questionPath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicIdToFetch}.json`);
    const flowPath = path.join(process.cwd(), 'public', 'curriculum', 'flows', `${topicIdToFetch}.json`);
    const yazilacaklarPath = path.join(process.cwd(), 'public', 'curriculum', 'yazilacaklar', `${topicIdToFetch}.json`);

    let [activityData, questionData, flowData, yazilacaklarRaw] = await Promise.all([
        readJsonFile(activityPath),
        readJsonFile(questionPath),
        readJsonFile(flowPath),
        readJsonFile(yazilacaklarPath),
    ]);

    if (!activityData || activityData.length === 0) {
        activityData = await readJsonFile(activityItemsPath);
    }
    if (!activityData || activityData.length === 0) {
        activityData = await readJsonFile(activityItemsDashPath);
    }

    // Firestore Fallback: Eğer yerel statik dosyalarda veri yoksa doğrudan Firestore'dan çek (0 kesinti)
    let dbActivityItems: ActivityItem[] = [];
    if (!activityData || activityData.length === 0) {
        try {
            const q = query(collection(db, "activityItems"), where("topicId", "==", topicIdToFetch));
            const snap = await getDocs(q);
            dbActivityItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem));
        } catch (err) {
            console.warn(`Firestore activityItems fallback warning for ${topicIdToFetch}:`, err);
        }
    }

    let dbQuestions: Question[] = [];
    if (!questionData || questionData.length === 0) {
        try {
            const q = query(collection(db, "questions"), where("topicId", "==", topicIdToFetch));
            const snap = await getDocs(q);
            dbQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        } catch (err) {
            console.warn(`Firestore questions fallback warning for ${topicIdToFetch}:`, err);
        }
    }

    // Yazılacaklar → ActivityItem dönüşümü
    const yazilacaklarItems: (ActivityItem | Question)[] = [];
    if (yazilacaklarRaw && !Array.isArray(yazilacaklarRaw)) {
        const wr = yazilacaklarRaw as any;
        if (Array.isArray(wr.conceptDefinitions)) {
            wr.conceptDefinitions.forEach((cd: any, idx: number) => {
                if (cd.concept && cd.definition) {
                    yazilacaklarItems.push({
                        id: `yaz-def-${topicIdToFetch}-${idx}`,
                        type: 'definition',
                        content: { term: String(cd.concept).trim(), definition: String(cd.definition).trim() },
                        topicId: topicIdToFetch
                    } as any);
                }
            });
        }
        if (Array.isArray(wr.notes)) {
            wr.notes.forEach((note: string, idx: number) => {
                if (note && note.trim()) {
                    yazilacaklarItems.push({
                        id: `yaz-note-${topicIdToFetch}-${idx}`,
                        type: 'sentence',
                        content: { text: String(note).trim() },
                        topicId: topicIdToFetch
                    } as any);
                }
            });
        }
    }

    const flowItems: (ActivityItem | Question)[] = [];
    if (Array.isArray(flowData)) {
        flowData.forEach((step: any, sIdx: number) => {
            if (step.isPublished === false) return;
            if (step.type === 'conceptExplanation' && Array.isArray(step.items)) {
                step.items.forEach((it: any, iIdx: number) => {
                    const term = String(it.concept || it.term || '').trim();
                    const definition = String(it.definition || '').trim();
                    if (term && definition && definition.length >= 3 && !/ipucu|sıralayarak|harflerini/i.test(definition)) {
                        flowItems.push({
                            id: `flow-ce-${topicIdToFetch}-${sIdx}-${iIdx}`,
                            type: 'definition',
                            content: { term, definition },
                            topicId: topicIdToFetch
                        } as any);
                        flowItems.push({
                            id: `flow-c-${topicIdToFetch}-${sIdx}-${iIdx}`,
                            type: 'concept',
                            content: { term, text: term },
                            topicId: topicIdToFetch
                        } as any);
                    }
                });
            }
            if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                step.cards.forEach((cd: any, cIdx: number) => {
                    const term = String(cd.term || cd.correctAnswer || '').trim();
                    const definition = String(cd.definition || '').trim();
                    if (term && definition && definition.length >= 3 && !/ipucu|sıralayarak|harflerini/i.test(definition)) {
                        flowItems.push({
                            id: `flow-fc-${topicIdToFetch}-${sIdx}-${cIdx}`,
                            type: 'definition',
                            content: { term, definition },
                            topicId: topicIdToFetch
                        } as any);
                        flowItems.push({
                            id: `flow-fcc-${topicIdToFetch}-${sIdx}-${cIdx}`,
                            type: 'concept',
                            content: { term, text: term },
                            topicId: topicIdToFetch
                        } as any);
                    }
                });
            }
            if (step.type === 'trueFalseList' && Array.isArray(step.questions)) {
                step.questions.forEach((q: any, qIdx: number) => {
                    if (q.statement) {
                        flowItems.push({
                            id: `flow-tf-${topicIdToFetch}-${sIdx}-${qIdx}`,
                            type: 'Doğru/Yanlış',
                            text: String(q.statement).trim(),
                            correctAnswer: q.isCorrect ? 'Doğru' : 'Yanlış',
                            options: ['Doğru', 'Yanlış'],
                            difficulty: 'Orta',
                            topicId: topicIdToFetch
                        } as any);
                    }
                });
            }
        });
    }

    const allCombined = [
        ...(activityData || []),
        ...dbActivityItems,
        ...yazilacaklarItems,
        ...(questionData || []),
        ...dbQuestions,
        ...flowItems
    ];

    // Tekilleştirme (aynı id veya içerik tekrar etmesin)
    const seenItemKeys = new Set<string>();
    const deduplicated: (ActivityItem | Question)[] = [];
    for (const item of allCombined) {
        const itemKey = (item as any).id || `${item.type}_${(item as any).content?.term || (item as any).content?.text || (item as any).text}`;
        if (!seenItemKeys.has(itemKey)) {
            seenItemKeys.add(itemKey);
            deduplicated.push(item);
        }
    }

    STATIC_TOPIC_CACHE.set(topicIdToFetch, deduplicated);
    return deduplicated;
};

// Helper: Slayt adımlarından tüm kavram, tanım ve soruları eksiksiz çıkaran fonksiyon
export function extractAllItemsFromSteps(
    steps: any[], 
    unitId?: string, 
    topicId?: string
): (ActivityItem | Question)[] {
    const out: (ActivityItem | Question)[] = [];
    if (!Array.isArray(steps)) return out;

    steps.forEach((step, sIdx) => {
        if (!step || step.isPublished === false) return;

        // 1. categoryTable (Ünite genelinde kavram ve tanımların en zengin olduğu yer)
        if (step.type === 'categoryTable' && Array.isArray(step.categories)) {
            step.categories.forEach((cat: any, cIdx: number) => {
                (cat.items || []).forEach((it: any, itIdx: number) => {
                    const text = String(it || '').trim();
                    const match = text.match(/^([^:;–—\-]{2,40})[:;–—\-]\s*(.+)$/);
                    if (match) {
                        const term = match[1].replace(/^\d+[\.\)]\s*/, '').trim();
                        const definition = match[2].trim();
                        if (term.length >= 2 && term.length <= 40 && definition.length >= 4) {
                            out.push({
                                id: `ct-def-${unitId || topicId || 'u'}-${sIdx}-${cIdx}-${itIdx}`,
                                type: 'definition',
                                content: { term, definition },
                                unitId,
                                topicId
                            } as any);
                            out.push({
                                id: `ct-c-${unitId || topicId || 'u'}-${sIdx}-${cIdx}-${itIdx}`,
                                type: 'concept',
                                content: { term, text: term },
                                unitId,
                                topicId
                            } as any);
                        }
                    } else if (text.length >= 3 && text.length <= 35 && !text.includes('.')) {
                        out.push({
                            id: `ct-raw-${unitId || topicId || 'u'}-${sIdx}-${cIdx}-${itIdx}`,
                            type: 'concept',
                            content: { term: text, text },
                            unitId,
                            topicId
                        } as any);
                    }
                });
            });
        }

        // 2. conceptExplanation
        if (step.type === 'conceptExplanation' && Array.isArray(step.items)) {
            step.items.forEach((it: any, iIdx: number) => {
                const term = String(it.concept || it.term || '').trim();
                const definition = String(it.definition || '').trim();
                if (term) {
                    out.push({
                        id: `ce-def-${unitId || topicId || 'u'}-${sIdx}-${iIdx}`,
                        type: 'definition',
                        content: { term, definition },
                        unitId,
                        topicId
                    } as any);
                    out.push({
                        id: `ce-c-${unitId || topicId || 'u'}-${sIdx}-${iIdx}`,
                        type: 'concept',
                        content: { term, text: term },
                        unitId,
                        topicId
                    } as any);
                }
            });
        }

        // 3. flashcard / anagramFlashcard
        if ((step.type === 'flashcard' || step.type === 'anagramFlashcard') && Array.isArray(step.cards)) {
            step.cards.forEach((cd: any, cIdx: number) => {
                const term = String(cd.term || cd.correctAnswer || '').trim();
                const definition = String(cd.definition || '').trim();
                if (term) {
                    out.push({
                        id: `fc-def-${unitId || topicId || 'u'}-${sIdx}-${cIdx}`,
                        type: 'definition',
                        content: { term, definition },
                        unitId,
                        topicId
                    } as any);
                    out.push({
                        id: `fc-c-${unitId || topicId || 'u'}-${sIdx}-${cIdx}`,
                        type: 'concept',
                        content: { term, text: term },
                        unitId,
                        topicId
                    } as any);
                }
            });
        }

        // 4. matching / conceptMatching
        if ((step.type === 'matching' || step.type === 'conceptMatching') && Array.isArray(step.pairs)) {
            step.pairs.forEach((p: any, pIdx: number) => {
                const term = String(p.concept || p.term || '').trim();
                const definition = String(p.definition || '').trim();
                if (term && !/kavram \d/i.test(term)) {
                    out.push({
                        id: `m-def-${unitId || topicId || 'u'}-${sIdx}-${pIdx}`,
                        type: 'definition',
                        content: { term, definition },
                        unitId,
                        topicId
                    } as any);
                    out.push({
                        id: `m-c-${unitId || topicId || 'u'}-${sIdx}-${pIdx}`,
                        type: 'concept',
                        content: { term, text: term },
                        unitId,
                        topicId
                    } as any);
                }
            });
        }

        // 5. categorySort
        if (step.type === 'categorySort' && Array.isArray(step.items)) {
            step.items.forEach((it: any, itIdx: number) => {
                const term = String(it.text || '').trim();
                const hint = String(it.hint || '').trim();
                if (term && !/namazının farzı|vitir namazı/i.test(term)) {
                    out.push({
                        id: `cs-c-${unitId || topicId || 'u'}-${sIdx}-${itIdx}`,
                        type: 'concept',
                        content: { term, text: term },
                        unitId,
                        topicId
                    } as any);
                    if (hint) {
                        out.push({
                            id: `cs-def-${unitId || topicId || 'u'}-${sIdx}-${itIdx}`,
                            type: 'definition',
                            content: { term, definition: hint },
                            unitId,
                            topicId
                        } as any);
                    }
                }
            });
        }

        // 6. clozeParagraph
        if (step.type === 'clozeParagraph' && Array.isArray(step.blanks)) {
            step.blanks.forEach((b: any, bIdx: number) => {
                const term = String(b.targetWord || '').trim();
                const definition = String(b.hint || '').trim();
                if (term) {
                    out.push({
                        id: `cp-c-${unitId || topicId || 'u'}-${sIdx}-${bIdx}`,
                        type: 'concept',
                        content: { term, text: term },
                        unitId,
                        topicId
                    } as any);
                    if (definition) {
                        out.push({
                            id: `cp-def-${unitId || topicId || 'u'}-${sIdx}-${bIdx}`,
                            type: 'definition',
                            content: { term, definition },
                            unitId,
                            topicId
                        } as any);
                    }
                }
            });
        }

        // 7. notebookNote
        if (step.type === 'notebookNote' && Array.isArray(step.notes)) {
            step.notes.forEach((nt: any, nIdx: number) => {
                const line = String(nt || '').trim();
                const match = line.match(/^([^:;–—\-]{2,35})[:;–—\-]\s*(.+)$/);
                if (match) {
                    const term = match[1].replace(/^\d+[\.\)]\s*/, '').trim();
                    const definition = match[2].trim();
                    if (term.length >= 2 && term.length <= 35 && definition.length >= 4) {
                        out.push({
                            id: `nn-def-${unitId || topicId || 'u'}-${sIdx}-${nIdx}`,
                            type: 'definition',
                            content: { term, definition },
                            unitId,
                            topicId
                        } as any);
                        out.push({
                            id: `nn-c-${unitId || topicId || 'u'}-${sIdx}-${nIdx}`,
                            type: 'concept',
                            content: { term, text: term },
                            unitId,
                            topicId
                        } as any);
                    }
                }
            });
        }

        // 8. mcq / Çoktan Seçmeli
        if ((step.type === 'mcq' || step.type === 'Çoktan Seçmeli') && step.question) {
            const qText = String(step.question).trim();
            if (!/bu konuyla ilgili \d/i.test(qText)) {
                out.push({
                    id: step.id || `mcq-${unitId || topicId || 'u'}-${sIdx}`,
                    type: 'Çoktan Seçmeli',
                    text: qText,
                    options: step.options || [],
                    correctAnswer: step.options?.[step.correctAnswerIndex ?? 0] || step.correctAnswer || '',
                    difficulty: step.difficulty || 'Orta',
                    unitId,
                    topicId
                } as any);
            }
        }

        // 9. tf / trueFalseList
        if (step.type === 'trueFalseList' && Array.isArray(step.questions)) {
            step.questions.forEach((q: any, qIdx: number) => {
                if (q.statement) {
                    out.push({
                        id: `tf-${unitId || topicId || 'u'}-${sIdx}-${qIdx}`,
                        type: 'Doğru/Yanlış',
                        text: String(q.statement).trim(),
                        correctAnswer: q.isCorrect ? 'Doğru' : 'Yanlış',
                        options: ['Doğru', 'Yanlış'],
                        difficulty: 'Orta',
                        unitId,
                        topicId
                    } as any);
                }
            });
        }
        if (step.type === 'tf' && step.statement) {
            out.push({
                id: step.id || `tf-s-${unitId || topicId || 'u'}-${sIdx}`,
                type: 'Doğru/Yanlış',
                text: String(step.statement).trim(),
                correctAnswer: step.isCorrect ? 'Doğru' : 'Yanlış',
                options: ['Doğru', 'Yanlış'],
                difficulty: 'Orta',
                unitId,
                topicId
            } as any);
        }

        // 10. miniGame
        if (step.type === 'miniGame' && Array.isArray(step.questions)) {
            step.questions.forEach((q: any, qIdx: number) => {
                const qText = String(q.question || '').trim();
                const correctOpt = String(q.options?.[q.correctAnswerIndex ?? 0] || '').trim();
                if (!/bu konuyla ilgili \d/i.test(qText) && !/doğru seçenek/i.test(correctOpt)) {
                    out.push({
                        id: q.id || `mg-${unitId || topicId || 'u'}-${sIdx}-${qIdx}`,
                        type: 'Çoktan Seçmeli',
                        text: qText,
                        options: q.options || [],
                        correctAnswer: correctOpt,
                        unitId,
                        topicId
                    } as any);
                    if (correctOpt.length >= 2 && correctOpt.length <= 35 && !correctOpt.includes('.')) {
                        out.push({
                            id: `mg-c-${unitId || topicId || 'u'}-${sIdx}-${qIdx}`,
                            type: 'concept',
                            content: { term: correctOpt, text: correctOpt },
                            unitId,
                            topicId
                        } as any);
                        if (qText.length >= 5) {
                            out.push({
                                id: `mg-def-${unitId || topicId || 'u'}-${sIdx}-${qIdx}`,
                                type: 'definition',
                                content: { term: correctOpt, definition: qText },
                                unitId,
                                topicId
                            } as any);
                        }
                    }
                }
            });
        }
    });

    return out;
}

// Helper: Unit ID'nin ait olduğu dersi bulan yardımcı
async function resolveCourseIdForUnit(unitId: string): Promise<string | null> {
    if (!unitId || unitId === 'preview-unit') return null;
    if (!CACHED_MANIFEST) {
        try {
            const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            CACHED_MANIFEST = JSON.parse(manifestContent);
        } catch {}
    }
    if (CACHED_MANIFEST?.classGroups) {
        for (const g of CACHED_MANIFEST.classGroups) {
            for (const c of g.courses || []) {
                if (c.units?.some((u: any) => u.id === unitId)) {
                    return c.id;
                }
            }
        }
    }
    try {
        const coursesSnap = await getDocs(collection(db, 'courses'));
        for (const cDoc of coursesSnap.docs) {
            const uDoc = await getDoc(doc(db, 'courses', cDoc.id, 'units', unitId));
            if (uDoc.exists()) {
                return cDoc.id;
            }
        }
    } catch {}
    return null;
}

/**
 * Fetches data from static JSON files for games. Reads from `activities`, `questions`, and `flows` directories.
 * If topicId is 'all', it aggregates data from all topics within the given unit.
 */
export async function getStaticGameData(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
}): Promise<(ActivityItem | Question)[]> {
    const { unitId, topicId } = params;
    let courseId = params.courseId;

    if (topicId && topicId !== 'all') {
        return readDataForTopic(topicId);
    } else if (unitId && unitId !== 'all') {
        const unitCacheKey = `unit_${unitId}`;
        if (STATIC_TOPIC_CACHE.has(unitCacheKey)) {
            return STATIC_TOPIC_CACHE.get(unitCacheKey)!;
        }

        let allUnitItems: (ActivityItem | Question)[] = [];

        // 1. Önce bu ünitenin doğrudan bir ders akışı (flow) dosyası var mı kontrol et
        try {
            const unitFlowPath = path.join(process.cwd(), 'public', 'curriculum', 'flows', `${unitId}.json`);
            const flowContent = await fs.readFile(unitFlowPath, 'utf-8');
            const flowSteps = JSON.parse(flowContent);
            if (Array.isArray(flowSteps)) {
                allUnitItems.push(...extractAllItemsFromSteps(flowSteps, unitId));
            }
        } catch (flowErr) {
            // Flow dosyası olmayabilir, normal
        }

        // 2. Manifest'ten bu üniteye ait TÜM konuların verilerini topla
        try {
            if (!CACHED_MANIFEST) {
                const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
                const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                CACHED_MANIFEST = JSON.parse(manifestContent);
            }
            const manifest = CACHED_MANIFEST;
            
            let targetUnit: any;
            for (const group of manifest.classGroups || []) {
                for (const course of group.courses || []) {
                    const foundUnit = course.units?.find((u: any) => u.id === unitId);
                    if (foundUnit) {
                        targetUnit = foundUnit;
                        if (!courseId) courseId = course.id;
                        break;
                    }
                }
                if (targetUnit) break;
            }

            if (targetUnit && targetUnit.topics && targetUnit.topics.length > 0) {
                const topicDataPromises = targetUnit.topics.map((topic: any) => readDataForTopic(topic.id));
                const allTopicsData = await Promise.all(topicDataPromises);
                allUnitItems.push(...allTopicsData.flat());
            }
        } catch (mErr) {
            console.warn("Manifest unit check error:", mErr);
        }

        // 3. Eğer courseId eksikse dinamik olarak çöz
        if (!courseId || courseId === 'preview-course') {
            const resolved = await resolveCourseIdForUnit(unitId);
            if (resolved) courseId = resolved;
        }

        // 4. Firestore'dan ünite belgesini ve alt konularını tara
        try {
            if (courseId && unitId && unitId !== 'preview-unit') {
                // A) Doğrudan ünite belgesindeki slaytları ve kaynak metni tara
                try {
                    const uSnap = await getDoc(doc(db, 'courses', courseId, 'units', unitId));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        if (Array.isArray(uData.steps)) {
                            allUnitItems.push(...extractAllItemsFromSteps(uData.steps, unitId));
                        }
                    }
                } catch (uErr) {
                    console.warn("Firestore unit doc fetch warning:", uErr);
                }

                // B) Ünitenin altındaki tüm konuları (topics subcollection) tara
                try {
                    const topicsSnap = await getDocs(collection(db, `courses/${courseId}/units/${unitId}/topics`));
                    for (const tDoc of topicsSnap.docs) {
                        const tData = tDoc.data();
                        // 1) Yerel dosyalardan bu konunun verilerini oku
                        const localTopicItems = await readDataForTopic(tDoc.id);
                        allUnitItems.push(...localTopicItems);

                        // 2) Firestore'daki topic slaytlarını da tara
                        if (Array.isArray(tData.steps)) {
                            allUnitItems.push(...extractAllItemsFromSteps(tData.steps, unitId, tDoc.id));
                        }

                        // 3) writingContent.conceptDefinitions
                        if (Array.isArray(tData?.writingContent?.conceptDefinitions)) {
                            tData.writingContent.conceptDefinitions.forEach((cd: any, cdIdx: number) => {
                                const term = String(cd.concept || cd.term || '').trim();
                                const definition = String(cd.definition || '').trim();
                                if (term) {
                                    allUnitItems.push({
                                        id: `fs-top-cd-${tDoc.id}-${cdIdx}`,
                                        type: 'definition',
                                        content: { term, definition },
                                        unitId,
                                        topicId: tDoc.id
                                    } as any);
                                    allUnitItems.push({
                                        id: `fs-top-c-${tDoc.id}-${cdIdx}`,
                                        type: 'concept',
                                        content: { term, text: term },
                                        unitId,
                                        topicId: tDoc.id
                                    } as any);
                                }
                            });
                        }
                    }
                } catch (tErr) {
                    console.warn("Firestore unit topics subcollection fetch warning:", tErr);
                }

                // C) Firestore activityItems koleksiyonunu filtrele
                try {
                    const actSnap = await getDocs(query(collection(db, 'activityItems'), where('unitId', '==', unitId)));
                    actSnap.docs.forEach(d => {
                        allUnitItems.push({ id: d.id, ...d.data() } as any);
                    });
                } catch {}
            }
        } catch (fsErr) {
            console.warn("Firestore unit extraction error:", fsErr);
        }

        // Tekilleştirme (aynı kavram veya soru tekrar etmesin)
        const seenKeys = new Set<string>();
        const deduplicatedUnitItems: (ActivityItem | Question)[] = [];
        for (const item of allUnitItems) {
            const term = (item as any).content?.term || (item as any).content?.concept || (item as any).term || (item as any).text;
            const itemKey = `${item.type}_${String(term || (item as any).id).toLocaleLowerCase('tr-TR').trim()}`;
            if (!seenKeys.has(itemKey)) {
                seenKeys.add(itemKey);
                deduplicatedUnitItems.push(item);
            }
        }

        STATIC_TOPIC_CACHE.set(unitCacheKey, deduplicatedUnitItems);
        return deduplicatedUnitItems;
    }

    return [];
}


// --- Wrapper around getStaticGameData ---
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
  dataType?: 'activities' | 'questions' | 'all';
}): Promise<(ActivityItem | Question)[]> {
    const { dataType = 'all', ...restParams } = params;
    
    const allData = await getStaticGameData(restParams);

    if (dataType === 'all') {
        return allData;
    }
    
    const QUESTION_TYPES = new Set(['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma', 'mcq', 'tf', 'fitb', 'Açık Uçlu']);
    const ACTIVITY_TYPES = new Set(['concept', 'definition', 'sentence', 'categorization', 'sorting']);

    return allData.filter(item => {
        const itemType = (item as any).type;
        if (dataType === 'questions') return QUESTION_TYPES.has(itemType) || ('options' in item && !ACTIVITY_TYPES.has(itemType));
        if (dataType === 'activities') return ACTIVITY_TYPES.has(itemType);
        return true;
    });
}

/**
 * Server Action: MiniGamePlayer ve oyunlar için ünitenin veya konunun gerçek kavram ve sorularını döner.
 * Eğer oyun bir kelime oyunuysa (kelime-avi, anagram, eslestirme vb.) ve soru havuzu yoksa kavram-tanım çiftlerini döner.
 * Eğer test oyunuysa (penalti, carkifelek vb.) ve hazır soru yoksa kavram-tanımlardan dinamik test sorusu üretir!
 */
export async function getUnitOrTopicGameQuestionsAction(params: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    sablon?: string;
}): Promise<{
    questions: Array<{
        id: string;
        question: string;
        options: string[];
        correctAnswerIndex: number;
        explanation?: string;
    }>;
    conceptPairs?: Array<{
        term: string;
        definition: string;
    }>;
    error?: string;
}> {
    try {
        const allItems = await getStaticGameData({
            courseId: params.courseId,
            unitId: params.unitId,
            topicId: params.topicId
        });

        // 1. Çoktan seçmeli soruları topla
        const mcqQuestions: Array<{
            id: string;
            question: string;
            options: string[];
            correctAnswerIndex: number;
            explanation?: string;
        }> = [];

        allItems.forEach((it, idx) => {
            if ('type' in it && (it.type === 'Çoktan Seçmeli' || it.type === 'mcq') && 'options' in it && it.options && it.options.length >= 2) {
                const qText = String(it.text || (it as any).question || '').trim();
                const correct = String(it.correctAnswer || it.options[0]).trim();
                let correctIdx = (it.options as any[]).findIndex((o: any) => String(o).trim() === correct);
                if (correctIdx < 0) correctIdx = 0;
                if (qText && !/bu konuyla ilgili \d/i.test(qText)) {
                    mcqQuestions.push({
                        id: it.id || `unit-q-${idx}`,
                        question: qText,
                        options: (it.options as any[]).map((o: any) => String(o).trim()),
                        correctAnswerIndex: correctIdx
                    });
                }
            }
        });

        // 2. Kavram & Tanım çiftlerini topla
        const conceptMap = new Map<string, string>();
        allItems.forEach(it => {
            if ('type' in it) {
                let term = '';
                let def = '';
                if (it.type === 'definition') {
                    term = String((it as any).content?.term || (it as any).term || '').trim();
                    def = String((it as any).content?.definition || (it as any).definition || '').trim();
                } else if (it.type === 'concept') {
                    term = String((it as any).content?.term || (it as any).content?.text || (it as any).term || '').trim();
                    def = String((it as any).content?.definition || (it as any).content?.meaning || (it as any).definition || '').trim();
                }
                if (term && term.length >= 2 && term.length <= 40 && !/^(doğru|kavram \d)$/i.test(term)) {
                    if (def && def.length >= 4 && !conceptMap.has(term)) {
                        conceptMap.set(term, def);
                    } else if (!conceptMap.has(term)) {
                        conceptMap.set(term, `${term} kavramı ile ilgili açıklama`);
                    }
                }
            }
        });

        const conceptPairs = Array.from(conceptMap.entries()).map(([term, definition]) => ({ term, definition }));
        const allTerms = conceptPairs.map(cp => cp.term);

        // 3. Eğer çoktan seçmeli soru yetersizse kavramlardan dinamik çoktan seçmeli soru türet
        if (mcqQuestions.length < 5 && conceptPairs.length >= 2) {
            conceptPairs.forEach((cp, idx) => {
                const normTerm = cp.term.toLocaleLowerCase('tr-TR');
                const distractors = allTerms
                    .filter(t => t.toLocaleLowerCase('tr-TR') !== normTerm)
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3);

                if (distractors.length >= 1) {
                    const opts = [cp.term, ...distractors].sort(() => 0.5 - Math.random());
                    const correctIdx = opts.indexOf(cp.term);
                    mcqQuestions.push({
                        id: `derived-mcq-${idx}`,
                        question: `"${cp.definition}" tanımı aşağıdaki hangi kavrama aittir?`,
                        options: opts,
                        correctAnswerIndex: correctIdx
                    });
                }
            });
        }

        return {
            questions: mcqQuestions,
            conceptPairs
        };
    } catch (e: any) {
        console.error("Error in getUnitOrTopicGameQuestionsAction:", e);
        return { questions: [], conceptPairs: [], error: e.message };
    }
}


