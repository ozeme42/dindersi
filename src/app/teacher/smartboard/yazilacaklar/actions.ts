'use server';

import fs from 'fs/promises';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { clearStaticGameCache } from '@/lib/quiz-actions';
import { revalidatePath } from 'next/cache';
import { normalizeConcept } from '@/lib/concept-utils';

export { normalizeConcept };

export interface ConceptItem {
    id?: string;
    concept: string;
    definition: string;
}

export interface YazilacaklarTopicItem {
    id: string;
    topicId: string;
    unitId: string;
    courseId: string;
    grade: string;
    className: string;
    courseTitle: string;
    unitTitle: string;
    title: string;
    sourceText: string;
    // 1. Kavramlar (Tek kelimelik terimler - Anlat Bakalım, Anagram, Çarkıfelek için)
    concepts: string[];
    // 2. Kavram - Tanım Eşleşmeli (Kavram Düellosu, Hafıza Kartı, Eşleştirme, Kavram Panosu için)
    conceptDefinitions: ConceptItem[];
    // 3. Deftere Yazılacak Özet Notlar (Akıllı Tahta Yazılacaklar sunumu ve deftere yazma)
    notes: string[];
    // 4. Etkinlik / Oyun Cümleleri (Cümle Kurma, Doğru/Yanlış, Tornado vb. için kısa 4-8 kelimelik cümleler)
    activitySentences: string[];
    // İstatistikler
    conceptsCount: number;
    definitionsCount: number;
    notesCount: number;
    activitySentencesCount: number;
    hasContent: boolean;
    // Geriye dönük uyumluluk takma adı
    sentences?: string[];
}

const YAZILACAKLAR_DIR = path.join(process.cwd(), 'public', 'curriculum', 'yazilacaklar');
const ACTIVITIES_DIR = path.join(process.cwd(), 'public', 'curriculum', 'activities');
const ACTIVITY_ITEMS_DIR = path.join(process.cwd(), 'public', 'curriculum', 'activityItems');
const MANIFEST_PATH = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
const SOURCE_TEXTS_PATH = path.join(process.cwd(), 'public', 'curriculum', 'source-texts.json');

const formatCourseTitle = (title: string): string => {
    if (!title) return '';
    const lower = title.toLocaleLowerCase('tr').trim();
    if (lower === 'dkab' || lower.includes('dkab') || lower === 'din' || lower.includes('din kültürü')) {
        return 'Din Kültürü ve Ahlak Bilgisi';
    }
    if (lower === 'siyer' || lower.includes('siyer') || lower.includes('peygamber')) {
        return 'Peygamberimizin Hayatı';
    }
    if (lower.includes('kuran') || lower.includes('kur’an') || lower.includes('kur-an')) {
        return "Kur'an-ı Kerim";
    }
    if (lower.includes('temel dini')) {
        return 'Temel Dini Bilgiler';
    }
    return title;
};



/**
 * Loads all topics with their comprehensive activity bank data:
 * - concepts (kelimeler)
 * - conceptDefinitions (kavram-tanım çiftleri)
 * - notes (deftere yazılacak özet notlar)
 * - activitySentences (oyunlar için kısa etkinlik cümleleri)
 */
