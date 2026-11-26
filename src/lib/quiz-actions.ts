

'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
export type { GetQuizOutput };
import path from 'path';
import fs from 'fs/promises';
import { db } from "@/lib/firebase"; 
import { collection, doc, getDoc, query, where, getDocs, limit as firestoreLimit, Query, and, collectionGroup } from "firebase/firestore";
import { normalizeTr, isDefinitionValidAndClean } from "./quiz-validation";
import { normalizeConcept } from "./concept-utils";

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

const readJsonFile = async (filePath: string): Promise<any | null> => {
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

const getFileMtimeMs = async (filePath: string): Promise<number | null> => {
    try {
        const st = await fs.stat(filePath);
        return st.mtimeMs;
    } catch {
        return null;
    }
};

/**
 * Loads ONLY registered "Kavram & Notlar Stüdyosu" data (concepts, conceptDefinitions, activitySentences)
 * for a single topicId. Never reads presentation flows/steps or raw sourceTexts.
 */
async function readStudioItemsForTopic(
    topicIdToFetch: string,
    context?: { courseId?: string; unitId?: string }
): Promise<ActivityItem[]> {
    const activityPath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicIdToFetch}.json`);
    const activityItemsPath = path.join(process.cwd(), 'public', 'curriculum', 'activityItems', `${topicIdToFetch}.json`);
    const yazilacaklarPath = path.join(process.cwd(), 'public', 'curriculum', 'yazilacaklar', `${topicIdToFetch}.json`);

    const [actRaw, actItemsRaw, yazRaw, actMtime, yazMtime] = await Promise.all([
        readJsonFile(activityPath),
        readJsonFile(activityItemsPath),
        readJsonFile(yazilacaklarPath),
        getFileMtimeMs(activityPath),
        getFileMtimeMs(yazilacaklarPath),
    ]);

    const activityData: any[] = (Array.isArray(actRaw) && actRaw.length > 0)
        ? actRaw
        : (Array.isArray(actItemsRaw) ? actItemsRaw : []);

    const yazObj = (yazRaw && !Array.isArray(yazRaw)) ? (yazRaw as any) : null;
    const yazDefs: { concept: string; definition: string }[] = Array.isArray(yazObj?.conceptDefinitions)
        ? yazObj.conceptDefinitions
            .map((cd: any) => ({
                concept: String(cd?.concept || cd?.term || '').trim(),
                definition: String(cd?.definition || '').trim(),
            }))
            .filter((cd: { concept: string; definition: string }) => !!cd.concept)
        : [];

    const hasValidYazDefs = yazDefs.some(cd => cd.concept && cd.definition);
    const preferYazOverOlderActConcepts = Boolean(
        hasValidYazDefs &&
        yazMtime !== null &&
        actMtime !== null &&
        yazMtime > actMtime + 60_000
    );

    const conceptMap = new Map<string, string>();
    const defMap = new Map<string, { term: string; definition: string }>();
    const sentencesSet = new Set<string>();

    const registerConcept = (rawTerm: string) => {
        const clean = String(rawTerm || '').trim();
        if (!clean) return;
        const key = normalizeConcept(clean);
        if (!key) return;
        const existing = conceptMap.get(key);
        if (!existing || clean.length > existing.length || /[îâû'’]/i.test(clean)) {
            conceptMap.set(key, clean);
        }
    };

    const registerDefinition = (rawTerm: string, rawDef: string) => {
        const cleanTerm = String(rawTerm || '').trim();
        const cleanDef = String(rawDef || '').trim();
        if (!cleanTerm) return;
        const key = normalizeConcept(cleanTerm);
        if (!key) return;
        registerConcept(cleanTerm);
        const existing = defMap.get(key);
        if (!existing) {
            defMap.set(key, { term: cleanTerm, definition: cleanDef });
        } else {
            if (!existing.definition && cleanDef) {
                existing.definition = cleanDef;
            }
            if (cleanTerm.length > existing.term.length || /[îâû'’]/i.test(cleanTerm)) {
                existing.term = cleanTerm;
            }
        }
    };

    // 1. Öncelik: public/curriculum/yazilacaklar/${topicId}.json (Kavram & Notlar Stüdyosu tanım listesi)
    for (const cd of yazDefs) {
        registerDefinition(cd.concept, cd.definition);
    }

    // 2. public/curriculum/activities/${topicId}.json (Sadece concept, definition, sentence tipleri)
    for (const item of activityData) {
        if (!item || typeof item !== 'object') continue;
        if (item.type === 'sentence') {
            const txt = String(item.content?.text || '').trim();
            if (txt) sentencesSet.add(txt);
            continue;
        }
        if (preferYazOverOlderActConcepts) {
            continue;
        }
        if (item.type === 'concept') {
            const term = String(item.content?.text || item.content?.term || '').trim();
            if (term) registerConcept(term);
        } else if (item.type === 'definition') {
            const term = String(item.content?.term || item.content?.concept || '').trim();
            const def = String(item.content?.definition || item.content?.meaning || '').trim();
            if (term) registerDefinition(term, def);
        }
    }

    // 3. Yerel dosyalarda kayıtlı Stüdyo verisi yoksa Firestore'daki kayıtlı activityItems ve writingContent'ten çek
    if (conceptMap.size === 0 && defMap.size === 0 && sentencesSet.size === 0) {
        try {
            const qAct = query(collection(db, "activityItems"), where("topicId", "==", topicIdToFetch));
            const snapAct = await getDocs(qAct);
            snapAct.docs.forEach(d => {
                const item = d.data() as any;
                if (item.type === 'concept') {
                    const term = String(item.content?.text || item.content?.term || '').trim();
                    if (term) registerConcept(term);
                } else if (item.type === 'definition') {
                    const term = String(item.content?.term || item.content?.concept || '').trim();
                    const def = String(item.content?.definition || item.content?.meaning || '').trim();
                    if (term) registerDefinition(term, def);
                } else if (item.type === 'sentence') {
                    const txt = String(item.content?.text || '').trim();
                    if (txt) sentencesSet.add(txt);
                }
            });
        } catch (err) {
            console.warn(`Firestore activityItems fallback warning for ${topicIdToFetch}:`, err);
        }

        try {
            let topicSnap = null;
            if (context?.courseId && context?.unitId && context.unitId !== 'all' && context.courseId !== 'all') {
                topicSnap = await getDoc(doc(db, 'courses', context.courseId, 'units', context.unitId, 'topics', topicIdToFetch));
            }
            if (!topicSnap || !topicSnap.exists()) {
                topicSnap = await getDoc(doc(db, 'topics', topicIdToFetch));
            }
            if (topicSnap && topicSnap.exists()) {
                const tData = topicSnap.data() as any;
                if (Array.isArray(tData?.writingContent?.conceptDefinitions)) {
                    for (const cd of tData.writingContent.conceptDefinitions) {
                        const term = String(cd?.concept || cd?.term || '').trim();
                        const def = String(cd?.definition || '').trim();
                        if (term) registerDefinition(term, def);
                    }
                }
            }
        } catch (err) {
            console.warn(`Firestore writingContent fallback warning for ${topicIdToFetch}:`, err);
        }
    }

    const out: ActivityItem[] = [];
    let idx = 0;

    for (const [key, pair] of defMap.entries()) {
        if (pair.definition) {
            out.push({
                id: `studio-def-${topicIdToFetch}-${idx++}`,
                type: 'definition',
                content: { term: pair.term, definition: pair.definition },
                topicId: topicIdToFetch,
                courseId: context?.courseId || '',
                unitId: context?.unitId || '',
            } as any);
        }
        // Ayrıca kavram listesinde de bulunsun (kelime oyunları için)
        const displayConcept = conceptMap.get(key) || pair.term;
        out.push({
            id: `studio-con-${topicIdToFetch}-${idx++}`,
            type: 'concept',
            content: { text: displayConcept, term: displayConcept },
            topicId: topicIdToFetch,
            courseId: context?.courseId || '',
            unitId: context?.unitId || '',
        } as any);
        conceptMap.delete(key);
    }

    for (const term of conceptMap.values()) {
        out.push({
            id: `studio-con-${topicIdToFetch}-${idx++}`,
            type: 'concept',
            content: { text: term, term },
            topicId: topicIdToFetch,
            courseId: context?.courseId || '',
            unitId: context?.unitId || '',
        } as any);
    }

    for (const sentence of sentencesSet) {
        out.push({
            id: `studio-sent-${topicIdToFetch}-${idx++}`,
            type: 'sentence',
            content: { text: sentence },
            topicId: topicIdToFetch,
            courseId: context?.courseId || '',
            unitId: context?.unitId || '',
        } as any);
    }

    return out;
}

const readDataForTopic = async (
    topicIdToFetch: string,
    context?: { courseId?: string; unitId?: string }
): Promise<(ActivityItem | Question)[]> => {
    if (STATIC_TOPIC_CACHE.has(topicIdToFetch)) {
        return STATIC_TOPIC_CACHE.get(topicIdToFetch)!;
    }

    const questionPath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicIdToFetch}.json`);

    const [studioItems, questionRaw] = await Promise.all([
        readStudioItemsForTopic(topicIdToFetch, context),
        readJsonFile(questionPath),
    ]);

    const questionData: any[] = Array.isArray(questionRaw) ? questionRaw : [];
    let dbQuestions: Question[] = [];
    if (questionData.length === 0) {
        try {
            const q = query(collection(db, "questions"), where("topicId", "==", topicIdToFetch));
            const snap = await getDocs(q);
            dbQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        } catch (err) {
            console.warn(`Firestore questions fallback warning for ${topicIdToFetch}:`, err);
        }
    }

    const allCombined: (ActivityItem | Question)[] = [
        ...studioItems,
        ...questionData,
        ...dbQuestions,
    ];

    STATIC_TOPIC_CACHE.set(topicIdToFetch, allCombined);
    return allCombined;
};