export async function loadAllYazilacaklarData(): Promise<{ success: boolean; items: YazilacaklarTopicItem[]; error?: string }> {
    try {
        await fs.mkdir(YAZILACAKLAR_DIR, { recursive: true });
        await fs.mkdir(ACTIVITIES_DIR, { recursive: true });
        await fs.mkdir(ACTIVITY_ITEMS_DIR, { recursive: true });

        // 1. Manifest
        let manifest: any = { classGroups: [] };
        try {
            const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
            manifest = JSON.parse(manifestRaw);
        } catch (e) {
            console.warn('Manifest read warning in loadAllYazilacaklarData:', e);
        }

        // 2. Source Texts
        let sourceTextsMap: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
        try {
            const sourceRaw = await fs.readFile(SOURCE_TEXTS_PATH, 'utf-8');
            sourceTextsMap = JSON.parse(sourceRaw);
        } catch (e) {
            console.warn('source-texts.json read warning in loadAllYazilacaklarData:', e);
        }

        // 3. Existing Yazilacaklar files
        let existingYazilacaklarFiles: Set<string> = new Set();
        try {
            const fileList = await fs.readdir(YAZILACAKLAR_DIR);
            existingYazilacaklarFiles = new Set(fileList.map(f => f.toLowerCase()));
        } catch (e) {}

        // 4. Existing Activities files
        let existingActivityFiles: Set<string> = new Set();
        try {
            const actList = await fs.readdir(ACTIVITIES_DIR);
            existingActivityFiles = new Set(actList.map(f => f.toLowerCase()));
        } catch (e) {}

        const items: YazilacaklarTopicItem[] = [];

        for (const cg of manifest.classGroups || []) {
            const grade = cg.name;
            const className = `${grade}. Sınıf`;

            for (const course of cg.courses || []) {
                const fullCourseTitle = formatCourseTitle(course.title);

                for (const unit of course.units || []) {
                    for (const topic of unit.topics || []) {
                        const topicId = topic.id;
                        const jsonFileName = `${topicId}.json`.toLowerCase();

                        // Store unique concepts and definitions by normalized key
                        const conceptsMap = new Map<string, string>(); // normKey -> bestDisplayName
                        const conceptDefinitionsMap = new Map<string, { concept: string; definition: string }>(); // normKey -> item
                        let notesList: string[] = [];
                        let activitySentencesList: string[] = [];

                        const registerConcept = (term: string) => {
                            const clean = (term || '').trim();
                            if (!clean) return;
                            const key = normalizeConcept(clean);
                            if (!key) return;
                            if (!conceptsMap.has(key)) {
                                conceptsMap.set(key, clean);
                            } else {
                                const existing = conceptsMap.get(key)!;
                                // Keep the richer/longer version (e.g. Semî' over Semi)
                                if (clean.length > existing.length || /[îâû'’]/i.test(clean)) {
                                    conceptsMap.set(key, clean);
                                }
                            }
                        };

                        const registerDefinition = (term: string, def: string) => {
                            const cleanTerm = (term || '').trim();
                            const cleanDef = (def || '').trim();
                            if (!cleanTerm) return;
                            const key = normalizeConcept(cleanTerm);
                            if (!key) return;
                            registerConcept(cleanTerm);
                            if (!conceptDefinitionsMap.has(key)) {
                                conceptDefinitionsMap.set(key, { concept: cleanTerm, definition: cleanDef });
                            } else {
                                const existing = conceptDefinitionsMap.get(key)!;
                                if (!existing.definition && cleanDef) {
                                    existing.definition = cleanDef;
                                }
                                if (cleanTerm.length > existing.concept.length || /[îâû'’]/i.test(cleanTerm)) {
                                    existing.concept = cleanTerm;
                                }
                            }
                        };

                        // ── A. Read from public/curriculum/yazilacaklar/${topicId}.json ──
                        if (existingYazilacaklarFiles.has(jsonFileName)) {
                            try {
                                const raw = await fs.readFile(path.join(YAZILACAKLAR_DIR, `${topicId}.json`), 'utf-8');
                                const parsed = JSON.parse(raw);
                                if (Array.isArray(parsed.notes)) {
                                    parsed.notes.forEach((n: any) => {
                                        if (typeof n === 'string' && n.trim()) notesList.push(n.trim());
                                    });
                                }
                                if (Array.isArray(parsed.conceptDefinitions)) {
                                    parsed.conceptDefinitions.forEach((c: any) => {
                                        if (c && c.concept && c.concept.trim()) {
                                            registerDefinition(c.concept, c.definition || '');
                                        }
                                    });
                                }
                            } catch (readErr) {
                                console.warn(`Error reading yazilacaklar for ${topicId}:`, readErr);
                            }
                        }

                        // ── B. Read from public/curriculum/activities/${topicId}.json ──
                        if (existingActivityFiles.has(jsonFileName)) {
                            try {
                                const rawAct = await fs.readFile(path.join(ACTIVITIES_DIR, `${topicId}.json`), 'utf-8');
                                const parsedAct = JSON.parse(rawAct);
                                if (Array.isArray(parsedAct)) {
                                    parsedAct.forEach((it: any) => {
                                        if (!it) return;
                                        if (it.type === 'concept' && it.content?.text) {
                                            registerConcept(it.content.text);
                                        } else if (it.type === 'definition' && it.content?.term) {
                                            registerDefinition(it.content.term, it.content.definition || '');
                                        } else if (it.type === 'sentence' && it.content?.text) {
                                            const sentence = it.content.text.trim();
                                            if (sentence && !activitySentencesList.includes(sentence)) {
                                                activitySentencesList.push(sentence);
                                            }
                                        }
                                    });
                                }
                            } catch (actErr) {
                                console.warn(`Error reading activities for ${topicId}:`, actErr);
                            }
                        }

                        // ── C. Fallback from manifest topic writingContent if still empty ──
                        if (notesList.length === 0 && Array.isArray(topic.writingContent?.notes)) {
                            topic.writingContent.notes.forEach((n: string) => {
                                if (typeof n === 'string' && n.trim()) notesList.push(n.trim());
                            });
                        }
                        if (conceptDefinitionsMap.size === 0 && Array.isArray(topic.writingContent?.conceptDefinitions)) {
                            topic.writingContent.conceptDefinitions.forEach((c: any) => {
                                if (c && c.concept) {
                                    registerDefinition(c.concept, c.definition || '');
                                }
                            });
                        }

                        // Convert maps to arrays
                        const concepts = Array.from(conceptsMap.values());
                        const conceptDefinitions: ConceptItem[] = Array.from(conceptDefinitionsMap.values());

                        const sourceText = (sourceTextsMap.topics[topicId] || topic.sourceText || '').trim();

                        // Count definitions that actually have a non-empty explanation
                        const validDefinitionsCount = conceptDefinitions.filter(d => d.definition && d.definition.trim()).length;

                        items.push({
                            id: topicId,
                            topicId: topicId,
                            unitId: unit.id,
                            courseId: course.id,
                            grade: String(grade),
                            className: className,
                            courseTitle: fullCourseTitle,
                            unitTitle: unit.title,
                            title: topic.title,
                            sourceText: sourceText,
                            concepts,
                            conceptDefinitions,
                            notes: notesList,
                            activitySentences: activitySentencesList,
                            sentences: activitySentencesList, // alias
                            conceptsCount: concepts.length,
                            definitionsCount: validDefinitionsCount,
                            notesCount: notesList.length,
                            activitySentencesCount: activitySentencesList.length,
                            hasContent: concepts.length > 0 || conceptDefinitions.length > 0 || notesList.length > 0 || activitySentencesList.length > 0,
                        });
                    }
                }
            }
        }

        return { success: true, items };
    } catch (error: any) {
        console.error('loadAllYazilacaklarData error:', error);
        return { success: false, items: [], error: error.message || 'Veriler yüklenirken hata oluştu.' };
    }
}

/**
 * Saves all 4 content types cleanly separated:
 * - concepts (kelime havuzu)
 * - conceptDefinitions (kavram-tanım eşleşmeleri)
 * - notes (deftere yazılacak özet notlar)
 * - activitySentences (oyunlar için kısa cümleler)
 *
 * Simultaneously writes to:
 * 1. public/curriculum/yazilacaklar/${topicId}.json (notes & conceptDefinitions)
 * 2. public/curriculum/activities/${topicId}.json & activityItems/${topicId}.json (concepts, definitions, sentences)
 * 3. Firestore topic.writingContent (notes & conceptDefinitions)
 * 4. Firestore activityItems collection (all active game items)
 * 5. Clears game cache so all games immediately update!
 */
export async function saveCentralActivityDataAction(params: {
    courseId: string;
    unitId: string;
    topicId: string;
    concepts: string[];
    conceptDefinitions: ConceptItem[];
    notes?: string[];
    activitySentences?: string[];
    sentences?: string[]; // fallback alias
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { courseId, unitId, topicId, concepts, conceptDefinitions } = params;
        if (!topicId) {
            return { success: false, error: 'Geçersiz konu kimliği.' };
        }

        // Clean arrays & deduplicate concepts using normalizeConcept
        const conceptMap = new Map<string, string>();
        (concepts || []).forEach(c => {
            const trimmed = c.trim();
            if (!trimmed) return;
            const key = normalizeConcept(trimmed);
            if (!key) return;
            if (!conceptMap.has(key)) {
                conceptMap.set(key, trimmed);
            } else {
                const existing = conceptMap.get(key)!;
                if (trimmed.length > existing.length || /[îâû'’]/i.test(trimmed)) {
                    conceptMap.set(key, trimmed);
                }
            }
        });

        // Clean definitions and deduplicate using normalizeConcept
        const defMap = new Map<string, ConceptItem>();
        (conceptDefinitions || []).forEach(cd => {
            const term = (cd.concept || '').trim();
            const def = (cd.definition || '').trim();
            if (!term && !def) return;
            const key = normalizeConcept(term);
            if (!key) return;

            // Also ensure concept is registered in conceptMap
            if (!conceptMap.has(key)) {
                conceptMap.set(key, term);
            } else {
                const existing = conceptMap.get(key)!;
                if (term.length > existing.length || /[îâû'’]/i.test(term)) {
                    conceptMap.set(key, term);
                }
            }

            if (!defMap.has(key)) {
                defMap.set(key, { concept: term, definition: def });
            } else {
                const existing = defMap.get(key)!;
                if (!existing.definition && def) {
                    existing.definition = def;
                }
                if (term.length > existing.concept.length || /[îâû'’]/i.test(term)) {
                    existing.concept = term;
                }
            }
        });

        const finalConcepts = Array.from(conceptMap.values());
        const cleanedDefinitions = Array.from(defMap.values());

        // Deftere yazılacak notlar (Özet)
        const cleanedNotes = (params.notes || []).map(n => n.trim()).filter(Boolean);

        // Oyunlar için kısa cümleler (Cümle Kurma, D/Y, Tornado)
        const cleanedActivitySentences = (params.activitySentences || params.sentences || []).map(s => s.trim()).filter(Boolean);

        // ── 1. Save to Yazılacaklar JSON (Defter Notları + Tanımlar) ──
        await fs.mkdir(YAZILACAKLAR_DIR, { recursive: true });
        const yazilacaklarData = {
            notes: cleanedNotes,
            conceptDefinitions: cleanedDefinitions,
            updatedAt: new Date().toISOString()
        };
        await fs.writeFile(
            path.join(YAZILACAKLAR_DIR, `${topicId}.json`),
            JSON.stringify(yazilacaklarData, null, 2),
            'utf-8'
        );

        // ── 2. Save to Firestore topic.writingContent ──
        try {
            const adminDb = getAdminDb();
            if (adminDb && courseId && unitId) {
                const topicRef = adminDb.collection('courses').doc(courseId).collection('units').doc(unitId).collection('topics').doc(topicId);
                await topicRef.set({
                    writingContent: {
                        notes: cleanedNotes,
                        conceptDefinitions: cleanedDefinitions
                    }
                }, { merge: true });
            }
        } catch (fsErr) {
            console.warn('Firestore writingContent sync warning:', fsErr);
        }

        // ── 3. Save to Etkinlik Veri Bankası (activities & activityItems) ──
        try {
            await fs.mkdir(ACTIVITIES_DIR, { recursive: true });
            await fs.mkdir(ACTIVITY_ITEMS_DIR, { recursive: true });

            const actFilePath = path.join(ACTIVITIES_DIR, `${topicId}.json`);
            let existingActivityItems: any[] = [];
            try {
                const raw = await fs.readFile(actFilePath, 'utf-8');
                existingActivityItems = JSON.parse(raw);
                if (!Array.isArray(existingActivityItems)) existingActivityItems = [];
            } catch (e) {
                existingActivityItems = [];
            }

            // Diğer etkinlik tiplerini koru (matching, flashcard, sorting vb.)
            const otherActivityItems = existingActivityItems.filter(
                item => item.type !== 'definition' && item.type !== 'concept' && item.type !== 'sentence'
            );

            // Yeni activityItems öğeleri oluştur
            const newConceptItems = finalConcepts.map((term, idx) => ({
                id: `concept_${topicId}_${idx}`,
                type: 'concept',
                topicId,
                unitId,
                courseId,
                content: { text: term },
                updatedAt: new Date().toISOString()
            }));

            const newDefinitionItems = cleanedDefinitions.map((cd, idx) => ({
                id: `def_${topicId}_${idx}`,
                type: 'definition',
                topicId,
                unitId,
                courseId,
                content: {
                    term: cd.concept,
                    definition: cd.definition
                },
                updatedAt: new Date().toISOString()
            }));

            const newSentenceItems = cleanedActivitySentences.map((sentence, idx) => ({
                id: `sentence_${topicId}_${idx}`,
                type: 'sentence',
                topicId,
                unitId,
                courseId,
                content: { text: sentence },
                updatedAt: new Date().toISOString()
            }));

            const allSyncedItems = [
                ...otherActivityItems,
                ...newConceptItems,
                ...newDefinitionItems,
                ...newSentenceItems
            ];

            // activities/${topicId}.json yaz
            await fs.writeFile(
                actFilePath,
                JSON.stringify(allSyncedItems, null, 2),
                'utf-8'
            );

            // activityItems/${topicId}.json yaz
            const actItemsFilePath = path.join(ACTIVITY_ITEMS_DIR, `${topicId}.json`);
            await fs.writeFile(
                actItemsFilePath,
                JSON.stringify(allSyncedItems, null, 2),
                'utf-8'
            );

            // Firestore activityItems koleksiyonu senkronizasyonu
            try {
                const adminDb = getAdminDb();
                if (adminDb) {
                    const batch = adminDb.batch();
                    const collRef = adminDb.collection('activityItems');

                    // Eski kayıtları sil
                    const existingSnap = await collRef
                        .where('topicId', '==', topicId)
                        .get();

                    existingSnap.docs.forEach(d => {
                        const data = d.data();
                        if (data.type === 'definition' || data.type === 'concept' || data.type === 'sentence') {
                            batch.delete(d.ref);
                        }
                    });

                    // Yenileri ekle
                    [...newConceptItems, ...newDefinitionItems, ...newSentenceItems].forEach(item => {
                        const newDoc = collRef.doc();
                        batch.set(newDoc, {
                            type: item.type,
                            content: item.content,
                            topicId,
                            unitId,
                            courseId,
                            createdAt: new Date()
                        });
                    });

                    await batch.commit();
                }
            } catch (actDbErr) {
                console.warn('Firestore activityItems batch sync warning:', actDbErr);
            }

            // Oyun önbelleğini temizle (Kavram Düellosu, Anlat Bakalım, Anagram, Çarkıfelek anında görsün)
            await clearStaticGameCache().catch(() => {});
        } catch (syncErr) {
            console.warn('Etkinlik Veri Bankası sync warning:', syncErr);
        }

        revalidatePath('/teacher/smartboard/yazilacaklar');
        revalidatePath('/teacher/smartboard/yazilacaklar/oyun');
        revalidatePath('/teacher/activity-data');

        return { success: true };
    } catch (error: any) {
        console.error('saveCentralActivityDataAction error:', error);
        return { success: false, error: error.message || 'Kaydedilirken hata oluştu.' };
    }
}

// Backward compatibility alias
export const saveTopicYazilacaklarAction = async (params: {
    courseId: string;
    unitId: string;
    topicId: string;
    notes: string[];
    conceptDefinitions: ConceptItem[];
}) => {
    return saveCentralActivityDataAction({
        courseId: params.courseId,
        unitId: params.unitId,
        topicId: params.topicId,
        concepts: params.conceptDefinitions.map(c => c.concept).filter(Boolean),
        conceptDefinitions: params.conceptDefinitions,
        notes: params.notes,
        activitySentences: []
    });
};

/**
 * Generates all or selective content from textbook text:
 * - concepts (kelime havuzu)
 * - conceptDefinitions (kavram-tanım çiftleri)
 * - notes (deftere yazılacak maddeli özet notlar)
 * - activitySentences (oyunlar için 4-8 kelimelik kısa cümleler)
 */
export interface GenerateCentralActivityAiParams {
    sourceText: string;
    topicTitle: string;
    grade?: string;
    courseTitle?: string;
    mode?: 'all' | 'concepts' | 'definitions' | 'notes' | 'activitySentences' | 'custom';
    targetConcepts?: string[];
    activeModules?: {
        concepts?: boolean;
        definitions?: boolean;
        notes?: boolean;
        activitySentences?: boolean;
    };
    customPrompt?: string;
    apiKey?: string;
    modelName?: string;
}

export async function generateCentralActivityAiAction(params: GenerateCentralActivityAiParams): Promise<{
    success: boolean;
    concepts?: string[];
    conceptDefinitions?: ConceptItem[];
    notes?: string[];
    activitySentences?: string[];
    sentences?: string[]; // alias
    error?: string;
}> {
    try {
        const {
            sourceText,
            topicTitle,
            grade = '5',
            courseTitle = 'Din Kültürü ve Ahlak Bilgisi',
            mode = 'all',
            targetConcepts,
            activeModules,
            customPrompt,
            apiKey: userApiKey,
            modelName: userModelName
        } = params;

        const textToAnalyze = sourceText.trim() || topicTitle.trim();

        if (textToAnalyze.length < 10) {
            return { success: false, error: 'Yapay zeka analizi için yeterli kaynak metin veya konu başlığı bulunamadı.' };
        }

        let apiKey = userApiKey?.trim();
        let modelName = userModelName?.trim();

        if (!apiKey) {
            const resolved = await resolveActiveGeminiConfig();
            apiKey = resolved.apiKey;
            if (!modelName) modelName = resolved.modelName;
        }

        if (!apiKey) {
            return { success: false, error: 'Gemini API anahtarı bulunamadı. Lütfen AI Ayarlarından API anahtarınızı girin.' };
        }

        const includeConcepts = activeModules ? !!activeModules.concepts : (mode === 'all' || mode === 'concepts');
        const includeDefinitions = activeModules ? !!activeModules.definitions : (mode === 'all' || mode === 'definitions');
        const includeNotes = activeModules ? !!activeModules.notes : (mode === 'all' || mode === 'notes');
        const includeSentences = activeModules ? !!activeModules.activitySentences : (mode === 'all' || mode === 'activitySentences');

        const prompt = `Sen MEB Din Kültürü ve Ahlak Bilgisi müfredatında uzman, pedagojik formasyona sahip kıdemli bir ders kitabı ve eğitim oyunu yazarısın.
Aşağıda verilen ${grade}. Sınıf "${courseTitle}" dersi ve "${topicTitle}" konusuna ait ders kitabı metnini analiz et.

DERS KİTABI METNİ:
"""
${textToAnalyze}
"""
${customPrompt?.trim() ? `
ÖĞRETMENİN ÖZEL TALİMATI:
"""
${customPrompt.trim()}
"""
Yukarıdaki özel talimata KESİNLİKLE öncelik ver ve içerikleri buna göre hazırla.
` : ''}

GÖREVLER:
${includeConcepts ? `
1. **KELİME / KAVRAM HAVUZU (concepts)**:
- Metindeki kilit dinî terimleri, ahlaki kavramları, isimleri ve anahtar kelimeleri belirle (en az 8, en fazla 20 kelime).
- Bunlar tek kelimelik veya kısa tamlamalar olmalıdır (Örn: "Tevhid", "İhlas", "Rahman", "Sadaka").
- Anlat Bakalım, Anagram Duvarı ve Çarkıfelek oyunlarında kelime olarak kullanılacaktır.
` : ''}

${includeDefinitions ? `
2. **KAVRAM - TANIM ÇİFTLERİ (conceptDefinitions)**:
${targetConcepts && targetConcepts.length > 0
    ? `- ÖZELLİKLE ŞU TANIMI EKSİK OLAN KAVRAMLAR İÇİN NET TANIMLAR YAZ: ${targetConcepts.join(', ')}
- 'concept' alanında bu kavramların adı tam olarak yer alsın.`
    : '- Metindeki önemli kavramların "Ben Kimim?" / "Bu Nedir?" tarzı ipucu tanımlarını çıkar (en az 6, en fazla 15 adet).'}
- 'concept' alanında kavramın adı, 'definition' alanında ise açık, net, anlaşılır tanımı yer almalıdır.
- Tanım metninde kavramın kendi adı KESİNLİKLE GEÇMEMELİDİR (Kavram Düellosu ve Eşleştirme oyunlarında soru olarak sorulacaktır).
` : ''}

${includeNotes ? `
3. **DEFTERE YAZILACAK ÖZET NOTLAR (notes)**:
- Öğrencilerin akıllı tahtadan doğrudan defterlerine yazacakları, konunun ana fikir ve kazanımlarını özetleyen 5 ila 8 adet maddeli ders notu yaz.
- Bu notlar pedagojik ve açıklayıcı olmalı, konunun can alıcı noktalarını öğretmelidir.
- Örnek: "1. İslam dininde bilgi kaynakları vahiy, akıl ve salim duyulardır."
` : ''}

${includeSentences ? `
4. **KISA ETKİNLİK VE OYUN CÜMLELERİ (activitySentences)**:
- Cümle Kurma (kelimeleri karıştırılıp doğru sıraya dizilen oyun), Doğru-Yanlış Zinciri ve Tornado oyunlarında kullanılmak üzere 6 ila 12 adet KISA, YALIN ve ANLAŞILIR cümle yaz.
- ÇOK ÖNEMLİ: Bu cümleler ÖZET DEĞİLDİR, oyun cümlesidir! Cümle Kurma oyununda kelimelere ayrılacağı için her cümle KESİNLİKLE 4 ila 8 kelime arasında olmalıdır. Asla uzun ve karmaşık cümle kurma.
- Örnek: "Allah evrendeki her şeyi bir ölçüye göre yaratmıştır."
- Örnek: "İhlas ibadetleri sadece Allah rızası için yapmaktır."
` : ''}

ÇIKTI FORMATI:
SADECE geçerli bir JSON döndür:
{
  "concepts": ["Kavram1", "Kavram2", "Kavram3"],
  "conceptDefinitions": [
    { "concept": "Kavram Adı", "definition": "Kavramın açıklaması ve tanımı" }
  ],
  "notes": [
    "1. Konu özeti maddesi...",
    "2. Konu özeti maddesi..."
  ],
  "activitySentences": [
    "Allah evrendeki her şeyi bir ölçüye göre yaratmıştır.",
    "İhlas ibadetleri sadece Allah rızası için yapmaktır."
  ]
}
`;

        const responseText = await runGeminiWithFallback({
            apiKey,
            primaryModel: modelName,
            prompt,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3
            }
        });

        const cleaned = responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(cleaned);

        const extractedNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
        const extractedActivitySentences = Array.isArray(parsed.activitySentences)
            ? parsed.activitySentences
            : (Array.isArray(parsed.sentences) ? parsed.sentences : []);

        return {
            success: true,
            concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
            conceptDefinitions: Array.isArray(parsed.conceptDefinitions) ? parsed.conceptDefinitions : [],
            notes: extractedNotes,
            activitySentences: extractedActivitySentences,
            sentences: extractedActivitySentences
        };
    } catch (error: any) {
        console.error('generateCentralActivityAiAction error:', error);
        return { success: false, error: error.message || 'Yapay zeka içeriği oluşturamadı.' };
    }
}

// Backward compatibility alias
export const generateYazilacaklarAiAction = async (params: any) => {
    const res = await generateCentralActivityAiAction(params);
    return {
        success: res.success,
        conceptDefinitions: res.conceptDefinitions,
        notes: res.notes,
        sentences: res.activitySentences,
        error: res.error
    };
};