async function getManifestCached(): Promise<any | null> {
    if (!CACHED_MANIFEST) {
        try {
            const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            CACHED_MANIFEST = JSON.parse(manifestContent);
        } catch {}
    }
    return CACHED_MANIFEST;
}

// Helper: Unit ID'nin ait olduğu dersi bulan yardımcı
async function resolveCourseIdForUnit(unitId: string): Promise<string | null> {
    if (!unitId || unitId === 'preview-unit' || unitId === 'all') return null;
    const manifest = await getManifestCached();
    if (manifest?.classGroups) {
        for (const g of manifest.classGroups) {
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
 * Fetches data ONLY from saved Kavram & Notlar Stüdyosu files/records and saved topic questions.
 * Never reads presentation `flows`, `steps`, or `sourceText`.
 * Strictly scopes by topicId, unitId, or courseId.
 */
export async function getStaticGameData(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
}): Promise<(ActivityItem | Question)[]> {
    const { unitId, topicId } = params;
    let courseId = params.courseId;

    const isEffectiveTopic = topicId && topicId !== 'all' && topicId !== 'unit-flow' && topicId !== 'preview-topic' && topicId !== unitId;

    if (isEffectiveTopic) {
        return readDataForTopic(topicId!, { courseId, unitId });
    }

    const isEffectiveUnit = unitId && unitId !== 'all' && unitId !== 'preview-unit';
    const isEffectiveCourse = courseId && courseId !== 'all' && courseId !== 'preview-course';

    if (isEffectiveUnit) {
        const unitCacheKey = `unit_${unitId}`;
        if (STATIC_TOPIC_CACHE.has(unitCacheKey)) {
            return STATIC_TOPIC_CACHE.get(unitCacheKey)!;
        }

        const topicIds = new Set<string>();
        const manifest = await getManifestCached();
        if (manifest?.classGroups) {
            for (const group of manifest.classGroups) {
                for (const course of group.courses || []) {
                    const foundUnit = course.units?.find((u: any) => u.id === unitId);
                    if (foundUnit) {
                        if (!courseId || courseId === 'preview-course' || courseId === 'all') courseId = course.id;
                        for (const t of foundUnit.topics || []) {
                            if (t?.id) topicIds.add(t.id);
                        }
                        break;
                    }
                }
            }
        }

        if (!courseId || courseId === 'preview-course' || courseId === 'all') {
            const resolved = await resolveCourseIdForUnit(unitId!);
            if (resolved) courseId = resolved;
        }

        // Manifest'te yoksa (öğretmenin Firestore'a eklediği ünite/konuysa) Firestore topics ID'lerini ekle
        if (topicIds.size === 0 && courseId && courseId !== 'all' && courseId !== 'preview-course') {
            try {
                const topicsSnap = await getDocs(collection(db, `courses/${courseId}/units/${unitId}/topics`));
                topicsSnap.docs.forEach(d => topicIds.add(d.id));
            } catch (tErr) {
                console.warn("Firestore unit topics subcollection fetch warning:", tErr);
            }
        }

        const allTopicArrays = await Promise.all(
            Array.from(topicIds).map(tId => readDataForTopic(tId, { courseId, unitId }))
        );
        const rawItems = allTopicArrays.flat();

        const seenKeys = new Set<string>();
        const deduplicatedUnitItems: (ActivityItem | Question)[] = [];
        for (const item of rawItems) {
            const itemType = (item as any).type;
            const term = (item as any).content?.term || (item as any).content?.text || (item as any).term || (item as any).text || (item as any).question;
            const norm = term ? normalizeConcept(String(term)) : '';
            const itemKey = norm ? `${itemType}_${norm}` : `${itemType}_${(item as any).id}`;
            if (!seenKeys.has(itemKey)) {
                seenKeys.add(itemKey);
                deduplicatedUnitItems.push(item);
            }
        }

        STATIC_TOPIC_CACHE.set(unitCacheKey, deduplicatedUnitItems);
        return deduplicatedUnitItems;
    }

    if (isEffectiveCourse) {
        const courseCacheKey = `course_${courseId}`;
        if (STATIC_TOPIC_CACHE.has(courseCacheKey)) {
            return STATIC_TOPIC_CACHE.get(courseCacheKey)!;
        }

        const topicRefs: { topicId: string; unitId: string }[] = [];
        const seenTopicIds = new Set<string>();
        const manifest = await getManifestCached();
        if (manifest?.classGroups) {
            for (const group of manifest.classGroups) {
                const foundCourse = (group.courses || []).find((c: any) => c.id === courseId);
                if (foundCourse) {
                    for (const u of foundCourse.units || []) {
                        for (const t of u.topics || []) {
                            if (t?.id && !seenTopicIds.has(t.id)) {
                                seenTopicIds.add(t.id);
                                topicRefs.push({ topicId: t.id, unitId: u.id });
                            }
                        }
                    }
                    break;
                }
            }
        }

        if (topicRefs.length === 0) {
            try {
                const unitsSnap = await getDocs(collection(db, `courses/${courseId}/units`));
                for (const uDoc of unitsSnap.docs) {
                    const topicsSnap = await getDocs(collection(db, `courses/${courseId}/units/${uDoc.id}/topics`));
                    for (const tDoc of topicsSnap.docs) {
                        if (!seenTopicIds.has(tDoc.id)) {
                            seenTopicIds.add(tDoc.id);
                            topicRefs.push({ topicId: tDoc.id, unitId: uDoc.id });
                        }
                    }
                }
            } catch (cErr) {
                console.warn("Firestore course topics fetch warning:", cErr);
            }
        }

        const allCourseArrays = await Promise.all(
            topicRefs.map(ref => readDataForTopic(ref.topicId, { courseId, unitId: ref.unitId }))
        );
        const rawItems = allCourseArrays.flat();

        const seenKeys = new Set<string>();
        const deduplicatedCourseItems: (ActivityItem | Question)[] = [];
        for (const item of rawItems) {
            const itemType = (item as any).type;
            const term = (item as any).content?.term || (item as any).content?.text || (item as any).term || (item as any).text || (item as any).question;
            const norm = term ? normalizeConcept(String(term)) : '';
            const itemKey = norm ? `${itemType}_${norm}` : `${itemType}_${(item as any).id}`;
            if (!seenKeys.has(itemKey)) {
                seenKeys.add(itemKey);
                deduplicatedCourseItems.push(item);
            }
        }

        STATIC_TOPIC_CACHE.set(courseCacheKey, deduplicatedCourseItems);
        return deduplicatedCourseItems;
    }

    return [];
}

/**
 * Canonical helper for ALL games: returns ONLY registered items from Kavram & Notlar Stüdyosu
 * (concepts, conceptDefinitions, sentences) for the specified topic/unit/course scope.
 */
export async function getRegisteredStudioItemsForGame(params: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
}): Promise<{
    concepts: string[];
    conceptDefinitions: { term: string; definition: string }[];
    sentences: string[];
}> {
    const allData = await getStaticGameData(params);

    const conceptMap = new Map<string, string>();
    const defMap = new Map<string, { term: string; definition: string }>();
    const sentencesSet = new Set<string>();

    for (const item of allData) {
        if (!item || typeof item !== 'object') continue;
        const itemType = (item as any).type;

        if (itemType === 'definition') {
            const term = String((item as any).content?.term || (item as any).content?.concept || '').trim();
            const def = String((item as any).content?.definition || '').trim();
            const key = normalizeConcept(term);
            if (term && key && isDefinitionValidAndClean(term, def)) {
                if (!conceptMap.has(key)) conceptMap.set(key, term);
                if (!defMap.has(key)) {
                    defMap.set(key, { term, definition: def });
                }
            }
        } else if (itemType === 'concept') {
            const term = String((item as any).content?.text || (item as any).content?.term || '').trim();
            const key = normalizeConcept(term);
            if (term && key && !conceptMap.has(key)) {
                conceptMap.set(key, term);
            }
        } else if (itemType === 'sentence') {
            const txt = String((item as any).content?.text || '').trim();
            if (txt) sentencesSet.add(txt);
        }
    }

    return {
        concepts: Array.from(conceptMap.values()),
        conceptDefinitions: Array.from(defMap.values()),
        sentences: Array.from(sentencesSet),
    };
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
    const ACTIVITY_TYPES = new Set(['concept', 'definition', 'sentence']);

    return allData.filter(item => {
        const itemType = (item as any).type;
        if (dataType === 'questions') return QUESTION_TYPES.has(itemType) || ('options' in item && !ACTIVITY_TYPES.has(itemType));
        if (dataType === 'activities') return ACTIVITY_TYPES.has(itemType);
        return true;
    });
}

/**
 * Server Action: MiniGamePlayer ve oyunlar için ünitenin veya konunun kayıtlı Stüdyo kavramlarını ve sorularını döner.
 * Kelime/kavram oyunları için YALNIZCA Kavram & Notlar Stüdyosu'ndaki kavram-tanım çiftlerini kullanır.
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
        const effectiveTopicId = (params.topicId && params.topicId !== params.unitId && params.topicId !== 'preview-topic' && params.topicId !== 'unit-flow' && params.topicId !== 'all')
            ? params.topicId
            : undefined;

        const [allItems, studioData] = await Promise.all([
            getStaticGameData({
                courseId: params.courseId,
                unitId: params.unitId,
                topicId: effectiveTopicId
            }),
            getRegisteredStudioItemsForGame({
                courseId: params.courseId,
                unitId: params.unitId,
                topicId: effectiveTopicId
            })
        ]);

        // 1. Çoktan seçmeli soruları topla (Sadece test/soru oyunları için)
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

        // 2. YALNIZCA Kavram & Notlar Stüdyosu'ndaki kayıtlı kavram-tanım çiftleri
        const conceptPairs = studioData.conceptDefinitions.filter(cp => cp.term.length >= 2 && cp.term.length <= 40);
        const allTerms = conceptPairs.map(cp => cp.term);

        // 3. Eğer çoktan seçmeli soru yetersizse kayıtlı Stüdyo kavramlarından dinamik çoktan seçmeli soru türet
        if (mcqQuestions.length < 5 && conceptPairs.length >= 2) {
            conceptPairs.forEach((cp, idx) => {
                const normTerm = normalizeConcept(cp.term);
                const distractors = allTerms
                    .filter(t => normalizeConcept(t) !== normTerm)
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


